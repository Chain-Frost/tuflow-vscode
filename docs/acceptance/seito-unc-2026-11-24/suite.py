import pathlib,subprocess,os,json
r=pathlib.Path('E:/Github/seito-unc-evidence-20261124');b=r/'full-suite';b.mkdir(exist_ok=True)
e=os.environ.copy();e.pop('ELECTRON_RUN_AS_NODE',None);e['WS_ROOT']='e:/Github/seito-openfile';e['MY_VAR']=r'l:\Datas';e['MY_VAR2']='Unicode';e['ENV']='prod';e['SEITO_REPORT']=str(b/'report.json');e['SEITO_TEST_UNC']=r'\\SMB-SERVER\TEST-SHARE\CodexValidation\disposable-fixture\seito-only';e['SEITO_TEST_MAPPED']=r'T:\CodexValidation\disposable-fixture\seito-only'
a=['C:/Program Files/Microsoft VS Code/Code.exe','E:/Github/seito-openfile/Unittests-tmp','--new-window','--user-data-dir='+str(r/'corrected/user'),'--extensions-dir='+str(b/'extensions'),'--extensionDevelopmentPath=E:/Github/seito-openfile','--extensionTestsPath='+str(r/'driver/suite.cjs'),'--disable-gpu']
with (b/'host.log').open('w') as out:p=subprocess.run(a,env=e,stdout=out,stderr=out,timeout=150)
print('exit',p.returncode);print((b/'host.log').read_text()[-6000:]);raise SystemExit(p.returncode)
