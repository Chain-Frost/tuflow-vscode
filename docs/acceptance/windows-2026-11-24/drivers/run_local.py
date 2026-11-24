from pathlib import Path
import subprocess,os,json,time,hashlib,sys,zipfile,uuid,shutil

def acceptance_failures(data, invocation):
 errors=[]
 if not isinstance(data,dict) or not data.get('finishedAt') or not isinstance(data.get('summary'),dict):
  return ['missing or invalid completed acceptance summary']
 summary=data['summary']
 environment=data.get('environment')
 if isinstance(environment,dict) and 'invocationId' in environment and environment['invocationId']!=invocation:
  errors.append('report belongs to another invocation')
 for key,value in [('report.error',data.get('error')),('summary.error',summary.get('error'))]:
  if value:errors.append(key+': '+str(value))
 for key in ('fail','failed','failures','unexpectedFailures'):
  value=summary.get(key)
  if value is True or (isinstance(value,(int,float)) and value>0) or (isinstance(value,list) and value):
   errors.append('summary.'+key+' indicates failure: '+str(value))
 for key in ('pass','commandCompleted','nativeBrowserHandoff'):
  if key in summary and summary[key] is False:errors.append('summary.'+key+' is false')
 if data.get('pass') is False:errors.append('report.pass is false')
 for collection in ('checks','trials','contexts','snippets','models'):
  records=data.get(collection)
  if not isinstance(records,list):continue
  if isinstance(summary.get(collection),int) and summary[collection]!=len(records):
   errors.append('summary.'+collection+' count mismatch')
  for index,item in enumerate(records):
   if not isinstance(item,dict):errors.append(collection+' contains invalid record');continue
   status=item.get('status')
   if isinstance(status,str) and status.lower() in ('fail','failed','error'):
    errors.append(collection+'['+str(index)+'] failed')
   if item.get('pass') is False:errors.append(collection+'['+str(index)+'] pass=false')
   if collection=='models' and item.get('unchanged') is False:
    errors.append(collection+'['+str(index)+'] changed source')
 if not any(k in summary for k in ('pass','fail','failed','checks','trials','models','contexts','snippets','commandCompleted','nativeBrowserHandoff')):
  errors.append('summary has no recognized acceptance outcome')
 return errors


def verify_outcome(data, invocation, exit_code, report_path):
 errors=acceptance_failures(data,invocation)
 if exit_code!=0:errors.append('VS Code host exit code: '+str(exit_code))
 if errors:raise RuntimeError('Acceptance failed: '+'; '.join(errors)+' (report: '+str(report_path)+')')
 return data['summary']


def main():
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
     canonical=base/'report.json';canonical.unlink(missing_ok=True)
     invocation=str(uuid.uuid4());report=base/('report-'+invocation+'.json');report.unlink(missing_ok=True)
     env=os.environ.copy();env.pop('ELECTRON_RUN_AS_NODE',None)
     env.update({'TUFLOW_ACCEPT_PROFILE':profile,'TUFLOW_ACCEPT_PHASE':phase,'TUFLOW_ACCEPT_REVISION':c['helperSha'] if phase=='integrated' else '4e2fffd9f924f45e510c784ce4a8b3c6d5335258','TUFLOW_ACCEPT_OUTPUT':str(report),'TUFLOW_ACCEPT_INVOCATION':invocation,'TUFLOW_ACCEPT_REPEATS':'30','TUFLOW_ACCEPT_LINES':'10000','TUFLOW_ACCEPT_SETTLE_MS':'1800','TUFLOW_ACCEPT_FIXTURES':fixture})
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
      # Keep even failed current-run evidence, without presenting it as a PASS.
      shutil.copyfile(report,canonical)
      try:exit_code=proc.wait(timeout=15)
      except subprocess.TimeoutExpired as exc:
       raise RuntimeError('VS Code host did not exit after its report; result unverified') from exc
      verify_outcome(data,invocation,exit_code,canonical)
     print(phase,mode,profile,data['summary'],flush=True)


if __name__ == '__main__':
    main()
