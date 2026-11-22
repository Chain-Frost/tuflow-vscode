import assert from 'node:assert/strict';
import fs from 'node:fs';

if (process.argv.length !== 4) {
  console.error('Usage: node test/acceptance/compare-reports.mjs baseline.json post-change.json');
  process.exit(2);
}
const [base, after] = process.argv.slice(2).map(filename => JSON.parse(fs.readFileSync(filename, 'utf8')));
assert.equal(base.schemaVersion, 1);
assert.equal(after.schemaVersion, 1);
assert.equal(base.profile, after.profile, 'Only compare identical installed-extension profiles');

const fields = ['platform', 'arch', 'vscodeVersion', 'cpuModel', 'logicalCpus', 'machineMemoryBytes'];
const environmentDiffs = fields.filter(field => base.environment[field] !== after.environment[field]);
const versions = ['helper', 'validator', 'opener', 'lens'].filter(role =>
  (base.extensions[role] && base.extensions[role].version) !==
  (after.extensions[role] && after.extensions[role].version)
);
function format(value, unit = '') {
  return typeof value === 'number' ? value.toFixed(2) + unit : 'not measured';
}
function change(before, later) {
  return typeof before === 'number' && typeof later === 'number' && before !== 0
    ? ((later - before) * 100 / before).toFixed(1) + '%'
    : 'not comparable';
}
console.log('# TUFLOW UX acceptance comparison: ' + base.profile);
console.log('');
console.log('Baseline: ' + base.phase + ' / ' + base.revision + ' / ' + base.startedAt);
console.log('After: ' + after.phase + ' / ' + after.revision + ' / ' + after.startedAt);
console.log('');
console.log('Environment differences: ' + (environmentDiffs.join(', ') || 'none detected'));
console.log('Installed extension version changes: ' + (versions.join(', ') || 'none detected'));
console.log('Different platforms/VS Code versions/extension versions can invalidate attribution.');
console.log('');
console.log('| Metric | Baseline | After | Change |');
console.log('|---|---:|---:|---:|');
for (const key of ['completion', 'hover', 'largeFileCompletion']) {
  for (const statistic of ['p50Ms', 'p95Ms']) {
    const a = base.metrics[key] && base.metrics[key][statistic];
    const b = after.metrics[key] && after.metrics[key][statistic];
    console.log('| ' + key + ' ' + statistic + ' | ' + format(a, ' ms') + ' | ' +
      format(b, ' ms') + ' | ' + change(a, b) + ' |');
  }
  for (const statistic of ['cpuUserMs', 'cpuSystemMs']) {
    const a = base.metrics[key] && base.metrics[key][statistic];
    const b = after.metrics[key] && after.metrics[key][statistic];
    console.log('| ' + key + ' ' + statistic + ' | ' + format(a, ' ms') + ' | ' +
      format(b, ' ms') + ' | ' + change(a, b) + ' |');
  }
}
for (const key of ['documentOpen', 'largeFile', 'networkFile']) {
  const a = key === 'documentOpen' ? base.metrics.documentOpen && base.metrics.documentOpen['model.tcf']?.openAndShowMs
    : base.metrics[key]?.openAndShowMs;
  const b = key === 'documentOpen' ? after.metrics.documentOpen && after.metrics.documentOpen['model.tcf']?.openAndShowMs
    : after.metrics[key]?.openAndShowMs;
  console.log('| ' + key + ' open/show | ' + format(a, ' ms') + ' | ' + format(b, ' ms') +
    ' | ' + change(a, b) + ' |');
}
console.log('');
console.log('Check totals: baseline ' + JSON.stringify(base.summary) + ' ; after ' + JSON.stringify(after.summary));
console.log('**Timing and resource deltas are observations, not pass/fail criteria.** Inspect raw JSON,');
console.log('Windows/UNC measurements and any changed extensions before attributing a regression.');
