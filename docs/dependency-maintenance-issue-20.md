# Issue #20 — development dependency and VS Code compatibility qualification

## Scope and policy

- Keep `engines.vscode: ^1.74.0`. The TUFLOW Helper extension host must work under both VS Code **1.74.3** (minimum-family representative) and **1.147.0** (current stable, 23 November 2026).
- Use **Node.js 24** for npm, compilation, linting, packaging and primary CI. The Node version installed by `actions/setup-node` is **not** the Node runtime inside either VS Code extension host.
- Keep `@types/vscode` **exactly 1.74.0** and `@types/node` **16.x**: this prevents development-time types from silently blessing APIs unavailable on the minimum supported extension host. Keep TypeScript output at ES2020/CommonJS and do not change extension activation or package identity.
- This branch updates development/test-only dependencies. There are no production `dependencies` in `package.json`, and the VSIX verification script excludes `node_modules`, source and test assets. **This does not mean the dev-toolchain vulnerabilities are irrelevant to CI or packaging security.**
- Upgrade TypeScript to 5.9.3, the paired TypeScript ESLint packages to 8.73.0, ESLint to 9.39.2 with its flat configuration, and `@vscode/vsce` to 4.1.1. The existing `@vscode/test-cli` 0.0.15 and `@vscode/test-electron` 3.1.0 are already current and are retained.
- Retain four VS Code test configurations, selecting the host version through `TUFLOW_TEST_VSCODE_VERSION`; run both pinned versions on Linux and Windows including installed-VSIX checks.

## Vulnerability audit and acceptance evidence

The prior locked Node 22 CI run recorded **14 advisories** (1 low, 7 moderate, 6 high) in the development toolchain. That historical count is not a claim about the updated graph.

After regenerating `package-lock.json`, run:

```sh
npm ci
npm audit --json > npm-audit-issue20.json
npm audit --omit=dev --json
npm run compile
npm run lint
npm run test:unit
npm run test:fail-closed
npm run package:vsix
```

The audit command can exit nonzero when advisories are found. Record exact vulnerable packages, direct/transitive introduction paths, production/development exposure, patched ranges and justified exceptions; do not blanket-dismiss all advisories or run `npm audit fix --force`.

Final acceptance requires an npm-generated consistent lockfile, all source/installed-VSIX tests passing in both extension hosts on both operating systems, complete current audit results and independent Codex review. The review should include regressions from the ESLint migration and older VS Code hosts. **Do not merge until those gates pass.**

No tag, Marketplace publisher change, release, publication, or Path Validator modification is authorised.
