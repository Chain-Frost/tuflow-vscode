const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vscode = require('vscode');

// Read contributions from the manifest so the coexistence workstream can
// migrate the language ID and remove legacy commands without breaking this suite.
const projectManifest = require('../../package.json');
const extensionId = `${projectManifest.publisher}.${projectManifest.name}`;
const languageId = projectManifest.contributes.languages[0].id;

suite('TUFLOW Helper Extension Host smoke tests', () => {
  test('extension activates and contributes required resources', async () => {
    const extension = vscode.extensions.getExtension(extensionId);
    assert.ok(extension, `extension ${extensionId} should be installed or loaded for development`);
    if (process.env.TUFLOW_TEST_INSTALLED === '1') {
      assert.notEqual(
        path.resolve(extension.extensionPath),
        path.resolve(__dirname, '../..'),
        'installed-VSIX test must not load the development checkout'
      );
    }
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
    // Only require captured HTML when the installed runtime still uses it.
    const runtime = fs.readFileSync(path.join(extension.extensionPath, manifest.main), 'utf8');
    if (runtime.includes('doc/Appendix ')) {
      assert.ok(fs.existsSync(path.join(extension.extensionPath, 'doc')));
    }
    const commands = await vscode.commands.getCommands(true);
    for (const { command } of manifest.contributes.commands || []) {
      assert.ok(commands.includes(command), `command not registered: ${command}`);
    }
    assert.ok(!commands.includes('tuflow-helper.openFileUnderCursor'),
      'legacy duplicate file opener must not be registered');
    assert.ok(commands.includes('tuflow-helper.openDocumentation'),
      'existing documentation command must remain registered');
  });

  test('TUFLOW file extensions resolve to the contributed language', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tuflow-helper-test-'));
    try {
      for (const extension of ['.tcf', '.ecf', '.tgc', '.tbc', '.tef', '.trd', '.qcf', '.toc', '.trfc']) {
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
