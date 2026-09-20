"""Offline component checks. Browser navigation is restricted in the build sandbox.
Use real HTTP integration tests separately; these checks never contact social providers.
Optional dependencies: pip install playwright; CHROMIUM_PATH=/path/to/chromium.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re,os,subprocess
root=Path(__file__).resolve().parents[2]
out=Path(os.environ.get('UI_TEST_OUT','/tmp/air3-ui'));out.mkdir(parents=True,exist_ok=True)
subprocess.run(['node',str(root/'tests/browser/fixture.mjs'),str(out/'fixture.json')],cwd=root,check=True)
fixture=json.loads((out/'fixture.json').read_text())
script=root.joinpath('web/app.js').read_text();script=re.sub(r'^import .*?;\n','',script,count=1)
script=re.sub(r'const path\s*=\s*location\.pathname;', 'const path=window.TEST_PATH;', script)
brand=root.joinpath('web/brand.js').read_text().replace('export function','function')
script=brand+'\n'+script
html=re.sub(r'<script.*?</script>','',root.joinpath('web/index.html').read_text());html=re.sub(r'<link[^>]*>','',html)
fetch='''window.UI_CALLS=[];window.fetch=async(path,init={})=>{
 let v=[];const f=window.UI_FIXTURE,b=init.body?JSON.parse(init.body):{},method=init.method||'GET';window.UI_CALLS.push({path,method,body:b});
 if(path==='/api/public')v=f.public;
 else if(path==='/api/me')v=f.me;
 else if(path==='/api/status')v=f.status;
 else if(path==='/api/brands')v=f.brands;
 else if(path==='/api/onboarding'){if(method==='PUT')window.WIZARD_STEP=b.step;v={step:window.WIZARD_STEP||0,completed:true};}
 else if(path==='/api/admin/workspace'){f.me.workspaces[0].name=b.name;v={ok:true};}
 else if(path==='/api/admin/installation'){if(method==='PUT'){for(const [k,val]of Object.entries(b.values||{})){const field=f.installation.fields.find(x=>x.key===k);if(field){field.value=field.secret?'':val;field.configured=!!val;}}}v=f.installation;}
 else if(path==='/api/oauth/apps'||path==='/api/admin/oauth/apps')v=f.oauth;
 else if(path.startsWith('/api/admin/oauth/apps/')||path.startsWith('/api/oauth/apps/')){const app=f.oauth.find(a=>a.provider===path.split('/').at(-1));if(app){app.clientId=b.clientId;app.hasSecret=!!b.clientSecret;app.configured=!!(b.clientId&&b.clientSecret);}v=f.oauth;}
 else if(path==='/api/admin/users')v=f.members;
 else if(path==='/api/admin/site')v=f.site;
 return new Response(JSON.stringify(v),{headers:{'Content-Type':'application/json'}});
};'''
errors=[];checked=[];overflows=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 def mount(path,theme='light',width=1440):
  page=browser.new_page(viewport={'width':width,'height':1000 if width>800 else 844},device_scale_factor=1)
  page.set_default_timeout(5000);page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html);page.add_style_tag(content=root.joinpath('web/style.css').read_text())
  page.evaluate('(f)=>{window.UI_FIXTURE=f;}',fixture);page.evaluate('(p)=>window.TEST_PATH=p',path)
  page.add_script_tag(content=fetch);page.add_script_tag(content=script,type='module');page.wait_for_timeout(250)
  page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
  return page
 for path,n in [('/','landing'),('/login','login')]:
  for th in ['light','dark']:
   page=mount(path,th);page.screenshot(path=str(out/f'{n}-{th}.png'),full_page=True);checked.append(n+' '+th);page.close()
 page=mount('/app')
 for view in ['overview','contents','calendar','knowledge','accounts','assets','campaigns','inbox','analytics','jobs','settings','setup','admin','team']:
  page.evaluate('(v)=>location.hash=v',view);page.wait_for_timeout(250)
  assert page.locator('.page h1').count()==1,view
  assert not page.locator('#toast.error').count(),page.locator('#toast').inner_text()
  checked.append(view)
  if view in ['overview','accounts','admin','setup','team']:
   page.screenshot(path=str(out/(view+'-light.png')),full_page=True)
   page.evaluate("document.documentElement.dataset.theme='dark'");page.screenshot(path=str(out/(view+'-dark.png')),full_page=True);page.evaluate("document.documentElement.dataset.theme='light'")
 page.evaluate("location.hash='accounts'");page.wait_for_timeout(200)
 page.locator('[data-action=configure-oauth]').first.click();page.locator('#f-clientId').wait_for()
 assert '/oauth/meta/callback' in page.locator('#dialog').inner_text()
 page.screenshot(path=str(out/'oauth-app-dialog.png'),full_page=True);page.locator('[data-action=close-modal]').first.click()
 page.evaluate("location.hash='setup';window.WIZARD_STEP=3");page.wait_for_timeout(200);page.evaluate("location.hash='overview'");page.wait_for_timeout(100);page.evaluate("location.hash='setup'");page.wait_for_timeout(250)
 page.screenshot(path=str(out/'wizard-social-light.png'),full_page=True);page.evaluate("document.documentElement.dataset.theme='dark'");page.screenshot(path=str(out/'wizard-social-dark.png'),full_page=True)
 page.evaluate("location.hash='admin'");page.wait_for_timeout(250)
 page.locator('[data-action=env-group][data-id=login]').click();page.wait_for_timeout(200)
 assert page.locator('#f-GOOGLE_CLIENT_ID').count()==1
 page.screenshot(path=str(out/'google-configuration-dark.png'),full_page=True)
 # Exercise real form handlers against explicit in-memory fixtures; no live credentials.
 page.locator('#f-GOOGLE_CLIENT_ID').fill('ui-test-client-id')
 page.locator('#f-GOOGLE_CLIENT_SECRET').fill('ui-test-secret')
 page.locator('#environment-form [type=submit]').click();page.wait_for_timeout(250)
 assert page.evaluate("UI_CALLS.some(c=>c.path==='/api/admin/installation'&&c.method==='PUT'&&c.body.values.GOOGLE_CLIENT_ID==='ui-test-client-id')")
 assert page.locator('#f-GOOGLE_CLIENT_SECRET').input_value()==''
 page.locator('[data-action=env-group][data-id=oauth]').click();page.wait_for_timeout(200)
 assert page.locator('[data-action=configure-shared-oauth]').count()==12
 page.screenshot(path=str(out/'admin-shared-oauth-dark.png'),full_page=True)
 page.locator('[data-action=configure-shared-oauth][data-id=x]').click()
 page.locator('#f-clientId').fill('ui-social-app');page.locator('#f-clientSecret').fill('ui-social-secret')
 page.locator('#dialog form [type=submit]').click();page.wait_for_timeout(250)
 assert page.evaluate("UI_CALLS.some(c=>c.path==='/api/admin/oauth/apps/x'&&c.method==='PUT'&&c.body.clientId==='ui-social-app')")
 page.evaluate("location.hash='setup';window.WIZARD_STEP=0");page.wait_for_timeout(250)
 page.locator('#workspace-form input[name=name]').fill('Workspace verificato')
 page.locator('#workspace-form [type=submit]').click();page.wait_for_timeout(250)
 assert page.evaluate("UI_CALLS.some(c=>c.path==='/api/admin/workspace'&&c.body.name==='Workspace verificato')")
 page.locator('[data-action=wizard-next]').click();page.wait_for_timeout(250)
 assert page.evaluate("UI_CALLS.some(c=>c.path==='/api/onboarding'&&c.method==='PUT'&&c.body.step===1)")
 # Inspect control colors in dark mode, and preserve actual computed values in the report.
 button_styles=page.locator('[data-action=wizard-back]').evaluate("e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color,opacity:getComputedStyle(e).opacity})")
 page.locator('[data-action=command]').click();page.locator('#command-search').fill('Calendario');assert page.locator('.command-results a').count()==1;page.locator('[data-action=close-modal]').first.click()
 for width in [390,320,768]:
  page.set_viewport_size({'width':width,'height':844})
  for view in ['overview','accounts','setup','admin','team','calendar']:
   page.evaluate('(v)=>location.hash=v',view);page.wait_for_timeout(200)
   overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
   if overflow:overflows.append({'page':view,'width':width,'actual':page.evaluate('document.documentElement.scrollWidth')})
   if width==390 and view in ['overview','setup']:page.screenshot(path=str(out/(view+'-mobile.png')),full_page=True)
 page.close()
 for path,n in [('/','landing'),('/login','login')]:
  page=mount(path,'light',390);page.screenshot(path=str(out/(n+'-mobile.png')),full_page=True)
  if page.evaluate('document.documentElement.scrollWidth>innerWidth+1'):overflows.append({'page':n,'width':390})
  page.close()
 report={'mode':'Offline browser component tests with explicit test API fixtures; not live OAuth or browser end-to-end','screens':checked,'oauth_dialog':'PASS','google_config':'PASS','command_palette':'PASS','form_handlers':['workspace save','wizard next step','Google app config secret cleared','shared OAuth app config'],'dark_control_colors':button_styles,'errors':errors,'horizontal_overflow':overflows}
 out.joinpath('report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
 browser.close();assert not errors;assert not overflows
