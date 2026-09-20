from pathlib import Path
import shutil,subprocess,tempfile,json,time,urllib.request,urllib.error,socket,os
root=Path(__file__).resolve().parents[2];tmp=Path(tempfile.mkdtemp(prefix='air3-release-smoke-'));stage=tmp/'air3-social-studio';report={'mode':'Clean extracted-layout smoke, real HTTP and persistent SQLite; no LLM/social calls'}
shutil.copytree(root,stage,ignore=shutil.ignore_patterns('node_modules','.git','.env','data','backups','REPOSITORY.bundle','__pycache__'))
setup=subprocess.run(['node','scripts/setup.mjs'],cwd=stage,capture_output=True,text=True,check=True)
envtext=(stage/'.env').read_text();env=dict(line.split('=',1) for line in envtext.splitlines() if line and not line.startswith('#') and '=' in line)
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
base=f'http://127.0.0.1:{port}'
envtext=envtext.replace('PORT=3100',f'PORT={port}').replace('BASE_URL=http://localhost:3100',f'BASE_URL={base}').replace('WORKER_ENABLED=true','WORKER_ENABLED=false');(stage/'.env').write_text(envtext)
log=open(tmp/'server.log','w');proc=subprocess.Popen(['npm','start'],cwd=stage,stdout=log,stderr=log,start_new_session=True)
def call(path,method='GET',body=None,headers=None):
 h=headers or {};d=None if body is None else json.dumps(body).encode();r=urllib.request.urlopen(urllib.request.Request(base+path,data=d,headers=h,method=method));return r, json.loads(r.read()) if r.headers.get('content-type','').startswith('application/json') else r.read()
try:
 for i in range(80):
  try:r,h=call('/healthz');break
  except (OSError,urllib.error.URLError):time.sleep(.1)
 else:raise RuntimeError('Startup failed')
 assert h['ok'];report['npm_start_without_node_modules']='PASS';report['healthz']='PASS'
 r,l=call('/api/login','POST',{'email':env['BOOTSTRAP_EMAIL'],'password':env['BOOTSTRAP_PASSWORD']},{'Content-Type':'application/json','Origin':base});cookie=r.headers['set-cookie'].split(';')[0];headers={'Cookie':cookie,'X-CSRF-Token':l['csrf'],'Origin':base,'Content-Type':'application/json'}
 r,b=call('/api/brands','POST',{'name':'Clean release smoke brand'},headers);assert b['kind']=='brand';report['login_and_persist_brand']='PASS'
 r,index=call('/');assert b'AIR3' in index;report['static_dashboard']='PASS'
 doctor=subprocess.run(['node','--env-file-if-exists=.env','dist/cli.js','doctor'],cwd=stage,capture_output=True,text=True,check=True);health=json.loads(doctor.stdout);assert health['renderer']['ffmpeg'];report['doctor_real_ffmpeg']='PASS'
 backup=tmp/'backup';subprocess.run(['node','--env-file-if-exists=.env','dist/cli.js','backup',str(backup)],cwd=stage,capture_output=True,text=True,check=True)
 assert (backup/'studio.sqlite').stat().st_size>0;assert (backup/'RESTORE.txt').is_file();assert not(backup/'.env').exists();report['sqlite_consistent_backup']='PASS'
 import sqlite3
 with sqlite3.connect(backup/'studio.sqlite') as c:
  assert c.execute('PRAGMA integrity_check').fetchone()[0]=='ok';assert c.execute("SELECT count(*) FROM entities WHERE kind='brand'").fetchone()[0]==1
 report['backup_integrity_and_brand']='PASS'
finally:
 import signal
 os.killpg(proc.pid,signal.SIGTERM)
 try:proc.wait(timeout=5)
 except subprocess.TimeoutExpired:os.killpg(proc.pid,signal.SIGKILL)
 log.close();shutil.rmtree(tmp)
(Path(tempfile.gettempdir())/'air3-clean-smoke.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
