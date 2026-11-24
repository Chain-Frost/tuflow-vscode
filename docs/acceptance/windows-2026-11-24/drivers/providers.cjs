const vscode=require('vscode'),fs=require('fs'),path=require('path');
const root='E:/Github/tuflow-issue9-20261124';const pause=ms=>new Promise(r=>setTimeout(r,ms));
const items=r=>Array.isArray(r)?r:r?.items||[],name=i=>typeof i.label==='string'?i.label:i.label.label;
const hoverText=r=>(r||[]).flatMap(h=>h.contents||[]).map(p=>typeof p==='string'?p:p.value||'').join('\n');
exports.run=async()=>{const out={contexts:[],snippets:[],checks:[]};try{
 const helper=vscode.extensions.getExtension('lmillard79.tuflow-helper');await helper.activate();
 const dir=path.join(root,'provider-probes');fs.mkdirSync(dir,{recursive:true});
 const probes=[['tcf','End Time','12'],['tgc','Read GIS Z Shape','present.gpkg >> layer'],['tbc','BC Database','boundary.csv'],['ecf','AD Approach','METHOD B'],['trfc','RF Interpolation Method','IDW'],['qcf','Base Cell Size','20'],['tef','End Time','12'],['trd','Timestep','1'],['tgc','Origin','500000, 6500000'],['tbc','BC Event Source','~A~ | event']];
 for(const [ext,command,value] of probes){
  const file=path.join(dir,'audited-'+command.replace(/[^a-z0-9]/gi,'_')+'.'+ext);fs.writeFileSync(file,command+' == '+value+' ! comment\n');
  const doc=await vscode.workspace.openTextDocument(file);await vscode.window.showTextDocument(doc);
  const completion=items(await vscode.commands.executeCommand('vscode.executeCompletionItemProvider',doc.uri,new vscode.Position(0,command.length-1)));
  const match=completion.find(i=>name(i)===command&&i.kind===vscode.CompletionItemKind.Keyword);
  const h=hoverText(await vscode.commands.executeCommand('vscode.executeHoverProvider',doc.uri,new vscode.Position(0,Math.min(3,command.length-1))));
  const signatureExpected=['Origin','BC Event Source'].includes(command);
  const completionExpected=!['tef','trd'].includes(ext);
  const sig=await vscode.commands.executeCommand('vscode.executeSignatureHelpProvider',doc.uri,new vscode.Position(0,command.length+4));
  const vals=items(await vscode.commands.executeCommand('vscode.executeCompletionItemProvider',doc.uri,new vscode.Position(0,command.length+4))).filter(i=>i.kind===vscode.CompletionItemKind.Value).map(name);
  let applied=null;if(match){const range=match.range?.replacing||match.range;const edit=new vscode.WorkspaceEdit();edit.replace(doc.uri,range,typeof match.insertText==='string'?match.insertText:match.insertText.value);await vscode.workspace.applyEdit(edit);applied=doc.lineAt(0).text;}
  out.contexts.push({ext,command,language:doc.languageId,completionExpected,signatureExpected,completion:!!match,inserted:applied,hover:h,signature:sig,contextualValues:vals,status:doc.languageId==='tuflow'&&!!match===completionExpected&&h.includes(command)&&h.includes('https://docs.tuflow.com/')&&!!sig?.signatures?.length===signatureExpected&&(!completionExpected||applied===command+' == '+value+' ! comment')?'PASS':'FAIL'});
 }
 const untitled=await vscode.workspace.openTextDocument({language:'tuflow',content:'End Time == 12'});await vscode.window.showTextDocument(untitled);out.untitledHover=hoverText(await vscode.commands.executeCommand('vscode.executeHoverProvider',untitled.uri,new vscode.Position(0,5)));
 const snippetFile=path.join(helper.extensionPath,'snippets/tuflow.json');const snippets=JSON.parse(fs.readFileSync(snippetFile,'utf8'));
 for(const [title,s] of Object.entries(snippets)){
  const ext=title.split(':')[0].toLowerCase();const file=path.join(dir,'snippet-'+title.replace(/[^a-z0-9]/gi,'_')+'.'+ext);fs.writeFileSync(file,'');const doc=await vscode.workspace.openTextDocument(file);const ed=await vscode.window.showTextDocument(doc);
  await vscode.commands.executeCommand('editor.action.insertSnippet',{langId:'tuflow',name:title});await pause(80);
  const inserted=doc.getText(),selection=doc.getText(ed.selection);await vscode.commands.executeCommand('type',{text:'ACCEPT'});const edited=doc.getText();await vscode.commands.executeCommand('jumpToNextSnippetPlaceholder');const nextSelection=doc.getText(ed.selection);await vscode.commands.executeCommand('leaveSnippet');
  out.snippets.push({title,description:s.description,inserted,firstSelection:selection,afterEdit:edited,nextSelection,status:inserted.length>0&&selection.length>0&&edited.includes('ACCEPT')?'PASS':'FAIL'});
 }
 const commands=await vscode.commands.getCommands(true);out.checks.push({id:'no-helper-opener',pass:!commands.includes('tuflow-helper.openFileUnderCursor')},{id:'documentation-command',pass:commands.includes('tuflow-helper.openDocumentation')});
}catch(e){out.error=String(e.stack||e);}finally{out.finishedAt=new Date().toISOString();out.summary={contexts:out.contexts.length,snippets:out.snippets.length,error:out.error||null};fs.writeFileSync(process.env.TUFLOW_ACCEPT_OUTPUT,JSON.stringify(out,null,2));}};
