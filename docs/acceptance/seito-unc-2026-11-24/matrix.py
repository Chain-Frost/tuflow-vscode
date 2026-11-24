import pathlib,subprocess,os,json,sys
r=pathlib.Path('E:/Github/seito-unc-evidence-20261124');tag=sys.argv[1];b=r/(tag+'-matrix');b.mkdir(exist_ok=True)
u=b/'user';(u/'User').mkdir(parents=True,exist_ok=True);(u/'User/settings.json').write_text(json.dumps({'security.workspace.trust.enabled':False,'chat.disableAIFeatures':True,'workbench.startupEditor':'none','update.mode':'none','extensions.autoUpdate':False}))
e=os.environ.copy();e.pop('ELECTRON_RUN_AS_NODE',None);e['SEITO_REPORT']=str(b/'report.json')
a=['C:/Program Files/Microsoft VS Code/Code.exe',r'\SMB-SERVER	uflow-agil-share\CodexValidation\disposable-fixture\seito-only','--new-window','--user-data-dir='+str(u),'--extensions-dir='+str(r/('fixed-extensions' if tag=='installed' else 'baseline-extensions') if tag in ('packaged','installed') else b/'extensions'),'--extensionDevelopmentPath='+str(r/'driver'),'--extensionTestsPath='+str(r/'driver/matrix.cjs'),'--skip-welcome','--disable-gpu']
if tag not in ('packaged','installed'):a+=['--extensionDevelopmentPath=E:/Github/seito-openfile']
with (b/'host.log').open('w') as out:
 p=subprocess.run(a,env=e,stdout=out,stderr=out,timeout=90)
print('exit',p.returncode);print((b/'report.json').read_text())
