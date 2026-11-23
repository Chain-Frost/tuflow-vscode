from pathlib import Path
import subprocess,os,json,time,hashlib,sys,zipfile,uuid
r=Path('E:/Github/tuflow-issue9-20261124');c=json.loads((r/'config-private.json').read_text());code='C:/Program Files/Microsoft VS Code/Code.exe';cli='C:/Program Files/Microsoft VS Code/bin/code.cmd'
phase=sys.argv[1] if len(sys.argv)>1 else 'integrated';mode=sys.argv[2] if len(sys.argv)>2 else 'ntfs'
fixture=next(e['path'] for e in c['environments'] if e['label']==mode)
packages={'helper':r/'artifacts/helper/tuflow-helper.vsix' if phase=='integrated' else r/'artifacts/helper-baseline.vsix','validator':r/'artifacts/validator-final.vsix','opener':r/'artifacts/seito.vsix','lens':r/'artifacts/errorlens.vsix'}
profiles={'helper-only':['helper'],'validator-only':['validator'],'combined':['helper','validator'],'full':['helper','validator','opener','lens']}
for profile,roles in profiles.items():
 if len(sys.argv)>3 and profile!=sys.argv[3]:continue
 base=r/'trials'/os.environ.get('TUFLOW_LOCAL_TAG',phase)/mode/profile;base.mkdir(parents=True,exist_ok=True)
 user=base/'user';ext=base/'extensions';user.mkdir(exist_ok=True);ext.mkdir(exist_ok=True);(user/'User').mkdir(exist_ok=True)
 settings={'security.workspace.trust.enabled':False,'chat.disableAIFeatures':True,'workbench.startupEditor':'none','update.mode':'none','extensions.autoUpdate':False,'window.title':'ISSUE9 NOV24 '+profile+' - ${activeEditorShort}','tuflowValidator.diagnosticLevel':'hint','tuflowValidator.enableIfStatementChecks':True,'tuflowValidator.enableLatestVersionChecks':True,'tuflowValidator.enableIfStatementFormatting':False}
 (user/'User/settings.json').write_text(json.dumps(settings))
 receipts=[]
 for role in roles:
  vsix=packages[role];assert vsix.exists(),str(vsix)
  with zipfile.ZipFile(vsix) as z:pkg=json.loads(z.read('extension/package.json'))
  log=subprocess.run([cli,'--user-data-dir',str(user),'--extensions-dir',str(ext),'--install-extension',str(vsix),'--force'],capture_output=True,text=True,timeout=90)
  (base/('install-'+role+'.log')).write_text(log.stdout+log.stderr,encoding='utf-8');assert log.returncode==0,log.stdout+log.stderr
  receipts.append({'role':role,'sha256':hashlib.sha256(vsix.read_bytes()).hexdigest(),'version':pkg['version'],'id':pkg['publisher']+'.'+pkg['name']})
 (base/'installed.json').write_text(json.dumps(receipts,indent=2))
 report=base/'report.json';env=os.environ.copy();env.pop('ELECTRON_RUN_AS_NODE',None)
 env.update({'TUFLOW_ACCEPT_PROFILE':profile,'TUFLOW_ACCEPT_PHASE':phase,'TUFLOW_ACCEPT_REVISION':c['helperSha'] if phase=='integrated' else '4e2fffd9f924f45e510c784ce4a8b3c6d5335258','TUFLOW_ACCEPT_OUTPUT':str(report),'TUFLOW_ACCEPT_INVOCATION':str(uuid.uuid4()),'TUFLOW_ACCEPT_REPEATS':'30','TUFLOW_ACCEPT_LINES':'10000','TUFLOW_ACCEPT_SETTLE_MS':'1800','TUFLOW_ACCEPT_FIXTURES':fixture})
 args=[code,os.environ.get('TUFLOW_LOCAL_WORKSPACE',fixture),'--new-window','--user-data-dir',str(user),'--extensions-dir',str(ext),'--extensionDevelopmentPath='+str(r/'driver'),'--extensionTestsPath='+str(Path(os.environ.get('TUFLOW_LOCAL_RUNNER',str(Path(c['harness'])/'test/acceptance/vscode-runner.cjs')))),'--disable-extension','vscode.github-authentication','--disable-extension','TypeScriptTeam.jsts-chat-features','--disable-gpu','--skip-welcome','--skip-release-notes']
 with (base/'host.log').open('w',encoding='utf-8') as out:
  proc=subprocess.Popen(args,env=env,stdout=out,stderr=out)
  deadline=time.time()+150
  while time.time()<deadline:
   if report.exists():
    try:
     data=json.loads(report.read_text());
     if 'finishedAt' in data:break
    except (ValueError,OSError):pass
   time.sleep(.5)
  else:raise RuntimeError('No completed report: '+str(base))
  try:proc.wait(timeout=15)
  except subprocess.TimeoutExpired:pass
 print(phase,mode,profile,data['summary'],flush=True)
