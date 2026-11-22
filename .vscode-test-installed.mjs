import { resolve } from 'node:path';

// Use a harmless test host extension as the development extension so tests
// exercise the installed VSIX and cannot accidentally pass using this checkout.
export default {
  version: '1.147.0',
  files: 'test/extension/**/*.test.cjs',
  extensionDevelopmentPath: 'test/fixtures/host',
  installExtensions: [resolve('tuflow-helper.vsix')],
  // Separate profiles prevent previously installed test extensions leaking.
  launchArgs: [
    '--user-data-dir=' + resolve('.vscode-test/coexist/helper-only/user'),
    '--extensions-dir=' + resolve('.vscode-test/coexist/helper-only/extensions')
  ],
  env: {
    TUFLOW_TEST_INSTALLED: '1',
    TUFLOW_TEST_COEXIST_MODE: 'helper-only',
    TUFLOW_TEST_COEXIST_EVIDENCE: resolve('coexist-evidence/helper-only.json'),
    TUFLOW_TEST_SOURCE_SHA: process.env.GITHUB_HEAD_SHA || 'unrecorded'
  },
  mocha: { timeout: 30000 }
};
