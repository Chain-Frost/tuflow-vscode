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
    // Command context is the actual file extension, not just the language ID.
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'helper-command-smoke-'));
    const file = path.join(directory, 'model.tcf');
    fs.writeFileSync(file, 'Cell', 'utf8');
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    const completions = await vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider',
      document.uri,
      new vscode.Position(0, 4)
    );
    assert.ok(completions);
    assert.ok(completions.items.some(item => item.label === 'Cell Size'));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  test('integrated audited End Time hover gives hours and correct official reference', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tuflow-integrated-help-'));
    try {
      for (const [ext, line] of [['.tcf', 'End Time == 12'], ['.tef', 'End Time == 12'], ['.trd', 'End Time == 12']]) {
        const file = path.join(directory, 'model' + ext);
        fs.writeFileSync(file, line + '\n');
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
        const hovers = await vscode.commands.executeCommand(
          'vscode.executeHoverProvider', document.uri, new vscode.Position(0, 4)
        );
        const text = (hovers || []).flatMap(h => h.contents)
          .map(c => typeof c === 'string' ? c : c.value || '').join('\n');
        assert.match(text, /End Time/, ext);
        assert.match(text, /hour/i, ext);
        assert.match(text, /80-AppendicesA-TCFCommands\.html/, ext);
        assert.doesNotMatch(text, /HH:MM:SS/, ext);
        assert.match(text, /\*\*Syntax:\*\* `End Time == <time_in_hours>`/, ext);
      }
      const untitled = await vscode.workspace.openTextDocument({ language: languageId, content: 'End Time == 12\n' });
      const hovers = await vscode.commands.executeCommand(
        'vscode.executeHoverProvider', untitled.uri, new vscode.Position(0, 4)
      );
      const text = (hovers || []).flatMap(h => h.contents)
        .map(c => typeof c === 'string' ? c : c.value || '').join('\n');
      assert.match(text, /End Time/);
      assert.match(text, /hour/i);
      assert.doesNotMatch(text, /HH:MM:SS/);
      assert.match(text, /\*\*Syntax:\*\* `End Time == <time_in_hours>`/);
    } finally {
      fs.rmSync(directory, {recursive:true, force:true});
    }
  });

  test('integrated VS Code expands all ten curated snippets with placeholders', async () => {
    const extension = vscode.extensions.getExtension(extensionId);
    assert.ok(extension);
    const snippets = require(path.join(extension.extensionPath, 'snippets/tuflow.json'));
    const expected = {
      'tcf-geometry': 'Geometry Control File == ../model/model.tgc',
      'tcf-boundaries': 'BC Control File == ../model/model.tbc',
      'tcf-end-time': 'End Time == 12',
      'tgc-cell-size': 'Cell Size == 10',
      'tgc-z-shape': 'Read GIS Z Shape == ../model/gis/2d_zsh_001.shp',
      'tbc-database': 'BC Database == ../bc_dbase/bc_dbase.csv',
      'ecf-network': 'Read GIS Network == ../model/gis/1d_nwk_001.shp',
      'qcf-base-cell-size': 'Base Cell Size == 20',
      'trfc-interpolation': 'RF Interpolation Method == IDW',
      'tef-event': 'Define Event == design_event\n    End Time == 12\nEnd Define'
    };
    assert.equal(Object.keys(snippets).length, 10);
    for (const snippet of Object.values(snippets)) {
      const doc = await vscode.workspace.openTextDocument({language:languageId,content:''});
      const editor = await vscode.window.showTextDocument(doc);
      const inserted = await editor.insertSnippet(
        new vscode.SnippetString(Array.isArray(snippet.body) ? snippet.body.join('\n') : snippet.body)
      );
      assert.equal(inserted, true, 'failed insert ' + snippet.prefix);
      assert.equal(doc.getText().replace(/\r\n/g, '\n'), expected[snippet.prefix], snippet.prefix);
    }
  });

});
