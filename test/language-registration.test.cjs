'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const manifest = JSON.parse(read('package.json'));

const overlappingExtensions = ['.tcf', '.tgc', '.tbc', '.ecf', '.trd', '.qcf', '.tef', '.trfc', '.toc'];

test('language, grammar, snippets, configuration and activation share the tuflow ID', () => {
    assert.equal(manifest.contributes.languages.length, 1);
    const language = manifest.contributes.languages[0];
    assert.equal(language.id, 'tuflow');
    assert.equal(language.configuration, './language-configuration.json');
    assert.ok(fs.existsSync(path.join(root, language.configuration)));
    for (const ext of overlappingExtensions) {
        assert.ok(language.extensions.includes(ext), 'missing overlapping extension: ' + ext);
    }
    assert.ok(manifest.activationEvents.includes('onLanguage:tuflow'));
    assert.ok(!manifest.activationEvents.includes('onLanguage:tuflow-helper'));
    assert.ok(manifest.contributes.grammars.some(g => g.language === 'tuflow' && g.scopeName === 'source.tuflow'));
    assert.ok(manifest.contributes.snippets.some(s => s.language === 'tuflow'));
    for (const contribution of [...manifest.contributes.grammars, ...manifest.contributes.snippets]) {
        assert.notEqual(contribution.language, 'tuflow-helper');
        assert.ok(fs.existsSync(path.join(root, contribution.path)));
    }
    assert.equal(JSON.parse(read('syntaxes/tuflow.tmLanguage.json')).scopeName, 'source.tuflow');
});

test('no duplicate file opening, diagnostic or formatting contributions in Helper', () => {
    const commands = manifest.contributes.commands.map(c => c.command);
    assert.deepEqual(commands, ['tuflow-helper.openDocumentation']);
    assert.ok(!Object.values(manifest.contributes.menus || {}).flat().some(c => c.command.includes('openFileUnderCursor')));
    for (const file of ['src/extension.ts', 'out/extension.js']) {
        const text = read(file);
        assert.doesNotMatch(text, /openFileUnderCursor|openFileCommand|createDiagnosticCollection|registerDocumentFormattingEditProvider/);
    }
});


function activateHelperOnly() {
    const calls = { languages: [], commands: [] };
    const disposable = () => ({ dispose() {} });
    const exportsObject = {};
    const module = { exports: exportsObject };
    vm.runInNewContext(read('out/extension.js'), {
        module, exports: exportsObject,
        require(id) {
            if (id === 'vscode') {
                return { commands: {
                    registerCommand(id, handler) {
                        calls.commands.push({ id, handler });
                        return disposable();
                    }
                }};
            }
            if (id === './editor/commandProviders') {
                return { registerCommandEditorServices(languageId) {
                    calls.languages.push(languageId);
                    return [disposable(), disposable(), disposable()];
                }};
            }
            if (id === './documentation') return require('../out/documentation.js');
            if (id === 'path') return path;
            throw Error('unexpected module: ' + id);
        },
        console: { log() {} }
    }, { filename: 'out/extension.js' });
    const context = { subscriptions: [] };
    module.exports.activate(context);
    return { calls, context };
}

test('Helper activation registers exactly one set of language-aware editor services', () => {
    const { calls, context } = activateHelperOnly();
    assert.deepEqual([...calls.languages], ['tuflow']);
    assert.deepEqual([...calls.commands.map(item => item.id)], ['tuflow-helper.openDocumentation']);
    assert.equal(context.subscriptions.length, 4);
});

test('file extension context suppresses unrelated completions while preserving TCF/TGC', () => {
    const { planCompletions, planHover, planSignature } =
        require('../out/editor/commandModel.js');
    assert.ok(planCompletions('model.tcf', 'Cell', 4).some(item => item.label === 'Cell Size'));
    assert.ok(planCompletions('model.tgc', 'Read GIS Z Sh', 13)
        .some(item => item.label === 'Read GIS Z Shape'));
    assert.deepEqual(planCompletions('model.tef', 'Cell', 4), []);
    assert.deepEqual(planCompletions('model.trd', 'Read GIS Z Sh', 13), []);
    assert.ok(planHover('model.tcf', 'Map Output Format == XMDF', 8));
    assert.equal(planSignature('model.tef', 'RF Grid Origin == 1, 2', 22), undefined);
});
