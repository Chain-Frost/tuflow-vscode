// The CLI is pinned by the npm script; keep this config dependency-free.
export default {
  files: 'test/extension/**/*.test.cjs',
  mocha: { timeout: 30000 }
};
