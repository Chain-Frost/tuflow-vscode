import * as vscode from 'vscode';
import { getCommandsForFile, lookupCommandsForFile, parseTuflowLine } from './commands';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    console.log('TUFLOW extension activated');

    // Register completion provider for TUFLOW commands
    const provider = vscode.languages.registerCompletionItemProvider(
        'tuflow-helper',
        {
            provideCompletionItems(
                document: vscode.TextDocument,
                position: vscode.Position,
                token: vscode.CancellationToken,
                context: vscode.CompletionContext
            ) {
                const completionItems: vscode.CompletionItem[] = [];
                const lineText = document.lineAt(position).text;
                const parsedLine = parseTuflowLine(lineText, position.line);
                const fileExtension = path.extname(document.fileName).toLowerCase();

                // A comment is not command text or a parameter.
                if (parsedLine.comment &&
                    position.character >= parsedLine.comment.range.start.character) {
                    return completionItems;
                }

                const afterDelimiter = parsedLine.delimiter !== null &&
                    position.character >= parsedLine.delimiter.range.end.character;
                if (!afterDelimiter) {
                    // Syntax-only extensions deliberately have no command catalogue.
                    const filteredCommands = getCommandsForFile(fileExtension);
                    const seen = new Set<string>();

                    for (const cmd of filteredCommands) {
                        const key = cmd.canonicalName.toLowerCase();
                        if (seen.has(key)) continue;
                        seen.add(key);
                        const item = new vscode.CompletionItem(
                            cmd.canonicalName, vscode.CompletionItemKind.Keyword
                        );
                        item.detail = cmd.description;
                        let documentation = '**' + cmd.canonicalName + '**\n\n' + cmd.description;
                        if (cmd.syntax) documentation += '\n\n**Syntax:** ' + cmd.syntax;
                        if (cmd.parameters?.length) {
                            documentation += '\n\n**Parameters:** ' + cmd.parameters.join(', ');
                        }
                        if (cmd.safeExamples.length) {
                            documentation += '\n\n**Verified examples:**\n' +
                                cmd.safeExamples.map(value => '- ' + value).join('\n');
                        } else if (cmd.examples?.length) {
                            documentation += '\n\n**Legacy examples (not audited):**\n' +
                                cmd.examples.map(value => '- ' + value).join('\n');
                        }
                        if (cmd.notes) documentation += '\n\n**Notes:** ' + cmd.notes;
                        documentation += '\n\n**Reference:** [Official TUFLOW manual](' +
                            cmd.provenance.url + ')';
                        item.documentation = new vscode.MarkdownString(documentation);
                        item.insertText = cmd.canonicalName + ' == ';
                        completionItems.push(item);
                    }
                } else {
                    const candidates = lookupCommandsForFile(fileExtension, parsedLine);
                    // Use documented options in preference to generic guesses.
                    const options = [...new Set(candidates.flatMap(cmd => cmd.allowedValues ?? []))];
                    const expectsPath = candidates.some(cmd => cmd.valueKind === 'file-path');
                    if (expectsPath) {
                        const fileItem = new vscode.CompletionItem('file path', vscode.CompletionItemKind.File);
                        fileItem.insertText = new vscode.SnippetString('$' + '{1:filename}');
                        completionItems.push(fileItem);
                    }

                    const suggestedValues = options;
                    for (const value of suggestedValues) {
                        const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.Value);
                        item.insertText = value;
                        completionItems.push(item);
                    }
                }

                return completionItems;
            }
        },
        ' ' // Trigger on space
    );

    // Hover uses the complete parsed left-hand phrase (including modifiers).
    // It never performs global first-word lookup or interprets comment/value text.
    const hoverProvider = vscode.languages.registerHoverProvider(
        'tuflow-helper',
        {
            provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
                const parsed = parseTuflowLine(document.lineAt(position.line).text, position.line);
                const left = parsed.leftHand;
                if (!left || position.character < left.range.start.character ||
                    position.character >= left.range.end.character) {
                    return;
                }

                const matches = lookupCommandsForFile(path.extname(document.fileName), parsed);
                if (!matches.length) return;

                const markdown = new vscode.MarkdownString();
                for (const command of matches) {
                    if (command.syntax) markdown.appendCodeblock(command.syntax, 'tuflow');
                    let body = '**' + command.canonicalName + '**\n\n' + command.description;
                    if (command.parameters?.length) {
                        body += '\n\n**Parameters:** ' + command.parameters.join(', ');
                    }
                    if (command.safeExamples.length) {
                        body += '\n\n**Verified examples:**\n' +
                            command.safeExamples.map(value => '- ' + value).join('\n');
                    } else if (command.examples?.length) {
                        body += '\n\n**Legacy examples (not audited):**\n' +
                            command.examples.map(value => '- ' + value).join('\n');
                    }
                    if (command.notes) body += '\n\n**Notes:** ' + command.notes;
                    body += '\n\n**Reference:** [Official TUFLOW manual](' +
                        command.provenance.url + ')';
                    markdown.appendMarkdown(body + '\n\n');
                }
                const hoverRange = new vscode.Range(
                    new vscode.Position(left.range.start.line, left.range.start.character),
                    new vscode.Position(left.range.end.line, left.range.end.character)
                );
                return new vscode.Hover(markdown, hoverRange);
            }
        }
    );

    // Signatures use the same context-aware registry as completions and hover.
    const signatureProvider = vscode.languages.registerSignatureHelpProvider(
        'tuflow-helper',
        {
            provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position,
                token: vscode.CancellationToken, context: vscode.SignatureHelpContext) {
                const parsed = parseTuflowLine(document.lineAt(position.line).text, position.line);
                if (!parsed.delimiter || position.character < parsed.delimiter.range.end.character ||
                    (parsed.comment && position.character >= parsed.comment.range.start.character)) {
                    return null;
                }

                const matches = lookupCommandsForFile(path.extname(document.fileName), parsed)
                    .filter(cmd => (cmd.parameters?.length ?? 0) > 0);
                if (!matches.length) return null;

                const help = new vscode.SignatureHelp();
                help.signatures = matches.map(command => {
                    const parameters = command.parameters ?? [];
                    const signature = new vscode.SignatureInformation(
                        command.canonicalName + ' == ' + parameters.join(' '),
                        command.description
                    );
                    signature.parameters = parameters.map(param =>
                        new vscode.ParameterInformation(param, 'Parameter: ' + param));
                    return signature;
                });
                help.activeSignature = 0;
                help.activeParameter = 0;
                return help;
            }
        },
        ' ', '(', ',', '='
    );

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

    context.subscriptions.push(provider, hoverProvider, signatureProvider, openFileCommand, openDocumentationCommand);
}

export function deactivate() {}
