#!/usr/bin/env python3
"""Create/validate native release evidence without altering signed payload bytes.

Reports are operator/tool evidence, not a replacement for Apple/Windows tools.
The Work publisher also extracts and checks the real containers independently.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import zipfile

MAC_CHECKS = ('first_launch normal_launch device_selection recording monitoring countdown '
              'pitch_presets pitch_editor track_transfer export save_reload upgrade').split()
WIN_CHECKS = ('build ctest pe_x64 dependencies signatures zip_roundtrip startup install installed_payload '
              'new_project audio_device recording monitoring countdown playback stop audio_processing '
              'auto_mix auto_mastering pitch_editor pitch_presets track_transfer export_modes save '
              'restart reload export upgrade uninstall reinstall').split()


def sha(path):
    with Path(path).open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest() if hasattr(hashlib, 'file_digest') else _hash(f)


def _hash(f):
    h = hashlib.sha256()
    for chunk in iter(lambda: f.read(1024 * 1024), b''):
        h.update(chunk)
    return h.hexdigest()


def checked_file(root, name, digest, size=None):
    raw = root / name
    p = raw.resolve()
    if not p.is_relative_to(root.resolve()) or not p.is_file() or raw.is_symlink():
        raise ValueError('Missing or unsafe payload file: ' + name)
    if sha(p) != digest.lower() or (size is not None and p.stat().st_size != size):
        raise ValueError('Payload hash/size mismatch: ' + name)
    return p


def validate(root, os_name):
    root = Path(root).resolve()
    s = json.loads((root / 'release.json').read_text(encoding='utf-8-sig'))
    if os_name == 'mac':
        version, build = s['version'], s['build']
        if s.get('bundle_id') != 'jp.zasu.audio.daw' or s.get('team') != '4VM477VJQ4':
            raise ValueError('Mac identity changed')
        if (s.get('app_status'), s.get('dmg_status')) != ('Accepted', 'Accepted'):
            raise ValueError('Notarization is not Accepted')
        if s.get('automated_status') != 'PASS (Apple tools on this Mac)' or not s.get('manual_status', '').startswith('PASS '):
            raise ValueError('Mac native verification incomplete')
        if any(s.get('manual_checks', {}).get(k) != 'PASS (operator observed)' for k in MAC_CHECKS):
            raise ValueError('Mac manual gate missing')
        if not s.get('test_environment') or not s.get('manual_at'):
            raise ValueError('Mac test environment missing')
        filename = f'ZASUDAW-{version}-macOS-Universal.dmg'
        if s['filename'] != filename:
            raise ValueError('Wrong DMG name')
        artifact = checked_file(root, filename, s['sha256'])
        with artifact.open('rb') as f:
            if artifact.stat().st_size < 512:
                raise ValueError('Truncated DMG')
            f.seek(-512, 2)
            if f.read(4) != b'koly':
                raise ValueError('Not an Apple UDIF DMG')
        evidence = [root / 'release.json', root / 'RELEASE.md', root / 'SHA256SUMS']
        evidence += sorted((root / 'logs').glob('*'))
    elif os_name == 'windows':
        version, build = s['Version'], s['BuildNumber']
        if s.get('Product') != 'ZASU DAW' or s.get('Architecture') != 'x64' or s.get('Configuration') != 'Release':
            raise ValueError('Wrong Windows product/architecture/configuration')
        if s.get('Status') not in ('VERIFIED', 'RELEASED') or any(s.get('Checks', {}).get(k) != 'PASS' for k in WIN_CHECKS):
            raise ValueError('Windows native verification incomplete')
        if s.get('Signing') not in ('Signed', 'Unsigned') or not s.get('VerificationHost') or not s.get('VerificationUTC'):
            raise ValueError('Windows verification/signing evidence missing')
        inventory = s['Inventory']
        if not inventory or len({i['Path'] for i in inventory}) != len(inventory):
            raise ValueError('Missing/duplicate Windows inventory')
        for i in inventory:
            checked_file(root, i['Path'], i['SHA256'], i['Size'])
        filename = f'ZASU-DAW-v{version}-Windows-Setup.exe'
        if filename not in {i['Path'] for i in inventory} or 'app/ZASU DAW.exe' not in {i['Path'] for i in inventory}:
            raise ValueError('Installer/application absent from inventory')
        artifact = root / filename
        # Installer bootstrap may be x86; the actual DAW must be AMD64.
        with (root / 'app/ZASU DAW.exe').open('rb') as f:
            header = f.read(64)
            if len(header) < 64 or header[:2] != b'MZ':
                raise ValueError('Invalid app PE')
            f.seek(struct.unpack_from('<I', header, 60)[0])
            if f.read(6) != b'PE\0\0\x64\x86':
                raise ValueError('App is not x64')
        with artifact.open('rb') as f:
            if f.read(2) != b'MZ':
                raise ValueError('Invalid Setup EXE')
        evidence = [root / 'release.json', root / 'RELEASE-WINDOWS.md', root / 'SHA256SUMS.txt']
        evidence += [root / i['Path'] for i in inventory if i['Path'] != filename]
    else:
        raise ValueError('Unknown OS')
    for path in evidence:
        if not path.is_file() or path.is_symlink():
            raise ValueError('Evidence missing: ' + str(path))
    return {'os': os_name, 'version': version, 'build': build, 'filename': filename,
            'sha256': sha(artifact), 'size': artifact.stat().st_size}, [artifact] + evidence


def create_handoff(root, os_name, output):
    root, output = Path(root).resolve(), Path(output).resolve()
    manifest, files = validate(root, os_name)
    output.mkdir(parents=True, exist_ok=True)
    destination = output / f'ZASUDAW-{manifest["version"]}-build-{manifest["build"]}-{os_name}-Handoff.zip'
    temp = destination.with_suffix('.zip.pending')
    if destination.exists():
        raise ValueError('Handoff already exists; retained unchanged: ' + str(destination))
    with zipfile.ZipFile(temp, 'x', compression=zipfile.ZIP_DEFLATED) as z:
        for path in files:
            z.write(path, path.relative_to(root).as_posix())
        z.writestr('handoff.json', json.dumps(manifest, indent=2) + '\n')
    with zipfile.ZipFile(temp) as z:
        if z.testzip() or hashlib.sha256(z.read(manifest['filename'])).hexdigest() != manifest['sha256']:
            raise ValueError('Handoff roundtrip failed')
    temp.rename(destination)
    destination.with_suffix('.zip.sha256').write_text(sha(destination) + '  ' + destination.name + '\n')
    return destination


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--os', choices=['mac', 'windows'], required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    print(create_handoff(args.root, args.os, args.output))
