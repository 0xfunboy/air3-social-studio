"""Build a distributable zip from this working tree, excluding secrets and runtime data.
Usage: python3 scripts/package-release.py ../AIR3-Social-Studio-v0.2.0.zip
The Git bundle, when present, must be refreshed separately after committing the sources.
"""
from pathlib import Path
import sys,zipfile,hashlib,json,stat
root=Path(__file__).resolve().parents[1]
out=Path(sys.argv[1] if len(sys.argv)>1 else root.parent/'AIR3-Social-Studio-v0.2.0.zip').resolve()
exclude={'.git','node_modules','data','backups','__pycache__','.venv','coverage'}
files=[]
for p in root.rglob('*'):
 if not p.is_file() or any(x in exclude for x in p.relative_to(root).parts):continue
 if p.name=='.env' or p.name.endswith(('.zip','.log','.sqlite','.sqlite-wal','.sqlite-shm','.pyc')):continue
 if p.is_symlink():raise RuntimeError('Do not distribute symlink: '+str(p))
 if p.suffix.lower() in {'.ttf','.ttc','.otf','.woff','.woff2'}:raise RuntimeError('Font distribution is not permitted: '+str(p))
 files.append(p)
manifest={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files) if p.name not in {'SHA256SUMS.json','REPOSITORY.bundle'}}
(root/'SHA256SUMS.json').write_text(json.dumps(manifest,indent=2)+'\n')
if root/'SHA256SUMS.json' not in files:files.append(root/'SHA256SUMS.json')
out.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(files):z.write(p,'air3-social-studio/'+str(p.relative_to(root)))
with zipfile.ZipFile(out) as z:assert z.testzip() is None
print(json.dumps({'archive':str(out),'files':len(files),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()},indent=2))
