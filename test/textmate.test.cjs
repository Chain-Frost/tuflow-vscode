'use strict';

// Real TextMate/Oniguruma tokenisation test; CI installs these test-only tools
// into .grammar-test-deps, without changing the extension's runtime dependencies.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vsctm = require('vscode-textmate');
const oniguruma = require('vscode-oniguruma');

const root = path.resolve(__dirname, '..');
const grammarPath = path.join(root, 'syntaxes/tuflow.tmLanguage.json');
const fixtures = require('./fixtures/grammar-cases.json');

async function loadGrammar() {
    const wasm = fs.readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm'));
    await oniguruma.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
    const registry = new vsctm.Registry({
        onigLib: Promise.resolve({
            createOnigScanner: patterns => new oniguruma.OnigScanner(patterns),
            createOnigString: source => new oniguruma.OnigString(source)
        }),
        loadGrammar: async scopeName => scopeName === 'source.tuflow'
            ? vsctm.parseRawGrammar(fs.readFileSync(grammarPath, 'utf8'), grammarPath)
            : null
    });
    return registry.loadGrammar('source.tuflow');
}

function scopesAt(tokens, offset) {
    const token = tokens.find(t => t.startIndex <= offset && t.endIndex > offset);
    assert.ok(token, `no token at offset ${offset}`);
    return token.scopes;
}

test('TextMate lexer produces fixture scopes and keeps unknown commands neutral', async () => {
    const grammar = await loadGrammar();
    assert.ok(grammar);
    for (const fixture of fixtures) {
        const { line, name, expected } = fixture;
        const tokens = grammar.tokenizeLine(line, vsctm.INITIAL).tokens;
        for (const [scope, text] of expected) {
            const at = line.indexOf(text);
            assert.ok(at >= 0, `${name}: expected text not found: ${text}`);
            const scopes = scopesAt(tokens, at + (/^\s*/.exec(text)[0].length));
            assert.ok(scopes.includes(scope), `${name}: ${JSON.stringify({scope, text, scopes, tokens})}`);
        }
        if (name.startsWith('unknown') || name.startsWith('incomplete')) {
            assert.ok(!tokens.some(t => t.scopes.includes('support.function.tuflow')),
                `${name}: unknown command was classified as recognised`);
        }
    }
});

test('quote protection and comment precedence survive TextMate tokenisation', async () => {
    const grammar = await loadGrammar();
    const line = 'Read GIS Z Shape == "C:\\model!test\\terrain.tif" ! comment == -2';
    const tokens = grammar.tokenizeLine(line, vsctm.INITIAL).tokens;
    assert.ok(scopesAt(tokens, line.indexOf('!test')).includes('string.quoted.double.tuflow'));
    assert.ok(!scopesAt(tokens, line.indexOf('!test')).includes('comment.line.exclamation.tuflow'));
    assert.ok(scopesAt(tokens, line.indexOf('! comment')).includes('comment.line.exclamation.tuflow'));
    assert.ok(!scopesAt(tokens, line.lastIndexOf('==')).includes('keyword.operator.assignment.tuflow'));
});
