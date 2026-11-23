const v=require('vscode'),fs=require('fs'),path=require('path'),cp=require('child_process');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
exports.run=async()=>{
 const dir=path.join(process.env.TUFLOW_ACCEPT_FIXTURES,'watch'),file=n=>path.join(dir,n),uri=n=>v.Uri.file(file(n));
 const diagnostics=n=>v.languages.getDiagnostics(uri(n)).map(d=>({source:d.source,code:typeof d.code==='object'?d.code.value:d.code,message:d.message}));
 const missing=()=>diagnostics('child.trd').some(d=>d.code==='TPV001');
 const snapshot=()=>Object.fromEntries(['root.tcf','child.trd'].map(n=>[n,diagnostics(n)]));
 const external=op=>cp.execFileSync('C:/Program Files/Python314/python.exe',['-c',"import sys;from pathlib import Path;p=Path(sys.argv[1]);p.write_text('! recovered\\n') if sys.argv[2]=='create' else p.unlink()",file('external.trd'),op],{windowsHide:true});
 const wait=async pred=>{const t=Date.now();while(Date.now()-t<6000&&!pred())await pause(25);return pred()};
 const out={startedAt:new Date().toISOString(),workspace:v.workspace.workspaceFolders?.map(f=>f.uri.fsPath),target:dir,trials:[]};
 try{
 if(fs.existsSync(file('external.trd')))fs.unlinkSync(file('external.trd'));
 fs.writeFileSync(file('child.trd'),'Read File == external.trd\n');
 await v.extensions.getExtension('Chain-Frost.tuflow-path-validator').activate();
 const doc=await v.workspace.openTextDocument(uri('root.tcf'));await v.window.showTextDocument(doc);
 out.targetOutsideWorkspace=v.workspace.getWorkspaceFolder(doc.uri)===undefined;
 out.initialMissing=await wait(missing);await pause(1500);
 for(const operation of ['create','delete']){
  external(operation);await pause(1000);
  const before=snapshot(),stale=operation==='create'?missing():!missing();
  const t=Date.now();await v.commands.executeCommand('tuflowValidator.refreshDiagnostics');
  const refreshed=await wait(()=>operation==='create'?!missing():missing());
  out.trials.push({operation,automaticObservationMs:1000,staleBeforeCommand:stale,before,after:snapshot(),refreshMs:Date.now()-t,status:stale&&refreshed?'PASS':refreshed?'UNVERIFIED':'FAIL'});
 }
 }catch(e){out.error=String(e.stack||e)}finally{out.finishedAt=new Date().toISOString();out.summary={trials:out.trials.length,pass:out.trials.filter(t=>t.status==='PASS').length,error:out.error||null};fs.writeFileSync(process.env.TUFLOW_ACCEPT_OUTPUT,JSON.stringify(out,null,2));}
};
