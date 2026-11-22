/*
 * Runs in the VS Code Extension Host via the issue #2 test harness:
 * npm run test:extension (after the build/CI PR is incorporated).
 * No path validator or other companion extension is required.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vscode = require('vscode');

const manifest = require('../../package.json');
const extensionId = manifest.publisher + '.' + manifest.name;
const languageId = manifest.contributes.languages[0].id;
let directory;
let counter = 0;

async function documentWithExtension(extension, content) {
    const file = path.join(directory, 'case-' + (++counter) + extension);
    fs.writeFileSync(file, content, 'utf8');
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    assert.equal(document.languageId, languageId);
    return document;
}

async function completions(document, column) {
    const result = await vscode.commands.executeCommand(
        'vscode.executeCompletionItemProvider', document.uri, new vscode.Position(0, column)
    );
    assert.ok(result);
    return result.items;
}

function replacementText(original, item) {
    assert.equal(typeof item.insertText, 'string');
    const range = item.range.replacing || item.range;
    assert.ok(range);
    return original.slice(0, range.start.character) + item.insertText +
        original.slice(range.end.character);
}

suite('TUFLOW Helper command-aware editor integration (#6)', () => {
    suiteSetup(async () => {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tuflow-editor-services-'));
        const extension = vscode.extensions.getExtension(extensionId);
        assert.ok(extension, 'TUFLOW Helper extension must be loaded');
        await extension.activate();
    });
    suiteTeardown(() => {
        fs.rmSync(directory, { recursive: true, force: true });
    });

    test('completion expands a partial command without duplicating ==', async () => {
        const line = '  Read GIS Z Sh  == gis/shape.shp';
        const document = await documentWithExtension('.tgc', line);
        const items = await completions(document, line.indexOf('Sh') + 2);
        const chosen = items.find(item => item.label === 'Read GIS Z Shape');
        assert.ok(chosen, 'Read GIS Z Shape should be suggested');
        assert.equal(replacementText(line, chosen),
            '  Read GIS Z Shape  == gis/shape.shp');
    });

    test('source-aware hover covers the whole multiword command and suffix', async () => {
        const line = 'Read GIS Z Shape MAX == gis/shape.shp ! later';
        const document = await documentWithExtension('.tgc', line);
        for (const column of [2, 8, 15, 19]) {
            const hovers = await vscode.commands.executeCommand(
                'vscode.executeHoverProvider', document.uri, new vscode.Position(0, column)
            );
            const ourHover = hovers.find(hover =>
                hover.contents.some(content => String(content.value || content)
                    .includes('Official TUFLOW documentation')));
            assert.ok(ourHover, 'command hover missing at ' + column);
            assert.equal(ourHover.range.start.character, 0);
            assert.equal(ourHover.range.end.character, 'Read GIS Z Shape MAX'.length);
        }
        const comment = await vscode.commands.executeCommand(
            'vscode.executeHoverProvider', document.uri,
            new vscode.Position(0, line.indexOf('later'))
        );
        assert.ok(!comment.some(hover => hover.contents.some(content =>
            String(content.value || content).includes('Official TUFLOW documentation'))));
    });

    test('correct TCF hover is available after the parallel #4 audit is incorporated', async function () {
        const line = 'Map Output Format == XMDF';
        const document = await documentWithExtension('.tcf', line);
        const hovers = await vscode.commands.executeCommand(
            'vscode.executeHoverProvider', document.uri, new vscode.Position(0, 8)
        );
        const ours = hovers.find(hover => hover.contents.some(content =>
            String(content.value || content).includes('Map Output Format')));
        // Issue #4 owns TCF command data; do not fabricate an interim catalogue.
        if (!ours) this.skip();
        assert.equal(ours.range.start.character, 0);
        assert.equal(ours.range.end.character, 'Map Output Format'.length);
    });

    test('keyword choices are contextual and not the universal generic list', async () => {
        const text = 'RF Grid Format == ';
        const document = await documentWithExtension('.trfc', text);
        const options = (await completions(document, text.length)).map(item => item.label);
        for (const expected of ['ASC', 'FLT', 'NC', 'TIF']) {
            assert.ok(options.includes(expected), expected);
        }
        for (const unrelated of ['TRUE', 'FALSE', 'MANUAL', 'AUTO', 'YES', 'NO']) {
            assert.ok(!options.includes(unrelated), 'unexpected universal value: ' + unrelated);
        }
        const wrongFile = await documentWithExtension('.qcf', text);
        const wrongOptions = (await completions(wrongFile, text.length)).map(item => item.label);
        assert.ok(!wrongOptions.includes('TIF'), 'rainfall-grid option leaked into QCF');
    });

    test('no misleading command completions appear inside comments or syntax-only files', async () => {
        const comment = 'Read GIS Z Shape == gis/a.shp ! Read GIS Z';
        const doc = await documentWithExtension('.tgc', comment);
        const inside = (await completions(doc, comment.length))
            .filter(item => item.label === 'Read GIS Z Shape' || item.label === 'file path');
        assert.equal(inside.length, 0);
        const hashComment = 'RF Grid Format == # TIF is only a comment';
        const hashDocument = await documentWithExtension('.trfc', hashComment);
        const hashOptions = await completions(hashDocument, hashComment.length);
        assert.ok(!hashOptions.some(item => ['ASC', 'FLT', 'NC', 'TIF'].includes(item.label)),
            'rainfall format values must be suppressed inside # comments');
        const syntaxOnly = await documentWithExtension('.tef', 'RF Grid');
        const unrelated = (await completions(syntaxOnly, 'RF Grid'.length))
            .filter(item => item.label === 'RF Grid Format');
        assert.equal(unrelated.length, 0);
    });

    test('signature help reports accurate second argument for RF Grid Origin', async () => {
        const text = 'RF Grid Origin == 100, 200';
        const document = await documentWithExtension('.trfc', text);
        const help = await vscode.commands.executeCommand(
            'vscode.executeSignatureHelpProvider', document.uri,
            new vscode.Position(0, text.length)
        );
        assert.ok(help, 'expected a documented numeric-pair signature');
        assert.equal(help.activeParameter, 1);
        assert.equal(help.signatures[0].parameters.length, 2);
        const keyword = 'RF Grid Format == TIF';
        const other = await documentWithExtension('.trfc', keyword);
        const absent = await vscode.commands.executeCommand(
            'vscode.executeSignatureHelpProvider', other.uri,
            new vscode.Position(0, keyword.length)
        );
        assert.ok(!absent || absent.signatures.length === 0);
    });
});
