from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
import os,subprocess
root=Path(__file__).resolve().parents[2];out=Path(os.environ.get('UI_TEST_OUT','/tmp/air3-browser'));out.mkdir(parents=True,exist_ok=True)
subprocess.run(['node',str(root/'tests/browser/fixture.mjs'),str(out/'fixture.json')],cwd=root,check=True)
fixture=json.loads((out/'fixture.json').read_text())
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
 page.set_default_timeout(5000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 html=re.sub(r'<script.*?</script>','',root.joinpath('web/index.html').read_text());html=re.sub(r'<link[^>]*>','',html)
 page.set_content(html)
 page.add_style_tag(content=root.joinpath('web/style.css').read_text())
 page.evaluate('f=>window.UI_FIXTURE=f',fixture)
 # Pure in-memory component test. No URL navigation and NO forwarded browser network requests.
 page.add_script_tag(content='''window.fetch=async(path,init={})=>{let value=[];if(path==='/api/me')value=UI_FIXTURE.me;else if(path==='/api/status')value=UI_FIXTURE.status;else if(path==='/api/brands')value=UI_FIXTURE.brands;else if(path.endsWith('/tokens')&&init.method==='POST')value={id:'test-token-id',token:'TEST_ONLY_ONE_TIME_TOKEN_NOT_A_CREDENTIAL'};else if(path.endsWith('/audit'))value=[];return new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});};''')
 page.add_script_tag(content=root.joinpath('web/app.js').read_text(),type='module')
 page.locator('.page h1').wait_for();page.screenshot(path=str(out/'overview-desktop.png'),full_page=True)
 checked=[]
 for view in ['contents','calendar','knowledge','accounts','assets','campaigns','inbox','analytics','jobs','settings']:
  page.evaluate('(v)=>location.hash=v',view);page.wait_for_timeout(150)
  assert page.locator('.page h1').count()==1,view
  assert not page.locator('#toast.error').count(),page.locator('#toast').inner_text()
  checked.append(view)
  if view=='accounts':page.screenshot(path=str(out/'channels-desktop.png'),full_page=True)
 page.evaluate("location.hash='accounts'");page.wait_for_timeout(150);page.locator('[data-action="new-account"]').first.click();page.locator('#edit-form').wait_for();page.screenshot(path=str(out/'account-form.png'),full_page=True);page.get_by_label('Chiudi',exact=True).click()
 page.evaluate("location.hash='settings'");page.wait_for_timeout(150);page.locator('[data-action="tokens"]').click();page.locator('[data-action="new-token"]').click();page.locator('#f-name').fill('Token di collaudo UI');page.locator('#edit-form button[type=submit]').click();page.wait_for_timeout(200);assert 'TEST_ONLY_ONE_TIME_TOKEN' in page.locator('#f-token').input_value();page.screenshot(path=str(out/'token-dialog.png'),full_page=True);page.get_by_label('Chiudi',exact=True).click()
 page.set_viewport_size({'width':390,'height':844});page.evaluate("location.hash='overview'");page.wait_for_timeout(150);page.screenshot(path=str(out/'overview-mobile.png'),full_page=True)
 overflow=page.evaluate('document.documentElement.scrollWidth > innerWidth')
 report={'mode':'Browser component/visual tests with in-memory API fixtures; NO live HTTP browser navigation','pages':checked,'token_dialog':'PASS','errors':errors,'mobile_horizontal_overflow':overflow}
 out.joinpath('report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));assert not errors;assert not overflow
 browser.close()
