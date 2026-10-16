#!/bin/bash
# Read-only host preflight. Does not start/stop, register, rename or modify a VM.
set -euo pipefail
if [ "$(uname -s)" != Darwin ]; then
  echo 'This host inspection requires macOS; no checks executed.' >&2
  exit 2
fi
zasu_original="$HOME/Parallels/Windows 11.pvm"
zasu_clone="$HOME/Parallels/ZASU-TRIAL-TEST.pvm"
for zasu_path in "$zasu_original" "$zasu_clone"; do
  if [ ! -d "$zasu_path" ] || [ -L "$zasu_path" ]; then
    echo 'Expected VM directory missing or symbolic link; stop without changing anything.' >&2
    exit 1
  fi
done
echo 'HOST_AVAILABLE_KIB (Avail column; no space is allocated):'
/bin/df -k "$zasu_clone"
echo 'VM_ALLOCATED_KIB (APFS shared blocks are not additional free-space requirements):'
/usr/bin/du -sk "$zasu_original" "$zasu_clone"
zasu_prlctl='/Applications/Parallels Desktop.app/Contents/MacOS/prlctl'
if [ ! -x "$zasu_prlctl" ]; then
  echo 'VM_RUNTIME_IDENTITY=UNCONFIRMED; CLI unavailable. Use Control Center Show in Finder and VM state.'
  exit 0
fi
echo 'REGISTERED_VM_NAME_STATE_HOME (only these fields are displayed):'
if ! "$zasu_prlctl" list -a -i | /usr/bin/awk '/^[[:space:]]*(Name|State|Home):/ {print}'; then
  echo 'VM_RUNTIME_IDENTITY=UNCONFIRMED; CLI unavailable or unsupported by this edition.'
  exit 0
fi
echo 'No automatic safety approval: match Home to the test copy and confirm original is stopped.'
echo 'Guest C: free space and shared-folder isolation remain separate checks.'
