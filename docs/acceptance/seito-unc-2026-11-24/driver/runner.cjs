const vscode = require('vscode');
const fs = require('fs');
exports.run = async () => {
 const rows=[];
 const ext=vscode.extensions.getExtension('Fr43nk.seito-openfile'); await ext.activate();
 for(const [mode,base] of [['local','E:\\Github\\seito-unc-evidence-20261124\\fixture'],['unc','\\\\SMB-SERVER\\TEST-SHARE\\CodexValidation\\disposable-fixture\\seito-only'],['mapped','T:\\CodexValidation\\disposable-fixture\\seito-only']]) {
  await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  const doc=await vscode.workspace.openTextDocument(vscode.Uri.file(base+'\\root.tcf'));
  const editor=await vscode.window.showTextDocument(doc); editor.selection=new vscode.Selection(0,22,0,22);
  await new Promise(r=>setTimeout(r,500));
  await vscode.commands.executeCommand('seito-openfile.openFileFromText');
  await new Promise(r=>setTimeout(r,1600));
  const actual=vscode.window.activeTextEditor?.document.uri.fsPath;
  rows.push({mode,openedChild:actual?.toLowerCase()===(base+'\\child.trd').toLowerCase(),active:actual?.replace(base,mode.toUpperCase())});
  await vscode.commands.executeCommand('workbench.action.closeQuickOpen');
 }
 fs.writeFileSync(process.env.SEITO_REPORT,JSON.stringify({extension:ext.packageJSON.version,onlySeito:!vscode.extensions.getExtension('Chain-Frost.tuflow-helper'),rows},null,2));
};
