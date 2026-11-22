import * as vscode from 'vscode';
import { registerCommandEditorServices } from './editor/commandProviders';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    console.log('TUFLOW extension activated');

    const editorServices = registerCommandEditorServices('tuflow-helper');

    // Register command to open file under cursor
    const openFileCommand = vscode.commands.registerCommand('tuflow-helper.openFileUnderCursor', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        
        const document = editor.document;
        const selection = editor.selection;
        const text = document.getText(selection);
        
        if (text) {
            // Try to extract a file path from the selected text
            const filePathMatch = text.match(/(?:'|"|\s|^)([\w\\/\-\.]+\.[\w]+)(?:'|"|\s|$)/);
            if (filePathMatch) {
                const filePath = filePathMatch[1];
                vscode.window.showInformationMessage(`Opening file: ${filePath}`);
                
                // Try to open the file
                vscode.workspace.openTextDocument(filePath).then(doc => {
                    vscode.window.showTextDocument(doc);
                }, error => {
                    // If file doesn't exist, show error message
                    vscode.window.showErrorMessage(`Could not open file: ${filePath}. Error: ${error.message}`);
                });
            } else {
                vscode.window.showErrorMessage('No valid file path found in selection or under cursor');
            }
        } else {
            // If no text is selected, try to get file path under cursor
            const position = editor.selection.active;
            const lineText = document.lineAt(position.line).text;
            
            // Extract word under cursor
            const wordRange = document.getWordRangeAtPosition(position);
            if (wordRange) {
                const word = document.getText(wordRange);
                
                // Try to open as file
                vscode.workspace.openTextDocument(word).then(doc => {
                    vscode.window.showTextDocument(doc);
                }, error => {
                    vscode.window.showErrorMessage(`Could not open file: ${word}. Error: ${error.message}`);
                });
            } else {
                vscode.window.showErrorMessage('No text selected or under cursor');
            }
        }
    });

    // Register command to open documentation based on file extension
    const openDocumentationCommand = vscode.commands.registerCommand('tuflow-helper.openDocumentation', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        
        const document = editor.document;
        const fileExtension = path.extname(document.fileName).toLowerCase();
        
        // Mapping of file extensions to documentation files
        const documentationMap: { [key: string]: string } = {
            '.tcf': 'doc/Appendix A TCF Commands _ TUFLOW Classic_HPC User Manual 2023-03.html',
            '.tgc': 'doc/Appendix C TGC Commands _ TUFLOW Classic_HPC User Manual 2023-03.html',
            '.tbc': 'doc/Appendix D TBC Commands _ TUFLOW Classic_HPC User Manual 2023-03.html',
            '.ecf': 'doc/Appendix B ECF Commands _ TUFLOW Classic_HPC User Manual 2025.0.htm',
            '.trfc': 'doc/Appendix F TRFC Commands _ TUFLOW Classic_HPC User Manual 2025.0.htm',
            '.qcf': 'doc/Appendix H QCF Commands _ TUFLOW Classic_HPC User Manual 2025.0.htm'
        };
        
        const docPath = documentationMap[fileExtension];
        if (docPath) {
            const fullDocPath = path.join(vscode.workspace.rootPath || '', docPath);
            vscode.workspace.openTextDocument(fullDocPath).then(doc => {
                vscode.window.showTextDocument(doc);
            }, error => {
                vscode.window.showErrorMessage(`Could not open documentation for ${fileExtension} files. Error: ${error.message}`);
            });
        } else {
            vscode.window.showErrorMessage(`No documentation available for ${fileExtension} files`);
        }
    });

    context.subscriptions.push(...editorServices, openFileCommand, openDocumentationCommand);
}

export function deactivate() { /* Subscriptions are disposed by VS Code. */ }
