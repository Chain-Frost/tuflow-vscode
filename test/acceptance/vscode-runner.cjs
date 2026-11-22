'use strict';

// VS Code extension-tests entry point. No dependency on a TUFLOW executable or GIS libraries.
// Run in a fresh Extension Development Host; see docs/acceptance/README.md.
const vscode = require('vscode');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const FIXTURES = path.join(__dirname, 'fixtures');
const MATRIX = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'matrix.json'), 'utf8'));
const PROFILES = {
  'helper-only': { helper: true, validator: false, opener: false, lens: false },
  'validator-only': { helper: false, validator: true, opener: false, lens: false },
  combined: { helper: true, validator: true, opener: false, lens: false },
  full: { helper: true, validator: true, opener: true, lens: true }
};
const EXT_IDS = {
  validator: 'chain-frost.tuflow-path-validator',
  opener: 'fr43nk.seito-openfile',
  lens: 'usernamehw.errorlens'
};

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const round = value => Math.round(value * 100) / 100;
function pct(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return round(sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)]);
}
function stats(values) {
  return { samples: values.length, p50Ms: pct(values, 0.5), p95Ms: pct(values, 0.95), maxMs: values.length ? round(Math.max(...values)) : null };
}
function itemName(item) {
  return typeof item.label === 'string' ? item.label : (item.label && item.label.label) || '';
}
function itemsOf(result) {
  return Array.isArray(result) ? result : result && Array.isArray(result.items) ? result.items : [];
}
function extensionByRole(role) {
  return vscode.extensions.all.find(ext =>
    role === 'helper' ? ext.packageJSON && ext.packageJSON.name === 'tuflow-helper'
      : ext.id.toLowerCase() === EXT_IDS[role]);
}
function atLine(document, lineText) {
  const lines = [];
  for (let i = 0; i < document.lineCount; ++i) {
    if (document.lineAt(i).text === lineText) lines.push(i);
  }
  if (lines.length !== 1) throw new Error('Expected a unique fixture line: ' + lineText);
  return lines[0];
}
function hoverText(hovers) {
  return (hovers || []).flatMap(hover => hover.contents || []).map(part =>
    typeof part === 'string' ? part : part.value || ''
  ).join('\n');
}

async function probeMetric(name, count, action, report) {
  for (let i = 0; i < 2; ++i) await action(); // warm-up, not sampled
  const samples = [];
  const before = { cpu: process.cpuUsage(), rss: process.memoryUsage().rss };
  for (let i = 0; i < count; ++i) {
    const start = performance.now();
    await action();
    samples.push(performance.now() - start);
  }
  const cpu = process.cpuUsage(before.cpu);
  report.metrics[name] = {
    ...stats(samples),
    cpuUserMs: round(cpu.user / 1000),
    cpuSystemMs: round(cpu.system / 1000),
    rssBeforeBytes: before.rss,
    rssAfterBytes: process.memoryUsage().rss
  };
}

