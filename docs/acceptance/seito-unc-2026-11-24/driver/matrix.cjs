const vscode=require('vscode'),fs=require('fs');
exports.run=async()=>{
const ext=vscode.extensions.getExtension('Fr43nk.seito-openfile');await ext.activate();const rows=[];
const bases={local:'E:\\Github\\seito-unc-evidence-20261124\\fixture',unc:'\\\\SMB-SERVER\\TEST-SHARE\\CodexValidation\\disposable-fixture\\seito-only',mapped:'T:\\CodexValidation\\disposable-fixture\\seito-only'};
for(const [mode,base] of Object.entries(bases))for(const kind of ['relative','nested','mixedCase','absolute','missing']){
 const operand={relative:'child.trd',nested:'Nested\\Child.trd',mixedCase:'NESTED\\CHILD.TRD',absolute:base+'\\Nested\\Child.trd',missing:'missing.trd'}[kind];
 await vscode.commands.executeCommand('workbench.action.closeAllEditors');
 const doc=await vscode.workspace.openTextDocument(vscode.Uri.file(base+'\\root.tcf'));const editor=await vscode.window.showTextDocument(doc);
 // In-memory edit only: the parent on disk stays unchanged.
 await editor.edit(b=>b.replace(new vscode.Range(0,0,doc.lineCount,0),'Read File == '+operand+'\n'));
 editor.selection=new vscode.Selection(0,13+operand.length,0,13+operand.length);await new Promise(r=>setTimeout(r,300));
 await vscode.commands.executeCommand('seito-openfile.openFileFromText');await new Promise(r=>setTimeout(r,1000));
 const actual=vscode.window.activeTextEditor?.document.uri.fsPath;const expected=base+'\\'+(kind==='relative'?'child.trd':kind==='missing'?'root.tcf':'Nested\\Child.trd');
 rows.push({mode,kind,pass:actual?.toLowerCase()===expected.toLowerCase()&& (kind!=='mixedCase'||actual?.endsWith('Nested\\Child.trd')),active:actual?.slice(base.length)});
 await vscode.commands.executeCommand('workbench.action.closeQuickOpen');await vscode.window.showTextDocument(doc);await vscode.commands.executeCommand('workbench.action.files.revert');
}
fs.writeFileSync(process.env.SEITO_REPORT,JSON.stringify({extension:ext.packageJSON.version,extensionPath:ext.extensionPath,helperPresent:vscode.extensions.all.some(e=>/tuflow/i.test(e.id)),rows},null,2));
if(rows.some(r=>!r.pass))throw Error('Navigation matrix failed');
};

