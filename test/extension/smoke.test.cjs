const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vscode = require('vscode');

const extensionId = 'lmillard79.tuflow-helper';
const languageId = 'tuflow-helper';

suite('TUFLOW Helper Extension Host smoke tests', () => {
  test('extension activates and contributes required resources', async () => {
    const extension = vscode.extensions.getExtension(extensionId);
    assert.ok(extension, `extension ${extensionId} should be installed or loaded for development`);
    await extension.activate();
    assert.ok(extension.isActive);
    assert.ok((await vscode.languages.getLanguages()).includes(languageId));

    const manifest = extension.packageJSON;
    const language = manifest.contributes.languages.find(item => item.id === languageId);
    assert.ok(language);
    assert.ok(language.extensions.includes('.qcf'));
    assert.ok(language.extensions.includes('.toc'));
    const resources = [
      manifest.main,
      language.configuration,
      ...manifest.contributes.grammars.map(grammar => grammar.path),
      ...manifest.contributes.snippets.map(snippet => snippet.path)
    ];
    for (const resource of resources) {
      assert.ok(fs.existsSync(path.resolve(extension.extensionPath, resource)), `missing contribution: ${resource}`);
    }
    assert.ok(fs.existsSync(path.join(extension.extensionPath, 'doc')));
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('tuflow-helper.openFileUnderCursor'));
    assert.ok(commands.includes('tuflow-helper.openDocumentation'));
  });

  test('TUFLOW file extensions resolve to the contributed language', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tuflow-helper-test-'));
    try {
      for (const extension of ['.tcf', '.ecf', '.tgc', '.tbc', '.qcf', '.toc', '.trfc']) {
        const file = path.join(directory, `model${extension}`);
        fs.writeFileSync(file, 'Cell Size == 10\n', 'utf8');
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
        assert.equal(document.languageId, languageId, `wrong language for ${extension}`);
      }
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('activation exposes a representative command completion', async () => {
    const document = await vscode.workspace.openTextDocument({ language: languageId, content: 'Cell' });
    const completions = await vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider',
      document.uri,
      new vscode.Position(0, 4)
    );
    assert.ok(completions);
    assert.ok(completions.items.some(item => item.label === 'Cell Size'));
  });
});
