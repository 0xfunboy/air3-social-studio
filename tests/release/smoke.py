"""Clean-install test: actual HTTP, persistent SQLite and optional offline compilation.
AIR3_RELEASE_ZIP=/path/to/release.zip tests the exact delivered archive.
AIR3_SMOKE_COMPILE=1 also runs npm ci --offline and the complete check suite.
No model, mail or social provider is contacted.
"""
from pathlib import Path
import shutil, subprocess, tempfile, json, time, urllib.request, urllib.error, socket, os, zipfile, sqlite3
root=Path(__file__).resolve().parents[2]
tmp=Path(tempfile.mkdtemp(prefix='air3-install-'))
stage=tmp/'air3-social-studio'
report={'mode':'Clean install, real HTTP and persistent SQLite. External provider calls: none.'}
proc=None;log=None

def run(args,**kw):
    r=subprocess.run(args,cwd=stage,capture_output=True,text=True,**kw)
    if r.returncode:raise RuntimeError('Command failed: '+str(args)+'\n'+r.stdout[-3000:]+'\n'+r.stderr[-3000:])
    return r

def stop():
    global proc,log
    if proc:
        proc.terminate()
        try:proc.wait(timeout=8)
        except subprocess.TimeoutExpired:proc.kill();proc.wait()
        proc=None
    if log:log.close();log=None

