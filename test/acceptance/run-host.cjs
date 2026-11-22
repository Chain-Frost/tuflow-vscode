'use strict';

// Runs the real VS Code Extension Host against pinned source-built VSIX files.
// Called from CI with @vscode/test-electron installed in NODE_PATH.
// This script installs nothing globally, runs no solver, and writes JSON only.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const {
  downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests
} = require('@vscode/test-electron');

const [helperArg, validatorArg, acceptanceArg] = process.argv.slice(2);
if (!helperArg || !validatorArg || !acceptanceArg) {
  throw new Error('Usage: node run-host.cjs helper.vsix validator.vsix acceptance-checkout');
}
const helper = path.resolve(helperArg);
const validator = path.resolve(validatorArg);
const acceptance = path.resolve(acceptanceArg);
const fixtures = path.join(acceptance, 'test', 'acceptance', 'fixtures');
const runner = path.join(acceptance, 'test', 'acceptance', 'vscode-runner.cjs');
const outputDir = path.resolve(process.env.TUFLOW_ACCEPT_ARTIFACTS || 'acceptance-host-reports');
const knownBaselineFailures = new Set([
  'multiword-command-hover',
  'no-cross-file-command-leakage',
  'no-generic-completions-in-comment',
  'no-universal-gis-values'
]);
const profiles = [
  {name: 'validator-only', extensions: [validator]},
  {name: 'helper-only', extensions: [helper]},
  {name: 'combined', extensions: [helper, validator]},
  {name: 'full', extensions: [
    helper, validator, 'Fr43nk.seito-openfile', 'usernamehw.errorlens'
  ]}
];
function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function save(filename, object) {
  fs.mkdirSync(outputDir, {recursive: true});
  fs.writeFileSync(path.join(outputDir, filename), JSON.stringify(object, null, 2) + '\n');
}
function install(cli, prefix, profile, target, user, extensions) {
  const processArgs = [...prefix, '--user-data-dir', user,
    '--extensions-dir', extensions, '--install-extension', target, '--force'];
  const result = cp.spawnSync(cli, processArgs, {
    encoding: 'utf8', timeout: 180000,
    env: {...process.env, ELECTRON_RUN_AS_NODE: ''},
    shell: process.platform === 'win32'
  });
  console.log('[install ' + profile + '] ' + path.basename(target) +
    ' status=' + result.status + '\n' +
    (result.stdout || '').slice(-500) + '\n' + (result.stderr || '').slice(-500));
  if (result.status !== 0) {
    throw new Error('Unable to install ' + target + ': ' +
      (result.error || result.stderr || result.stdout || result.status));
  }
}
async function main() {
  if (![helper, validator, runner, path.join(fixtures, 'model.tcf')]
    .every(file => fs.existsSync(file))) throw new Error('Missing test input');
  fs.mkdirSync(outputDir, {recursive: true});
  const installDir = path.join(outputDir, 'installed-profiles');
  const driver = path.join(outputDir, 'test-driver');
  fs.mkdirSync(driver, {recursive: true});
  fs.writeFileSync(path.join(driver, 'package.json'), JSON.stringify({
    name: 'tuflow-acceptance-host', publisher: 'local-test',
    version: '0.0.0', engines: {vscode: '^1.74.0'},
    main: './extension.js'
  }));
  fs.writeFileSync(path.join(driver, 'extension.js'), 'exports.activate = () => {};\n');
  const executable = await downloadAndUnzipVSCode();
  const [cli, ...cliPrefix] = resolveCliArgsFromVSCodeExecutablePath(
    executable, {reuseMachineInstall: true});
  const summary = {
    schemaVersion: 1, timestamp: new Date().toISOString(),
    platform: process.platform, arch: process.arch, node: process.version,
    vscodeExecutable: executable,
    pinnedSourceSHAs: {
      helper: process.env.TUFLOW_HOST_HELPER_SHA,
      validator: process.env.TUFLOW_HOST_VALIDATOR_SHA,
      acceptance: process.env.TUFLOW_HOST_ACCEPTANCE_SHA
    },
    vsixSha256: {helper: sha256(helper), validator: sha256(validator)},
    profiles: []
  };
  let unexpectedFailures = 0;
  for (const profile of profiles) {
    const base = path.join(installDir, profile.name);
    fs.rmSync(base, {recursive: true, force: true});
    const user = path.join(base, 'user');
    const extensions = path.join(base, 'extensions');
    fs.mkdirSync(path.join(user, 'User'), {recursive: true});
    fs.mkdirSync(extensions, {recursive: true});
    fs.writeFileSync(path.join(user, 'User', 'settings.json'), JSON.stringify({
      'tuflowValidator.diagnosticLevel': 'hint',
      'tuflowValidator.enableIfStatementChecks': true,
      'tuflowValidator.enableLatestVersionChecks': true,
      'tuflowValidator.enableIfStatementFormatting': false
    }));
    const reportFile = path.join(outputDir, 'host-' + profile.name + '.json');
    let runError = null;
    try {
      for (const target of profile.extensions) {
        install(cli, cliPrefix, profile.name, target, user, extensions);
      }
      await runTests({
        vscodeExecutablePath: executable,
        reuseMachineInstall: true,
        extensionDevelopmentPath: driver,
        extensionTestsPath: runner,
        launchArgs: [fixtures,
          '--user-data-dir', user, '--extensions-dir', extensions,
          '--disable-gpu', '--no-sandbox'],
        extensionTestsEnv: {
          TUFLOW_ACCEPT_PROFILE: profile.name,
          TUFLOW_ACCEPT_PHASE: 'pinned-preintegration-linux-windows',
          TUFLOW_ACCEPT_REVISION: process.env.TUFLOW_HOST_HELPER_SHA || 'unrecorded',
          TUFLOW_ACCEPT_OUTPUT: reportFile,
          TUFLOW_ACCEPT_REPEATS: '5',
          TUFLOW_ACCEPT_LINES: '1000',
          TUFLOW_ACCEPT_SETTLE_MS: '1500'
        }
      });
    } catch (error) {
      runError = String(error);
      console.log('[host ' + profile.name + '] ' + runError);
    }
    const report = fs.existsSync(reportFile) ?
      JSON.parse(fs.readFileSync(reportFile, 'utf8')) : null;
    const failures = (report?.checks || [])
      .filter(item => item.status === 'fail').map(item => item.id);
    const known = failures.filter(id => knownBaselineFailures.has(id));
    const unexpected = failures.filter(id => !knownBaselineFailures.has(id));
    if (!report || unexpected.length || (runError && !failures.length)) unexpectedFailures++;
    const result = {
      profile: profile.name, reportRecorded: Boolean(report),
      hostVscodeVersion: report?.environment?.vscodeVersion || null,
      installed: report?.extensions || null,
      failedChecks: failures, knownBaselineFailures: known,
      unexpectedFailures: unexpected,
      blocked: (report?.checks || []).filter(item => item.status === 'blocked').map(item => item.id),
      runError, reportFile: report ? path.basename(reportFile) : null
    };
    summary.profiles.push(result);
    console.log('[result] ' + JSON.stringify(result));
    // Keep existing reports intact for independent review.
    save('summary.json', summary);
  }
  save('summary.json', {...summary, unexpectedFailures});
  console.log('[acceptance] unexpected failures: ' + unexpectedFailures);
  // Known #12 Helper failures are recorded, not passed. Other failures
  // indicate a harness regression or newly discovered integration defect.
  if (unexpectedFailures) process.exitCode = 1;
}
main().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
