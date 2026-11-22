# Development, CI and local VSIX packaging

This repository builds the TUFLOW Helper VS Code extension. The project does not
require a TUFLOW executable or model installation for its test suite.

## Requirements

- Node.js 22.x and npm 10 or later (VSIX tooling)
- Network access for `npm ci`, the pinned CLI tools and the VS Code test download
- VS Code 1.147.0 is downloaded by the Extension Host test runner when required
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
`npm run test:extension`. The unit runner discovers Node pure-logic tests in
`test/` (except `test/extension/` and fixtures) and compiled `out/test/`.
This includes tests added by parallel feature workstreams without listing files
in the package scripts. The Extension Host tests cover activation, command
registration, language associations, completion and contributed resources.
The tests do not invoke TUFLOW.

## Packaging and installation

`npm run package:vsix` compiles the extension and produces
`tuflow-helper.vsix`; it then inspects the ZIP archive's central directory,
reads the packaged manifest and verifies the compiled runtime, language
configuration, grammar, snippets, icon and documentation are present.
It rejects test sources, build maps and unrelated development assets, and
reports the VSIX size. A separate `npm run test:vsix` installs that VSIX into
the VS Code test profile and repeats the Extension Host tests against the
installed package rather than the development checkout.

The captured documentation under `doc/` is retained while the extension still
references those paths. The VSIX checker requires those assets if it detects
such references in the packaged runtime. Removing them requires the separate
documentation workstream to replace the runtime references first.

To manually verify the installed package:

1. Open a clean VS Code profile or an Extension Development Host.
2. Run **Extensions: Install from VSIX...** and select `tuflow-helper.vsix`.
3. Open a `.tcf`, `.qcf` and `.toc` file; confirm the **TUFLOW** language.
4. Type `Cell` in a `.tcf`; confirm a **Cell Size** completion is offered.
5. Inspect the extension's commands and verify **Open Documentation** is available.

VS Code testing and packaging tools are pinned as development dependencies
in `package.json` and resolved from the committed `package-lock.json`.
All local and CI commands use `npm ci` for reproducibility.

### Failure-propagation verification

`npm run test:fail-closed` temporarily adds a deliberately invalid TypeScript
source and a deliberately failing Node unit test. It confirms that the normal
`npm run compile` and `npm run test:unit` commands return failure and report
the injected error. Temporary source, test and compiled files are removed in
`finally` blocks. CI runs this verification on Linux and Windows before the
normal full test suite; a failure in detection or cleanup fails the job.

## CI

The pull-request and `master` workflows run locked installation, compilation,
linting, failure-propagation checks and tests on Ubuntu and Windows. **Both
platforms** package and audit a VSIX and run an additional Extension Host smoke
test against the installed package. Ubuntu retains its VSIX as a workflow
artifact for optional manual installation. A broken compile,
unit test, Extension Host test or package check fails the job.

**Packaging is not publishing.** This workflow does not push tags, merge code,
release artifacts, or publish to the VS Code Marketplace or Open VSX.
