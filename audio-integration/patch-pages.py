#!/usr/bin/env python3
"""Apply the approved additive AUDIO overlay to a local deployment checkout.

Aborts on unknown page changes. Does not contact or publish to any server.
"""
import argparse,hashlib,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('root',type=Path);p.add_argument('--check',action='store_true');args=p.parse_args()
baseline=json.loads((Path(__file__).parent/'pages-baseline.json').read_text())
tags=b'<link rel="stylesheet" href="/assets/account-integration.css">\n<script src="/assets/account-integration.js"></script>\n'
changes=[]
for relative,expected in baseline.items():
 file=args.root/relative;content=file.read_bytes()
 if tags in content:continue
 if hashlib.sha256(content).hexdigest()!=expected:raise SystemExit('Page changed since inspection; preserve current work and review: '+relative)
 marker=b'<script';index=content.find(marker)
 if index<0:raise SystemExit('Application script insertion point missing: '+relative)
 changes.append((file,content[:index]+tags+content[index:]))
if args.check:print('PASS: '+str(len(changes))+' pages match inspected baselines; no files changed')
else:
 for file,content in changes:file.write_bytes(content)
 print('Patched '+str(len(changes))+' local pages; no deployment performed')
