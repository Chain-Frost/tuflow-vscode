# TUFLOW VS Code extensions — agent handoff (22 November 2026)

## Repositories and boundaries

- [Chain-Frost/tuflow-vscode](https://github.com/Chain-Frost/tuflow-vscode) ("TUFLOW Helper"): syntax highlighting, command catalogue, completions, hover, signature help, snippets and documentation.
- [Chain-Frost/tuflow_validator](https://github.com/Chain-Frost/tuflow_validator) ("TUFLOW Path Validator"): file/path diagnostics, input references, recursive dependencies, versioned references, blocks/conditionals and optional formatting; GeoPackage layer checking is already in [draft PR #9](https://github.com/Chain-Frost/tuflow_validator/pull/9). VS Code Error Lens displays those diagnostics.
- [seito-openfile](https://marketplace.visualstudio.com/items?itemName=Fr43nk.seito-openfile): file opening under cursor.

Do **not** duplicate file opening, file existence/path checking, existing Path Validator diagnostics/formatting or GeoPackage layer validation in Helper. Do not implement a TUFLOW release/version-selection UI, model-run integration or QGIS integration.

The two extensions currently declare different VS Code language IDs (`tuflow-helper` vs `tuflow`); investigate their co-installation before changing associations.

## Agent issues on TUFLOW Helper

| Agent | Issue | Deliverable | Dependency / overlap |
| --- | --- | --- | --- |
| A | [#1](https://github.com/Chain-Frost/tuflow-vscode/issues/1) | Co-installation/language IDs; retire duplicate file opener | Coordinate package.json with B, extension.ts with F |
| B | [#2](https://github.com/Chain-Frost/tuflow-vscode/issues/2) | CI, tests, reproducible VSIX packaging | Independent start; coordinate package.json with A, assets with H |
| C | [#3](https://github.com/Chain-Frost/tuflow-vscode/issues/3) | Typed command catalogue and lightweight line parser | Start immediately; foundation for D/E/F/H |
| D | [#4](https://github.com/Chain-Frost/tuflow-vscode/issues/4) | TCF/TGC command-data audit and corrections | Independent evidence collection; implementation stacks on C |
| E | [#5](https://github.com/Chain-Frost/tuflow-vscode/issues/5) | TBC/ECF/TRFC/QCF audit and file-type completion coverage | Independent evidence collection; implementation stacks on C |
| F | [#6](https://github.com/Chain-Frost/tuflow-vscode/issues/6) | Completion, hover, signature-help repairs | Stack on C and integrate verified D/E data |
| G | [#7](https://github.com/Chain-Frost/tuflow-vscode/issues/7) | TextMate grammar and on-type editor configuration | Coordinate with A/C; do not duplicate Validator formatter |
| H | [#8](https://github.com/Chain-Frost/tuflow-vscode/issues/8) | Documentation, curated snippets, README refinements | Preserve the companion-plugin recommendations in this docs PR |
| I | [#9](https://github.com/Chain-Frost/tuflow-vscode/issues/9) | Integration and performance acceptance | Fixtures may start immediately; final acceptance after A–H |

## Workflow

1. Agents work on separate branches, not directly on `master`. Opening draft PRs is preferred; **do not merge, tag, release or publish** until integration review.
2. Use narrow, stackable PRs and explicitly record the base PR/branch for dependencies. Never cherry-pick broad changes into an unrelated workstream.
3. Audit command and example validity against official TUFLOW reference material. An unlisted command is **unknown**, not automatically invalid; avoid false errors or speculatively rejecting old syntax.
4. Use tests to establish that Helper and Validator can be installed together; verify both the actual `document.languageId` and the features running for that document.
5. Keep path validation and solver-runtime scenario/event inference in Validator. Helper's line parser only supports editor semantics.
6. Correctness and low false-positive rates take priority over adding more completions.
7. Preserve other agents' changes and record open questions and any benchmark/testing limitations in the PR.

## PR–issue linking policy

When a PR implements work tracked by a GitHub issue, **link the issue in the PR body by default**.

- **Complete resolution:** use `Closes #123`, `Fixes #123` or `Resolves #123` in the description when the PR satisfies *all* relevant issue acceptance criteria and is intended to close it. GitHub normally auto-closes a linked issue when that PR is **merged into the repository's default branch**; merely closing an unmerged PR does not close the issue.
- **Partial / investigation / stacked work:** use `Refs #123` or `Related to #123` and explain what is outstanding. Do **not** claim to close the issue prematurely. Identify which final integration PR will use `Closes #123` once every criterion is met.
- **Multiple issues:** include a separate closing keyword for each genuinely completed issue; do not close issues incidentally because they were referenced.
- **Existing scope vs follow-up:** if an issue includes future follow-up work, either leave it open with `Refs` or explicitly agree to split the remaining work into a new tracked issue before closing it.
- **Cross-repository issues:** use full `owner/repo#number` references and ensure the closing behavior is supported for that repository; otherwise use an ordinary reference and update the owning issue deliberately.

Every PR should include the relevant issue links, acceptance status, test evidence and remaining work. This also applies to the Path Validator review and implementation workstreams.

## Independent validator review

Copy the [Path Validator review-agent prompt](validator-review-prompt.md). It reviews the existing validator code, open issues and draft PR #9, and identifies only additional work after checking overlap.

## Documentation update

This branch also adds [README recommendations](../../README.md#recommended-companion-vs-code-extensions) for seito-openfile, TUFLOW Path Validator and Error Lens. The follow-on documentation scope should retain these URLs and descriptions.
