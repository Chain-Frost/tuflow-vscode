const v=require('vscode'),fs=require('fs'),path=require('path'),cp=require('child_process');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
exports.run=async()=>{
 const dir=process.env.TUFLOW_ACCEPT_FIXTURES, out={startedAt:new Date().toISOString(),workspace:v.workspace.workspaceFolders?.map(f=>f.uri.fsPath),checks:[]};
 const file=n=>path.join(dir,'watch',n), uri=n=>v.Uri.file(file(n));
 const ds=n=>v.languages.getDiagnostics(uri(n)).map(d=>({source:d.source,code:typeof d.code==='object'?d.code.value:d.code,message:d.message,line:d.range.start.line}));
 const missing=n=>ds(n).some(d=>d.code==='TPV001');
 const ext=(n,op,text='')=>cp.execFileSync('C:/Program Files/Python314/python.exe',['-c',"import sys;from pathlib import Path;p=Path(sys.argv[1]);op=sys.argv[2];p.write_text(sys.argv[3]) if op=='write' else p.unlink() if op=='delete' else p.rename(p.with_name(sys.argv[3]))",file(n),op,text],{windowsHide:true});
 const check=async(name,action,predicate)=>{await pause(800);const start=Date.now();await action();while(Date.now()-start<8000&&!predicate())await pause(50);out.checks.push({name,status:predicate()?'PASS':'FAIL',ms:Date.now()-start,diagnostics:Object.fromEntries(['root.tcf','second.tcf','child.trd'].map(n=>[n,ds(n)]))});};
 try{
 for(const n of ['external.trd','renamed.trd'])if(fs.existsSync(file(n)))fs.unlinkSync(file(n));
 fs.writeFileSync(file('child.trd'),'Read File == external.trd\n');
 await v.extensions.getExtension('Chain-Frost.tuflow-path-validator').activate();
 for(const n of ['root.tcf','second.tcf'])await v.window.showTextDocument(await v.workspace.openTextDocument(uri(n)));
 await check('nested-missing-and-shared-parents',()=>{},()=>missing('child.trd')&&ds('root.tcf').some(d=>d.code==='TPV002')&&ds('second.tcf').some(d=>d.code==='TPV002'));
 await check('external-create',()=>ext('external.trd','write','! present\n'),()=>!missing('child.trd')&&!ds('root.tcf').some(d=>d.code==='TPV002')&&!ds('second.tcf').some(d=>d.code==='TPV002'));
 await check('external-modify-child',()=>ext('child.trd','write','Read File == absent.trd\n'),()=>missing('child.trd')&&ds('root.tcf').some(d=>d.code==='TPV002')&&ds('second.tcf').some(d=>d.code==='TPV002'));
 await check('external-restore-child',()=>ext('child.trd','write','Read File == external.trd\n'),()=>!missing('child.trd'));
 await check('external-rename-away',()=>ext('external.trd','rename','renamed.trd'),()=>missing('child.trd'));
 await check('external-rename-back',()=>ext('renamed.trd','rename','external.trd'),()=>!missing('child.trd'));
 await check('external-delete',()=>ext('external.trd','delete'),()=>missing('child.trd'));
 await check('manual-refresh-missing',()=>v.commands.executeCommand('tuflowValidator.refreshDiagnostics'),()=>missing('child.trd'));
 ext('external.trd','write','! recovered\n');
 await check('manual-refresh-recovered',()=>v.commands.executeCommand('tuflowValidator.refreshDiagnostics'),()=>!missing('child.trd'));
 const g=await v.workspace.openTextDocument(path.join(dir,'selectors.tgc'));await v.window.showTextDocument(g);await pause(1800);
 out.selectors=v.languages.getDiagnostics(g.uri).map(d=>({code:d.code,source:d.source,message:d.message,line:d.range.start.line}));
 }catch(e){out.error=String(e.stack||e)}finally{out.finishedAt=new Date().toISOString();out.summary={checks:out.checks.length,failed:out.checks.filter(c=>c.status==='FAIL').length,error:out.error||null};fs.writeFileSync(process.env.TUFLOW_ACCEPT_OUTPUT,JSON.stringify(out,null,2));}
};