module.exports.run = async function run() {
  const profileName = process.env.TUFLOW_ACCEPT_PROFILE || 'helper-only';
  const expected = PROFILES[profileName];
  if (!expected) throw new Error('Unknown TUFLOW_ACCEPT_PROFILE: ' + profileName);
  const report = {
    schemaVersion: 1,
    issue: 'Chain-Frost/tuflow-vscode#9',
    profile: profileName,
    phase: process.env.TUFLOW_ACCEPT_PHASE || 'unspecified',
    revision: process.env.TUFLOW_ACCEPT_REVISION || 'unrecorded',
    startedAt: new Date().toISOString(),
    environment: {
      platform: process.platform,
      arch: process.arch,
      vscodeVersion: vscode.version,
      nodeVersion: process.versions.node,
      cpuModel: os.cpus()[0] && os.cpus()[0].model,
      logicalCpus: os.cpus().length,
      machineMemoryBytes: os.totalmem(),
      extensionHostPid: process.pid,
      configuredRepeats: process.env.TUFLOW_ACCEPT_REPEATS || '12',
      configuredSyntheticLines: process.env.TUFLOW_ACCEPT_LINES || '10000',
      configuredDiagnosticSettleMs: process.env.TUFLOW_ACCEPT_SETTLE_MS || '1800',
      workspaceFolders: (vscode.workspace.workspaceFolders || []).map(folder => folder.uri.fsPath),
      networkFixtureRoot: process.env.TUFLOW_ACCEPT_NETWORK_FIXTURES || null
    },
    checks: [],
    metrics: {},
    extensions: {},
    diagnostics: [],
    manualChecks: [
      'TextMate scopes and theme-specific syntax rendering',
      'Snippet insertion and tab-stop expansion in editor',
      'seito-openfile cursor and context-menu behavior',
      'Error Lens decorations compared with Problems view',
      'Validator-owned formatting on opted-in settings',
      'UNC and GeoPackage layer resolution against actual Windows network datasets'
    ]
  };
  const check = (id, status, evidence) => {
    report.checks.push({ id, status, evidence });
    process.stdout.write('[acceptance] ' + status + ' ' + id + ': ' + JSON.stringify(evidence) + '\n');
  };
  const docs = {};
  try {
    for (const role of Object.keys(expected)) {
      const ext = extensionByRole(role);
      report.extensions[role] = ext ? { id: ext.id, version: ext.packageJSON.version, activeInitially: ext.isActive } : null;
      check('extension-' + role, Boolean(ext) === expected[role] ? 'pass' : 'fail',
        { expectedPresent: expected[role], actualPresent: Boolean(ext), id: ext && ext.id });
    }
    const filenames = [...new Set(MATRIX.cases.map(item => item.file))];
    for (const name of filenames) {
      const start = performance.now();
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(FIXTURES, name)));
      await vscode.window.showTextDocument(document, { preview: false, preserveFocus: false });
      docs[name] = document;
      if (!report.metrics.documentOpen) report.metrics.documentOpen = {};
      report.metrics.documentOpen[name] = { openAndShowMs: round(performance.now() - start), languageId: document.languageId };
      // No assumption that a file has been assigned only one language by co-installed extensions.
      check('language-' + name, document.languageId === 'tuflow' ? 'pass' : 'fail',
        { observed: document.languageId, expected: 'tuflow' });
    }
    await pause(Number(process.env.TUFLOW_ACCEPT_SETTLE_MS || '1800'));
    for (const role of Object.keys(expected)) {
      const ext = extensionByRole(role);
      if (ext) report.extensions[role].activeAfterOpen = ext.isActive;
      if (expected[role] && (role === 'helper' || role === 'validator')) {
        check('activated-' + role, ext && ext.isActive ? 'pass' : 'fail', { activeAfterOpening: ext && ext.isActive });
      }
    }
    const commands = await vscode.commands.getCommands(true);
    const legacyOpen = commands.includes('tuflow-helper.openFileUnderCursor');
    check('helper-no-duplicate-opener', legacyOpen ? 'fail' : 'pass', { legacyOpenCommandRegistered: legacyOpen });

    const probe = MATRIX.cases.find(c => c.id === 'tgc-gpkg');
    const document = docs[probe.file];
    const line = atLine(document, probe.line);
    const completionProbe = MATRIX.cases.find(c => c.id === 'tgc-partial');
    const completionDocument = docs[completionProbe.file];
    const completionPos = new vscode.Position(atLine(completionDocument, completionProbe.line), completionProbe.line.length);
    const hoverPos = new vscode.Position(line, probe.line.indexOf('GIS') + 1);
    const requestCompletions = () => vscode.commands.executeCommand('vscode.executeCompletionItemProvider', completionDocument.uri, completionPos);
    const requestHovers = () => vscode.commands.executeCommand('vscode.executeHoverProvider', document.uri, hoverPos);
    const completions = itemsOf(await requestCompletions());
    const names = completions.map(itemName);
    const text = hoverText(await requestHovers());
    if (expected.helper) {
      check('tgc-command-completion', names.some(name => name.toLowerCase() === 'read gis z shape') ? 'pass' : 'fail',
        { found: names.filter(name => name.toLowerCase().includes('gis z shape')).slice(0, 10), total: names.length });
      check('multiword-command-hover', text.toLowerCase().includes('read gis z shape') ? 'pass' : 'fail',
        { matched: text.toLowerCase().includes('read gis z shape'), excerpt: text.slice(0, 220) });
      const snippetCount = completions.filter(item => item.kind === vscode.CompletionItemKind.Snippet).length;
      check('snippet-provider-observation', 'unverified', { snippetCompletions: snippetCount, manualInsertionRequired: true });
    } else {
      check('helper-providers-absent', text.length || names.some(name => name.toLowerCase() === 'read gis z shape') ? 'fail' : 'pass',
        { hoverPresent: Boolean(text), specificCompletionPresent: names.some(name => name.toLowerCase() === 'read gis z shape') });
    }

    if (expected.helper) {
      // #5/#6: syntax-only file types must not inherit the global TGC command set.
      const tefCase = MATRIX.cases.find(c => c.id === 'tef-event');
      const tefDocument = docs[tefCase.file];
      const tefPosition = new vscode.Position(atLine(tefDocument, tefCase.line), tefCase.line.indexOf(' =='));
      const tefItems = itemsOf(await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', tefDocument.uri, tefPosition));
      const leakedTgc = tefItems.map(itemName).filter(name => name.toLowerCase() === 'read gis z shape');
      check('no-cross-file-command-leakage', leakedTgc.length ? 'fail' : 'pass',
        { tefCompletionCount: tefItems.length, leakedTgcCompletions: leakedTgc });

      // #6: command completions must be suppressed after an inline comment delimiter.
      const inline = MATRIX.cases.find(c => c.id === 'tgc-list');
      const inlineDocument = docs[inline.file];
      const inlinePosition = new vscode.Position(atLine(inlineDocument, inline.line), inline.line.length);
      const inlineItems = itemsOf(await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', inlineDocument.uri, inlinePosition));
      const universal = new Set(['ALL', 'NONE', 'AUTO', 'MANUAL', 'ON', 'OFF', 'TRUE', 'FALSE', 'YES', 'NO']);
      const leakedValues = inlineItems.map(itemName).filter(name => universal.has(name.toUpperCase()));
      check('no-generic-completions-in-comment', leakedValues.length ? 'fail' : 'pass',
        { leakedValues, completionCount: inlineItems.length });

      const valuePosition = new vscode.Position(line, probe.line.indexOf('==') + 3);
      const valueItems = itemsOf(await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', document.uri, valuePosition));
      const unrelatedValues = valueItems.map(itemName).filter(name => universal.has(name.toUpperCase()));
      check('no-universal-gis-values', unrelatedValues.length ? 'fail' : 'pass',
        { unrelatedValues, completionCount: valueItems.length });
    }

    const problems = [];
    for (const [filename, doc] of Object.entries(docs)) {
      for (const diag of vscode.languages.getDiagnostics(doc.uri)) {
        const item = {
          file: filename,
          line: diag.range.start.line + 1,
          start: diag.range.start.character,
          endLine: diag.range.end.line + 1,
          end: diag.range.end.character,
          severity: diag.severity,
          source: diag.source || null,
          message: diag.message
        };
        problems.push(item);
      }
    }
    report.diagnostics = problems;
    const keys = new Set();
    const duplicates = [];
    for (const entry of problems) {
      const key = [entry.file, entry.line, entry.start, entry.endLine, entry.end, entry.severity, entry.message].join('|');
      if (keys.has(key)) duplicates.push(entry);
      keys.add(key);
    }
    check('no-duplicate-problems', duplicates.length === 0 ? 'pass' : 'fail', { duplicateCount: duplicates.length, duplicates: duplicates.slice(0, 8) });
    const helperProblems = problems.filter(entry => /tuflow[\s-]*helper/i.test(entry.source || ''));
    check('helper-does-not-own-diagnostics', helperProblems.length === 0 ? 'pass' : 'fail', { helperDiagnosticCount: helperProblems.length });
    const hasProblemOn = id => {
      const entry = MATRIX.cases.find(c => c.id === id);
      const index = atLine(docs[entry.file], entry.line) + 1;
      return problems.filter(problem => problem.file === entry.file && problem.line === index);
    };
    if (expected.validator) {
      for (const id of ['tcf-missing-trd', 'tbc-missing-gis', 'tgc-gpkg', 'tgc-list']) {
        const diagnostics = hasProblemOn(id);
        check('validator-' + id, diagnostics.length ? 'pass' : 'fail',
          { count: diagnostics.length, sources: diagnostics.map(entry => entry.source) });
      }
      for (const id of ['tcf-macro', 'tbc-suppressed', 'tgc-macro-layer', 'tcf-unknown']) {
        const diagnostics = hasProblemOn(id);
        check('validator-' + id + '-ignored', diagnostics.length ? 'fail' : 'pass',
          { count: diagnostics.length });
      }
    } else {
      check('helper-alone-no-problems', problems.length === 0 ? 'pass' : 'fail', { count: problems.length });
    }
    const edits = await vscode.commands.executeCommand('vscode.executeFormatDocumentProvider',
      docs['model.tcf'].uri, { tabSize: 4, insertSpaces: true });
    check('format-provider-observation', 'unverified',
      { edits: Array.isArray(edits) ? edits.length : null, manualOwnershipCheckRequired: true });

    const iterations = Math.max(3, Math.min(50, Number(process.env.TUFLOW_ACCEPT_REPEATS || '12')));
    await probeMetric('completion', iterations, requestCompletions, report);
    await probeMetric('hover', iterations, requestHovers, report);
    // Comments in the synthetic file do not trigger model/GIS traversals. They exercise editor scaling.
    const syntheticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuflow-ux-'));
    try {
      const syntheticPath = path.join(syntheticDir, 'large-control.tcf');
      const lineCount = Math.max(1000, Math.min(50000, Number(process.env.TUFLOW_ACCEPT_LINES || '10000')));
      const longLines = ['Read GIS Z Shape == gis/not-a-solver-input.gpkg >> layer'];
      for (let i = 0; i < lineCount; ++i) longLines.push('! Fixture comment ' + i + ': no solver execution');
      fs.writeFileSync(syntheticPath, longLines.join('\n') + '\n', 'utf8');
      const start = performance.now();
      const largeDoc = await vscode.workspace.openTextDocument(vscode.Uri.file(syntheticPath));
      await vscode.window.showTextDocument(largeDoc, { preview: true });
      report.metrics.largeFile = { lineCount: largeDoc.lineCount, openAndShowMs: round(performance.now() - start) };
      await probeMetric('largeFileCompletion', iterations,
        () => vscode.commands.executeCommand('vscode.executeCompletionItemProvider', largeDoc.uri, new vscode.Position(0, 16)), report);
    } finally {
      try {
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        fs.rmSync(syntheticDir, { recursive: true, force: true });
      } catch (error) {
        check('synthetic-file-cleanup', 'unverified', { message: String(error) });
      }
    }

    const networkRoot = process.env.TUFLOW_ACCEPT_NETWORK_FIXTURES;
    if (networkRoot) {
      const networkPath = path.join(networkRoot, 'model.tcf');
      if (!path.isAbsolute(networkRoot) || !fs.existsSync(networkPath)) {
        check('network-fixture', 'blocked', { reason: 'Absolute network fixture folder with model.tcf not accessible', networkRoot });
      } else {
        const start = performance.now();
        const networkDoc = await vscode.workspace.openTextDocument(vscode.Uri.file(networkPath));
        await vscode.window.showTextDocument(networkDoc, { preview: true });
        report.metrics.networkFile = { path: networkPath, openAndShowMs: round(performance.now() - start), languageId: networkDoc.languageId };
        if (networkDoc.lineCount > 1) {
          const networkCharacter = networkDoc.lineAt(1).text.indexOf(' ==');
          if (networkCharacter >= 0) {
            const networkPosition = new vscode.Position(1, networkCharacter);
            await probeMetric('networkCompletion', iterations,
              () => vscode.commands.executeCommand('vscode.executeCompletionItemProvider', networkDoc.uri, networkPosition), report);
          }
        }
        await pause(Number(process.env.TUFLOW_ACCEPT_SETTLE_MS || '1800'));
        report.metrics.networkFile.diagnosticsAfterSettle = vscode.languages.getDiagnostics(networkDoc.uri).length;
        check('network-fixture', 'unverified', { reason: 'Read-only response and diagnostic observations captured; manual UNC/path checks remain necessary' });
      }
    } else {
      check('network-fixture', 'blocked', { reason: 'TUFLOW_ACCEPT_NETWORK_FIXTURES not provided' });
    }
    check('theme-and-ui-checks', 'unverified', { manualChecks: report.manualChecks });
  } catch (error) {
    check('harness-execution', 'fail', { message: String(error && error.stack || error) });
  } finally {
    report.finishedAt = new Date().toISOString();
    report.summary = Object.fromEntries(['pass', 'fail', 'blocked', 'unverified'].map(
      status => [status, report.checks.filter(item => item.status === status).length]));
    const destination = process.env.TUFLOW_ACCEPT_OUTPUT ||
      path.join(os.tmpdir(), 'tuflow-acceptance-' + profileName + '-' + Date.now() + '.json');
    fs.mkdirSync(path.dirname(path.resolve(destination)), { recursive: true });
    fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n', 'utf8');
    process.stdout.write('[acceptance] report: ' + destination + '\n');
  }
  if (report.summary.fail) throw new Error(report.summary.fail + ' acceptance checks failed; see report. Blocked/unverified checks are not passes.');
};
