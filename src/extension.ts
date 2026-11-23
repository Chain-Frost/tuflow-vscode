import * as vscode from 'vscode';
import { allTuflowCommands, TuflowCommand, tcfCommands, tgcCommands, tbcCommands, ecfCommands, trfcCommands, qcfCommands } from './commands';
import * as path from 'path';
import { getAuditedCommandDocumentationUrl, getDocumentationUrlForLine } from './documentation';

export function activate(context: vscode.ExtensionContext) {
    console.log('TUFLOW extension activated');

    // Register completion provider for TUFLOW commands
    const provider = vscode.languages.registerCompletionItemProvider(
        'tuflow',
        {
            provideCompletionItems(
                document: vscode.TextDocument,
                position: vscode.Position,
                token: vscode.CancellationToken,
                context: vscode.CompletionContext
            ) {
                const completionItems: vscode.CompletionItem[] = [];
                
                // Get current line text
                const lineText = document.lineAt(position).text;
                const textBeforeCursor = lineText.substring(0, position.character);
                
                // Check if we're providing parameter suggestions after '=='
                const hasCommandPrefix = textBeforeCursor.includes('==');
                const commandMatch = textBeforeCursor.match(/^\s*([A-Za-z\s]+?)(?:\s*==\s*)?$/);
                
                // Get file extension to filter commands
                const fileExtension = path.extname(document.fileName).toLowerCase();
                
                if (!hasCommandPrefix) {
                    // Add command completions based on file extension
                    let filteredCommands: TuflowCommand[] = [];
                    
                    switch (fileExtension) {
                        case '.tcf':
                            filteredCommands = tcfCommands;
                            break;
                        case '.tgc':
                            filteredCommands = tgcCommands;
                            break;
                        case '.tbc':
                            filteredCommands = tbcCommands;
                            break;
                        case '.ecf':
                            filteredCommands = ecfCommands;
                            break;
                        case '.trfc':
                            filteredCommands = trfcCommands;
                            break;
                        case '.qcf':
                            filteredCommands = qcfCommands;
                            break;
                        default:
                            filteredCommands = allTuflowCommands;
                    }
                    
                    filteredCommands.forEach(cmd => {
                        const item = new vscode.CompletionItem(cmd.name, vscode.CompletionItemKind.Keyword);
                        item.detail = cmd.description;
                        
                        let documentation = `**${cmd.name}**\n\n${cmd.description}`;
                        
                        if (cmd.syntax) {
                            documentation += `\n\n**Syntax:** ${cmd.syntax}`;
                        }
                        
                        if (cmd.parameters && cmd.parameters.length > 0) {
                            documentation += `\n\n**Parameters:** ${cmd.parameters.join(', ')}`;
                        }
                        
                        if (cmd.examples && cmd.examples.length > 0) {
                            documentation += `\n\n**Examples:**\n${cmd.examples.map(ex => `- ${ex}`).join('\n')}`;
                        }
                        
                        if (cmd.notes) {
                            documentation += `\n\n**Notes:** ${cmd.notes}`;
                        }
                        
                        const officialUrl = getAuditedCommandDocumentationUrl(fileExtension, cmd.name);
                        if (officialUrl) {
                            documentation += `\n\n[Official TUFLOW command reference](${officialUrl})`;
                        }
                        item.documentation = new vscode.MarkdownString(documentation);
                        item.insertText = cmd.name + ' == ';
                        completionItems.push(item);
                    });
                } else {
                    // Add parameter and file suggestions
                    const fileItem = new vscode.CompletionItem('file path', vscode.CompletionItemKind.File);
                    fileItem.insertText = new vscode.SnippetString('${1:filename}');
                    completionItems.push(fileItem);
                    
                    // Add common parameter values
                    const commonParams = [
                        'ALL', 'NONE', 'AUTO', 'MANUAL', 'ON', 'OFF',
                        'TRUE', 'FALSE', 'YES', 'NO', '0', '1'
                    ];
                    
                    commonParams.forEach(param => {
                        const paramItem = new vscode.CompletionItem(param, vscode.CompletionItemKind.Value);
                        paramItem.insertText = param;
                        completionItems.push(paramItem);
                    });
                }
                
                return completionItems;
            }
        },
        ' ' // Trigger on space
    );

    // Register hover provider for TUFLOW commands
    const hoverProvider = vscode.languages.registerHoverProvider(
        'tuflow',
        {
            provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
                // Match the complete left-hand command, not one word. The old
                // getWordRangeAtPosition lookup never matched multiword commands
                // such as "End Time" and therefore hid their official links.
                const line = document.lineAt(position.line).text;
                const equals = line.indexOf('==');
                if (equals < 0) {
                    return;
                }
                const left = line.slice(0, equals);
                const start = left.search(/\S/);
                if (start < 0 || position.character < start || position.character >= equals) {
                    return;
                }
                const name = left.trim().replace(/\s+/g, ' ').toLowerCase();
                const extension = path.extname(document.fileName).toLowerCase().slice(1);
                const sameName = allTuflowCommands.filter(cmd => cmd.name.toLowerCase() === name);
                const scoped = sameName.find(cmd => cmd.category.toLowerCase() === extension);
                // TEF files admit TCF and ECF commands, and Read File / untitled
                // buffers have no dedicated catalogue. Preserve their hovers,
                // without showing unrelated commands in a known file category.
                const hasOwnCatalogue = ['tcf', 'tgc', 'tbc', 'ecf', 'trfc', 'qcf'].includes(extension);
                const inherited = extension === 'tef'
                    ? sameName.find(cmd => cmd.category === 'TCF' || cmd.category === 'ECF')
                    : (!hasOwnCatalogue ? sameName[0] : undefined);
                const command = scoped || inherited;
                
                if (command) {
                    const markdown = new vscode.MarkdownString();
                    
                    if (command.syntax) {
                        markdown.appendCodeblock(command.syntax, 'tuflow');
                    }
                    
                    let content = `**${command.name}**\n\n${command.description}`;
                    
                    if (command.parameters && command.parameters.length > 0) {
                        content += `\n\n**Parameters:** ${command.parameters.join(', ')}`;
                    }
                    
                    if (command.examples && command.examples.length > 0) {
                        content += `\n\n**Examples:**\n${command.examples.map(ex => `- ${ex}`).join('\n')}`;
                    }
                    
                    if (command.notes) {
                        content += `\n\n**Notes:** ${command.notes}`;
                    }
                    
                    // Event files inherit TCF/ECF commands; link those to the
                    // appendix that actually defines them, not the TEF appendix.
                    const sourceExtension = extension === 'tef' || !extension
                        ? '.' + command.category.toLowerCase()
                        : '.' + extension;
                    const officialUrl = getAuditedCommandDocumentationUrl(sourceExtension, command.name);
                    if (officialUrl) {
                        content += `\n\n[Official TUFLOW command reference](${officialUrl})`;
                    }
                    markdown.appendMarkdown(content);
                    return new vscode.Hover(markdown, new vscode.Range(position.line, start, position.line, equals));
                }
            }
        }
    );

    // Register signature help provider
    const signatureProvider = vscode.languages.registerSignatureHelpProvider(
        'tuflow',
        {
            provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.SignatureHelpContext) {
                const lineText = document.lineAt(position).text;
                const textBeforeCursor = lineText.substring(0, position.character);
                
                // Get file extension to filter commands
                const fileExtension = path.extname(document.fileName).toLowerCase();
                
                // Match command names with spaces
                const commandMatch = textBeforeCursor.match(/^\s*([A-Za-z0-9_\s]+?)(?:\s*==\s*)?$/);
                if (commandMatch) {
                    const commandName = commandMatch[1].trim();
                    // Find command by name, considering file extension
                    let command: TuflowCommand | undefined;
                    
                    switch (fileExtension) {
                        case '.tcf':
                            command = tcfCommands.find(cmd => cmd.name.toLowerCase() === commandName.toLowerCase());
                            break;
                        case '.tgc':
                            command = tgcCommands.find(cmd => cmd.name.toLowerCase() === commandName.toLowerCase());
                            break;
                        case '.tbc':
                            command = tbcCommands.find(cmd => cmd.name.toLowerCase() === commandName.toLowerCase());
                            break;
                        case '.ecf':
                            command = ecfCommands.find(cmd => cmd.name.toLowerCase() === commandName.toLowerCase());
                            break;
                        case '.trfc':
                            command = trfcCommands.find(cmd => cmd.name.toLowerCase() === commandName.toLowerCase());
                            break;
                        case '.qcf':
                            command = qcfCommands.find(cmd => cmd.name.toLowerCase() === commandName.toLowerCase());
                            break;
                        default:
                            command = allTuflowCommands.find(cmd => cmd.name.toLowerCase() === commandName.toLowerCase());
                    }
                    
                    if (command && command.parameters && command.parameters.length > 0) {
                        const signature = new vscode.SignatureInformation(
                            `${command.name} == ${command.parameters.join(' ')}`,
                            command.description
                        );
                        
                        signature.parameters = command.parameters.map(param => 
                            new vscode.ParameterInformation(param, `Parameter: ${param}`)
                        );
                        
                        const help = new vscode.SignatureHelp();
                        help.signatures = [signature];
                        help.activeSignature = 0;
                        help.activeParameter = 0;
                        
                        return help;
                    }
                }
                
                return null;
            }
        },
        ' ', '(', ','
    );

    // Open official, pinned TUFLOW documentation in the user's browser.
    // No model-workspace path, local TUFLOW installation or bundled HTML is needed.
    const openDocumentationCommand = vscode.commands.registerCommand('tuflow-helper.openDocumentation', async () => {
        const editor = vscode.window.activeTextEditor;
        const extension = editor ? path.extname(editor.document.fileName) : '';
        const line = editor ? editor.document.lineAt(editor.selection.active.line).text : '';
        const url = getDocumentationUrlForLine(extension, line);

        try {
            const opened = await vscode.env.openExternal(vscode.Uri.parse(url));
            if (!opened) {
                vscode.window.showWarningMessage('Could not open the official TUFLOW documentation in a browser.');
            }
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Could not open official TUFLOW documentation: ${detail}`);
        }
    });
    context.subscriptions.push(provider, hoverProvider, signatureProvider, openDocumentationCommand);
}

export function deactivate() { /* Subscriptions are disposed by VS Code. */ }
