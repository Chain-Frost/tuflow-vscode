# Development, CI and local VSIX packaging

This repository builds the TUFLOW Helper VS Code extension. The project does not
require a TUFLOW executable or model installation for its test suite.

## Requirements

- Node.js 22.x and npm 10 or later (VSIX tooling)
- Network access for `npm ci`, the pinned CLI tools and the VS Code test download
- VS Code is downloaded by the Extension Host test runner when required
- Headless Linux: `xvfb-run` for Extension Host tests

## From a fresh clone

```sh
npm ci
npm run compile
npm run lint
npm test
npm run package:vsix
```

`npm test` compiles, lints, runs Node's built-in pure-logic tests and launches a
real VS Code Extension Host for smoke tests. On headless Linux:

```sh
xvfb-run -a npm test
```

To run suites independently, use `npm run test:unit` or
`npm run test:extension`. The Extension Host tests cover activation, command
registration, language associations, completion and contributed resources.
The tests do not invoke TUFLOW.

## Packaging and installation

`npm run package:vsix` compiles the extension and produces
`tuflow-helper.vsix`; it then inspects the ZIP archive's central directory,
reads the packaged manifest and verifies the compiled runtime, language
configuration, grammar, snippets, icon and documentation are present.
It rejects test sources, build maps and unrelated development assets, and
reports the VSIX size.

The captured documentation under `doc/` is deliberately retained because the
existing documentation command references these paths. Its removal must be
coordinated with the separate documentation workstream.

To manually verify the installed package:

1. Open a clean VS Code profile or an Extension Development Host.
2. Run **Extensions: Install from VSIX...** and select `tuflow-helper.vsix`.
3. Open a `.tcf`, `.qcf` and `.toc` file; confirm the **TUFLOW** language.
4. Type `Cell` in a `.tcf`; confirm a **Cell Size** completion is offered.
5. Inspect the extension's commands and verify **Open Documentation** is available.

The CLI tools are pinned by exact version in `package.json` scripts. They are
obtained transiently by `npm exec --package` so the existing package lock
does not need a large, unrelated dev-dependency upgrade. The core TypeScript
toolchain remains locked by `package-lock.json`.

## CI

The pull-request and `master` workflows run locked installation, compilation,
linting and tests on Ubuntu and Windows. Ubuntu also packages and verifies a
VSIX, retained as a workflow artifact for manual installation. A broken compile,
unit test, Extension Host test or package check fails the job.

**Packaging is not publishing.** This workflow does not push tags, merge code,
release artifacts, or publish to the VS Code Marketplace or Open VSX.
