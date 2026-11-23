import { resolve } from 'node:path';

// Use a harmless test host extension as the development extension so tests
// exercise the installed VSIX and cannot accidentally pass using this checkout.
export default {
  version: '1.147.0',
  files: 'test/extension/**/*.test.cjs',
  extensionDevelopmentPath: 'test/fixtures/host',
  installExtensions: [resolve('tuflow-helper.vsix')],
  env: { TUFLOW_TEST_INSTALLED: '1' },
  mocha: { timeout: 30000 }
};
