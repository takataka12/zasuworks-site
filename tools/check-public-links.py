from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
class P(HTMLParser):
 def __init__(self):super().__init__();self.ids=set();self.links=[]
 def handle_starttag(self,t,a):
  a=dict(a)
  if a.get('id'):self.ids.add(a['id'])
  if t=='a' and a.get('href'):self.links.append(a['href'])
root=Path.cwd();parsed={}
for f in root.rglob('*.html'):
 if any(x in f.relative_to(root).parts for x in ['.git','tests','tools','docs','admin','audio-integration','release']):continue
 p=P();p.feed(f.read_text());parsed[f]=p
errors=[]
for f,p in parsed.items():
 for href in p.links:
  u=urlsplit(href)
  if u.scheme and not (u.scheme=='https' and u.netloc=='zasuworks.jp'):continue
  if u.netloc and u.netloc!='zasuworks.jp':continue
  target=(root/u.path.lstrip('/') if u.path.startswith('/') else f.parent/u.path).resolve() if u.path else f
  if target.is_dir():target=target/'index.html'
  if not target.exists():errors.append((str(f.relative_to(root)),href,'file'))
  elif u.fragment and target in parsed and unquote(u.fragment) not in parsed[target].ids:errors.append((str(f.relative_to(root)),href,'anchor'))
for e in sorted(set(errors)):print(*e)
print('errors',len(set(errors)))
raise SystemExit(1 if errors else 0)
