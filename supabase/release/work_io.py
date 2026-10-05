#!/usr/bin/env python3
"""Work-side release I/O. Run with authenticated MCP orchestration, not on the user's Mac.

No repository/server credential is read by this program. A short-lived,
exact-path transfer capability is written only to a 0600 local job file.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import plistlib
import secrets
import shutil
import struct
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from native_receipt import validate, sha

ROOT = Path(__file__).resolve().parents[2]
PLAN = json.loads((ROOT / 'supabase/release/release-plan.json').read_text())
BASE = 'https://' + PLAN['project'] + '.supabase.co'


def write(path, obj, private=False):
    path = Path(path)
    with path.open('w', encoding='utf-8') as f:
        if private: os.chmod(path, 0o600)
        json.dump(obj, f, ensure_ascii=False, indent=2)


def unpack(archive, destination):
    with zipfile.ZipFile(archive) as z:
        names = z.namelist()
        if len(names) != len(set(names)) or len(names) > 5000 or sum(i.file_size for i in z.infolist()) > 500_000_000:
            raise ValueError('Unsafe/oversized handoff archive')
        for i in z.infolist():
            p = (destination / i.filename).resolve()
            if not p.is_relative_to(destination.resolve()) or '\\' in i.filename or (i.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError('Unsafe archive path/link')
        if z.testzip(): raise ValueError('Corrupt handoff ZIP')
        z.extractall(destination)


def inspect_dmg(root, filename):
    seven = os.environ.get('ZASU_7ZIP') or shutil.which('7zz') or shutil.which('7z')
    if not seven: raise ValueError('Work requires current 7-Zip for DMG/APFS validation')
    dmg = root / filename
    extracted = root / '_dmg_inspection'
    log = subprocess.run([seven, 't', str(dmg)], capture_output=True)
    (root / 'work-dmg-test.log').write_bytes(log.stdout + log.stderr)
    if log.returncode: raise ValueError('DMG container integrity check failed')
    result = subprocess.run([seven, 'x', '-y', '-o' + str(extracted), str(dmg)], capture_output=True)
    if result.returncode: raise ValueError('DMG extraction failed')
    matches = list(extracted.rglob('ZASU DAW.app/Contents/Info.plist'))
    if not matches:
        # Some DMGs expose a filesystem image as an extra container level.
        volumes = [p for p in extracted.rglob('*') if p.suffix.lower() in ('.apfs','.hfs','.hfsx') and p.is_file()]
        if len(volumes) == 1:
            test = subprocess.run([seven,'t',str(volumes[0])],capture_output=True)
            expand = subprocess.run([seven,'x','-y','-o'+str(root/'_filesystem_inspection'),str(volumes[0])],capture_output=True) if not test.returncode else test
            if expand.returncode: raise ValueError('DMG filesystem integrity/extraction failed')
            matches = list((root/'_filesystem_inspection').rglob('ZASU DAW.app/Contents/Info.plist'))
    if len(matches) != 1: raise ValueError('Exactly one ZASU DAW.app is required')
    info = plistlib.loads(matches[0].read_bytes())
    if (info.get('CFBundleIdentifier'), info.get('CFBundleShortVersionString'), info.get('CFBundleVersion')) != ('jp.zasu.audio.daw', PLAN['version'], PLAN['build']):
        raise ValueError('DMG application identity/version/build mismatch')
    executable = info.get('CFBundleExecutable', '')
    if Path(executable).name != executable or not executable: raise ValueError('Unsafe executable name')
    with (matches[0].parent / 'MacOS' / executable).open('rb') as f:
        magic, count = struct.unpack('>II', f.read(8))
        if magic not in (0xcafebabe, 0xcafebabf) or not 2 <= count <= 8: raise ValueError('Not a Universal Mach-O')
        stride = 20 if magic == 0xcafebabe else 32
        cpus = {struct.unpack('>I', f.read(stride)[:4])[0] for _ in range(count)}
        if not {0x1000007, 0x100000c}.issubset(cpus): raise ValueError('Universal Intel/Apple Silicon missing')
    return {'container': 'PASS (7-Zip)', 'identity': 'PASS', 'architectures': ['arm64', 'x86_64'],
            'native_signature': 'Native receipt; Apple tools not rerun on Linux'}


def prepare(args):
    # Real files and native PASS reports are required before any network mutation.
    if not args.mac or not args.windows: raise ValueError('Both native Handoff ZIPs are required for this combined formal release')
    if not args.mac.is_file() or not args.windows.is_file(): raise ValueError('Native Handoff ZIP is missing')
    args.job.mkdir(mode=0o700, parents=True, exist_ok=False)
    files, manifests, inspection = [], [], {}
    for os_name, archive in [('mac', args.mac), ('windows', args.windows)]:
        folder = args.job / os_name
        unpack(archive, folder)
        m, _ = validate(folder, os_name)
        if (m['version'], m['build']) != (PLAN['version'], PLAN['build']): raise ValueError('Wrong Version/Build')
        if m['size'] > 52428800: raise ValueError('Artifact exceeds current private bucket limit')
        manifests.append(m)
        files.append(dict(m, path=m['version'] + '/' + m['filename'], upload=True, local=str(folder / m['filename'])))
        if os_name == 'mac': inspection['mac'] = inspect_dmg(folder, m['filename'])
        else: inspection['windows'] = {'architecture': 'x64 PE checked; installer execution is in native receipt'}
    files += PLAN['old']
    token = secrets.token_hex(32)
    expires = int(time.time() * 1000) + 90 * 60 * 1000
    manifest = [{k:v for k,v in f.items() if k != 'local'} for f in files]
    entry = ("import {createClient} from 'npm:@supabase/supabase-js@2.95.0';\n"
             "import {transferHandler} from './transfer-handler.mjs';\n"
             "const storage = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), {auth:{persistSession:false,autoRefreshToken:false}}).storage.from('zasu-daw-releases');\n"
             "const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');\n"
             'Deno.serve(transferHandler(' + json.dumps({'tokenHash': hashlib.sha256(token.encode()).hexdigest(), 'expiresAt': expires, 'files': manifest})[:-1] + ',storage,digest}));\n')
    write(args.job / 'private.json', {'token': token, 'expires': expires, 'files': files}, private=True)
    frontend = [{'path':p, 'mode':'100644', 'type':'blob', 'content':(ROOT / p).read_text()} for p in PLAN['frontend_files']]
    for entry in frontend:
        if entry['path'] == 'zasu-daw/download/index.html':
            # Publish only cache refresh before API cutover; retain current product copy.
            original = subprocess.check_output(['git','show',PLAN['base_commit'] + ':' + entry['path']],cwd=ROOT,text=True)
            entry['content'] = original.replace('download.js?v=20261004-win0011','download.js?v=release0014')
    marketing = []
    for p in PLAN['marketing_files']:
        content = (ROOT / p).read_text()
        if p == 'zasu-daw/download/index.html':
            for m in manifests:
                content = content.replace('{{' + m['os'].upper() + '_SIZE}}', f"{m['size'] / 1_000_000:.1f} MB")
            signing = json.loads((args.job / 'windows/release.json').read_text(encoding='utf-8-sig'))['Signing']
            content = content.replace('{{WINDOWS_SIGNING}}', '署名済み' if signing == 'Signed' else '未署名')
        if '{{' in content: raise ValueError('Unresolved marketing placeholder: ' + p)
        marketing.append({'path':p, 'mode':'100644', 'type':'blob', 'content':content})
    function_files = [{'name':p, 'content':(ROOT / 'supabase/functions/zasu-daw-download' / p).read_text()} for p in PLAN['function_files']]
    request = {'plan':PLAN,'manifests':manifests,'inspection':inspection,'frontend':frontend,'marketing':marketing,
               'functionFiles':function_files,'helperFiles':[{'name':'index.ts','content':entry},
               {'name':'transfer-handler.mjs','content':(ROOT/'supabase/release/transfer-handler.mjs').read_text()}]}
    write(args.job / 'request.json', request)
    return {'prepared':True,'manifests':manifests,'inspection':inspection}


def helper_request(state, method, path, data=None):
    url = BASE + '/functions/v1/' + PLAN['helper'] + '?path=' + urllib.parse.quote(path, safe='')
    req = urllib.request.Request(url, data=data, method=method,
          headers={'Authorization':'Bearer ' + state['token'], 'Content-Type':'application/octet-stream'})
    with urllib.request.urlopen(req, timeout=180) as r: return json.load(r)


def retrieve(state, f):
    result = helper_request(state, 'GET', f['path'])
    url = urllib.parse.urlparse(result['url'])
    if url.scheme != 'https' or url.netloc != urllib.parse.urlparse(BASE).netloc or url.path != '/storage/v1/object/sign/zasu-daw-releases/' + f['path']:
        raise ValueError('Unexpected signed download URL')
    with urllib.request.urlopen(result['url'], timeout=180) as r:
        h, length = hashlib.sha256(), 0
        while chunk := r.read(1024 * 1024):
            h.update(chunk); length += len(chunk)
    if length != f['size'] or h.hexdigest() != f['sha256']: raise ValueError('Remote byte mismatch: ' + f['path'])
    # Direct public URLs must remain inaccessible.
    public = BASE + '/storage/v1/object/public/zasu-daw-releases/' + f['path']
    try:
        with urllib.request.urlopen(public, timeout=30): raise ValueError('Release bucket is public')
    except urllib.error.HTTPError as e:
        if e.code not in (400, 403, 404): raise
    return {'path':f['path'],'sha256':h.hexdigest(),'size':length,'private':True}


def transfer(args, upload=False):
    state = json.loads((args.job / 'private.json').read_text())
    if time.time() * 1000 >= state['expires']: raise ValueError('Transfer capability expired; prepare a new job')
    results = []
    for f in state['files']:
        if upload and f.get('upload'):
            path = Path(f['local'])
            if sha(path) != f['sha256'] or path.stat().st_size != f['size']: raise ValueError('Local file changed')
            try: helper_request(state, 'PUT', f['path'], path.read_bytes())
            except urllib.error.HTTPError as e:
                if e.code != 409: raise  # Existing immutable key is accepted ONLY after byte equality below.
        results.append(retrieve(state, f))
    write(args.job / ('upload-verification.json' if upload else 'post-publication-download.json'), results)
    return {'verified':results,'route':'Authenticated admin-issued URL from the same private delivery storage; not a paid-customer E2E test'}


def public_check():
    endpoint = BASE + '/functions/v1/zasu-daw-download'
    checks = [('OPTIONS','https://zasuworks.jp',None,204),('POST','https://zasuworks.jp',b'{}',400),
              ('POST','https://invalid.example',b'{}',403)]
    results = []
    for method, origin, data, expected in checks:
        req = urllib.request.Request(endpoint, data=data, method=method,headers={'Origin':origin,'Content-Type':'application/json'})
        try:
            with urllib.request.urlopen(req,timeout=30) as r: status,body=r.status,r.read()
        except urllib.error.HTTPError as e: status,body=e.code,e.read()
        if status != expected or b'signedUrl' in body or b'"downloads"' in body: raise ValueError('Public authorization check failed')
        results.append({'method':method,'origin':origin,'status':status})
    return {'checks':results,'paid_customer_e2e':'NOT RUN: no owner-specified test purchase reference'}


def site_check(args):
    request = json.loads((args.job / 'request.json').read_text())
    paths = request[args.phase]
    for entry in paths:
        url = 'https://zasuworks.jp/' + ('' if entry['path'] == 'index.html' else entry['path'])
        with urllib.request.urlopen(url,timeout=30) as r: content = r.read().decode()
        # Root HTML has social tags injected by the existing Pages workflow.
        if entry['path'] == 'index.html':
            for marker in ('FOUNDING USER', 'v1.4', '先着10名', '今後のアップデート追加料金なし'):
                if marker not in content: return {'ready':False}
        elif content != entry['content']: return {'ready':False}
    return {'ready':True,'phase':args.phase}


def main():
    p=argparse.ArgumentParser()
    p.add_argument('action',choices=['prepare','upload','retrieve','public-check','site-check','read-request'])
    p.add_argument('--job',type=Path,required=True)
    p.add_argument('--mac',type=Path); p.add_argument('--windows',type=Path)
    p.add_argument('--phase',choices=['frontend','marketing'])
    a=p.parse_args(); a.job=a.job.resolve()
    try:
        if a.action == 'prepare': result=prepare(a)
        elif a.action == 'upload': result=transfer(a,True)
        elif a.action == 'retrieve': result=transfer(a)
        elif a.action == 'public-check': result=public_check()
        elif a.action == 'site-check': result=site_check(a)
        else: result=json.loads((a.job/'request.json').read_text())
        print(json.dumps(result,ensure_ascii=False))
    except Exception as e:
        # Never echo HTTP responses, signed URLs or capability tokens.
        print(json.dumps({'error':type(e).__name__,'message':str(e) if isinstance(e,ValueError) else 'Release operation failed; inspect local stage.'}))
        sys.exit(1)


if __name__ == '__main__': main()
