const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vscode = require('vscode');
const manifest = require('../../package.json');
const extensionId = manifest.publisher + '.' + manifest.name;
const language = manifest.contributes.languages[0].id;
const extension = vscode.extensions.getExtension(extensionId);

async function withControlFile(suffix, text, fn) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'issue3-'));
  try {
    const filepath = path.join(directory, 'model' + suffix);
    fs.writeFileSync(filepath, text, 'utf8');
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filepath));
    assert.equal(doc.languageId, language);
    return await fn(doc);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

async function completions(doc, at) {
  const results = await vscode.commands.executeCommand('vscode.executeCompletionItemProvider',
    doc.uri, new vscode.Position(0, at));
  return results?.items.map(x => typeof x.label === 'string' ? x.label : x.label.label) ?? [];
}
async function hover(doc, at) {
  return await vscode.commands.executeCommand('vscode.executeHoverProvider',
    doc.uri, new vscode.Position(0, at)) ?? [];
}
function hoverText(items) {
  return items.flatMap(x => x.contents.map(y => typeof y === 'string' ? y : y.value ?? '')).join('\n');
}
async function signature(doc, at) {
  return await vscode.commands.executeCommand('vscode.executeSignatureHelpProvider',
    doc.uri, new vscode.Position(0, at));
}

suite('Issue #3 actual VS Code editor / installed VSIX tests', () => {
  suiteSetup(async () => {
    assert.ok(extension, 'TUFLOW Helper must be active in VS Code');
    await extension.activate();
    if (process.env.TUFLOW_TEST_INSTALLED === '1') {
      assert.notEqual(path.resolve(extension.extensionPath), path.resolve(__dirname, '../..'),
        'installed-VSIX must be loaded, not source checkout');
    }
  });

  test('file-specific completion and no wrong-context commands', async () => {
    await withControlFile('.tcf', 'Cell', async doc => {
      const labels = await completions(doc, 4);
      assert.ok(labels.includes('Cell Size'));
      assert.ok(!labels.includes('Read GIS Z Shape'));
    });
    await withControlFile('.tgc', 'Read GIS', async doc => {
      const labels = await completions(doc, 8);
      assert.ok(labels.includes('Read GIS Z Shape'));
      assert.ok(!labels.includes('Cell Size'));
    });
  });

  test('TCF and TGC same-name hovers retain distinct descriptions', async () => {
    await withControlFile('.tcf', 'Set Mat == 2', async doc => {
      const text = hoverText(await hover(doc, 3));
      assert.ok(text.includes('Defines material properties'));
      assert.ok(!text.includes('Defines material properties in geometry'));
    });
    await withControlFile('.tgc', 'Set Mat == 2', async doc => {
      assert.ok(hoverText(await hover(doc, 3)).includes('Defines material properties in geometry'));
    });
  });

  test('multiword, modifier and parenthesized commands have exact hover range', async () => {
    await withControlFile('.tgc', '  Read GIS Z Shape RIDGE XF ON == terrain.shp', async doc => {
      const items = await hover(doc, 14);
      assert.ok(hoverText(items).includes('Read GIS Z Shape'));
      const relevant = items.find(x => hoverText([x]).includes('Read GIS Z Shape'));
      assert.ok(relevant?.range);
      assert.equal(relevant.range.start.character, 2);
      assert.equal(relevant.range.end.character, '  Read GIS Z Shape RIDGE XF ON'.length);
    });
    await withControlFile('.trfc', 'RF Grid Size ( N , M ) == 40, 60', async doc => {
      assert.ok(hoverText(await hover(doc, 5)).includes('RF Grid Size (N,M)'));
    });
  });

  test('signature help on known commands and no value-region hover', async () => {
    await withControlFile('.tcf', 'Start Time == 0', async doc => {
      const result = await signature(doc, 'Start Time == '.length);
      assert.ok(result?.signatures.some(x => x.label.includes('Start Time ==')));
    });
    await withControlFile('.ecf', 'BC Event Name == test', async doc => {
      const result = await signature(doc, 'BC Event Name == '.length);
      assert.ok(result?.signatures.some(x => x.label.includes('BC Event Name ==')));
    });
    await withControlFile('.tgc', 'Read GIS Z Shape == gis/sample.shp', async doc => {
      assert.ok(!hoverText(await hover(doc, 'Read GIS Z Shape == '.length + 2))
        .includes('Reads GIS elevation'));
    });
  });

  test('both comment delimiters hide commands and signature help', async () => {
    for (const marker of ['#', '!']) {
      await withControlFile('.tgc', marker + ' Read GIS Z Shape == invalid.shp', async doc => {
        assert.ok(!hoverText(await hover(doc, 9)).includes('Reads GIS elevation'));
        assert.ok(!(await completions(doc, 9)).includes('Read GIS Z Shape'));
        assert.equal(vscode.languages.getDiagnostics(doc.uri).length, 0);
      });
      await withControlFile('.tcf', 'Start Time == 0 ' + marker + ' disabled', async doc => {
        const at = 'Start Time == 0 '.length + 2;
        assert.ok(!hoverText(await hover(doc, at)).includes('Sets the simulation start time'));
        assert.equal(await signature(doc, at), undefined);
      });
    }
  });

  test('quoted markers remain values; unknowns and incomplete inputs stay permissive', async () => {
    for (const marker of ['#', '!']) {
      await withControlFile('.tgc',
        'Read GIS Z Shape == "gis/a' + marker + 'b.gpkg" ' + marker + ' note', async doc => {
          assert.ok(hoverText(await hover(doc, 6)).includes('Read GIS Z Shape'));
          assert.ok(!hoverText(await hover(doc, doc.lineAt(0).text.length - 3))
            .includes('Read GIS Z Shape'));
        });
    }
    await withControlFile('.tcf', 'Unrecognised Future Command == value', async doc => {
      assert.ok(!hoverText(await hover(doc, 12)).includes('TUFLOW'));
      assert.equal(vscode.languages.getDiagnostics(doc.uri).length, 0);
    });
    await withControlFile('.tgc', 'Read GIS Z Shape', async doc => {
      assert.ok(hoverText(await hover(doc, 3)).includes('Read GIS Z Shape'));
      assert.equal(vscode.languages.getDiagnostics(doc.uri).length, 0);
    });
  });
});