try:
    archive=os.environ.get('AIR3_RELEASE_ZIP')
    if archive:
        with zipfile.ZipFile(archive) as z:
            for info in z.infolist():
                target=(tmp/info.filename).resolve()
                if not target.is_relative_to(tmp.resolve()):raise RuntimeError('Unsafe archive path')
            z.extractall(tmp)
        assert(stage/'package.json').is_file()
        report['archive']=Path(archive).name
    else:
        shutil.copytree(root,stage,ignore=shutil.ignore_patterns('node_modules','.git','.env','data','backups','__pycache__','*.log'))
        report['archive']='directory-layout (use AIR3_RELEASE_ZIP for final archive)'
    assert not(stage/'node_modules').exists()
    if os.environ.get('AIR3_SMOKE_COMPILE')=='1':
        run(['npm','ci','--offline','--ignore-scripts','--cache',str(tmp/'empty-npm-cache')])
        checks=run(['npm','run','check'])
        report['offline_compile_and_test']='PASS'
        report['test_summary']=[l for l in checks.stdout.splitlines() if l.startswith(('# tests ','# pass ','# fail ','# skipped '))]
        shutil.rmtree(stage/'node_modules')
    with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
    base=f'http://127.0.0.1:{port}'
    run(['node','scripts/setup.mjs','--email','install-test@example.test','--url',base])
    envtext=(stage/'.env').read_text();env={k:json.loads(v) for k,v in (l.split('=',1) for l in envtext.splitlines() if l and not l.startswith('#') and '=' in l)}
    env['PORT']=str(port);env['WORKER_ENABLED']='false'
    (stage/'.env').write_text('\n'.join(k+'='+json.dumps(v) for k,v in env.items())+'\n')
    repeat=subprocess.run(['node','scripts/setup.mjs'],cwd=stage,capture_output=True,text=True)
    assert repeat.returncode!=0;assert env['MASTER_KEY'] in (stage/'.env').read_text()
    report['installer_keeps_existing_key']='PASS'
    def call(path,method='GET',body=None,headers=None):
        h=headers or {};data=None if body is None else json.dumps(body).encode()
        response=urllib.request.urlopen(urllib.request.Request(base+path,data=data,headers=h,method=method),timeout=10)
        raw=response.read();return response,json.loads(raw) if response.headers.get('content-type','').startswith('application/json') else raw
    def start():
        global proc,log
        log=open(tmp/'server.log','a')
        childenv=os.environ.copy()
        for k in env:childenv.pop(k,None)
        proc=subprocess.Popen(['node','--env-file=.env','dist/main.js'],cwd=stage,stdout=log,stderr=log,env=childenv)
        for _ in range(100):
            if proc.poll() is not None:raise RuntimeError('Server stopped: '+(tmp/'server.log').read_text())
            try:
                _,h=call('/healthz')
                if h.get('ok'):return
            except(OSError,urllib.error.URLError):pass
            time.sleep(.1)
        raise RuntimeError('Startup deadline')
    start();report['start_without_node_modules']='PASS'
    r,pub=call('/api/public');assert pub['version']=='0.2.0' and not pub['google'] and not pub['registration']
    for path in ['/','/app','/login','/forgot','/register']:
        r,page=call(path);assert b'AIR3' in page and b'/app.js' in page
        assert "script-src 'self'" in r.headers['Content-Security-Policy'];assert 'unsafe-inline' not in r.headers['Content-Security-Policy']
    report['public_routes_and_csp']='PASS'
    r,login=call('/api/login','POST',{'email':env['BOOTSTRAP_EMAIL'],'password':env['BOOTSTRAP_PASSWORD']},{'Content-Type':'application/json','Origin':base})
    headers={'Cookie':r.headers['set-cookie'].split(';')[0],'X-CSRF-Token':login['csrf'],'Origin':base,'Content-Type':'application/json'}
    _,brand=call('/api/brands','POST',{'name':'Installazione verificata'},headers);assert brand['kind']=='brand'
    _,state=call('/api/onboarding','PUT',{'step':3,'completed':False},headers);assert state['step']==3
    _,configuration=call('/api/admin/installation','PUT',{'SITE_NAME':'Installazione verificata'},headers)
    assert (stage/'data/runtime.generated.env').is_file()
    report['real_login_brand_wizard_env']='PASS'
    _,apps=call('/api/admin/oauth/apps/x','PUT',{'clientId':'installer-test-id','clientSecret':'installer-test-secret'},headers)
    assert 'installer-test-secret' not in json.dumps(apps)
    _,oauth=call('/api/brands/'+brand['id']+'/oauth/x/start','POST',{},headers)
    assert oauth['url'].startswith('https://x.com/i/oauth2/authorize?') and 'code_challenge=' in oauth['url']
    report['shared_oauth_authorize_url_no_external_calls']='PASS'
    doctor=json.loads(run(['node','--env-file=.env','dist/cli.js','doctor']).stdout)
    assert doctor['renderer']['ffmpeg'] and doctor['renderer']['font']
    assert doctor['externalProviderVerification']=='NOT_PERFORMED_BY_DOCTOR'
    report['local_doctor_ffmpeg']='PASS'
    failgate=subprocess.run(['node','--env-file=.env','dist/cli.js','doctor','--production'],cwd=stage,capture_output=True,text=True)
    assert failgate.returncode==2;report['production_gate_flags_missing_config']='PASS'
    backup=tmp/'backup';run(['node','--env-file=.env','dist/cli.js','backup',str(backup)])
    assert(backup/'RESTORE.txt').is_file() and not(backup/'.env').exists()
    with sqlite3.connect(backup/'studio.sqlite') as c:
        assert c.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
        assert c.execute("SELECT count(*) FROM entities WHERE kind='brand'").fetchone()[0]==1
    report['consistent_database_backup']='PASS'
    stop();start()
    _,brands=call('/api/brands',headers=headers);assert len(brands)==1 and brands[0]['id']==brand['id']
    _,state=call('/api/onboarding',headers=headers);assert state['step']==3
    _,public=call('/api/public');assert public['name']=='Installazione verificata'
    _,apps=call('/api/admin/oauth/apps',headers=headers);assert next(a for a in apps if a['provider']=='x')['configured']
    report['restart_persists_session_brand_wizard_env_oauth']='PASS'
finally:
    stop();shutil.rmtree(tmp)
out=Path(os.environ.get('AIR3_SMOKE_REPORT',str(Path(tempfile.gettempdir())/'air3-clean-smoke.json')))
out.write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
