# Issue #9 — baseline acceptance evidence

Recorded: **2026-11-22**. Target: `Chain-Frost/tuflow-vscode` on `master` at `66de0c4ff392e24055b9e278a4fba988fa276409` (parent of this workstream). No VS Code Extension Development Host or representative Windows UNC model was available in this execution environment. No performance values are claimed.

| Concern | Baseline evidence | Classification | Owning workstream |
|---|---|---|---|
| Co-install language ID | Helper's `package.json` registers `tuflow-helper`; Path Validator's manifest registers `tuflow` for shared extensions | **Confirmed structural conflict**; real co-install test blocked | #1 |
| Duplicate file opening | Helper `src/extension.ts` registers `tuflow-helper.openFileUnderCursor`, with matching command/menu contributions in `package.json` | **Confirmed duplicate ownership** | #1 |
| Multiword hover | Helper uses `document.getWordRangeAtPosition` and searches against full command name | **Confirmed implementation risk**; editor behavior not measured | #6 |
| Command/argument completion | Existing implementation provides generic values after `==`; missing file categories fall back to all commands | **Confirmed design deficiency**; changes in #3/#5/#6 not yet assessed | #3, #5, #6 |
| Manual/TextMate syntax | Existing grammar has a long global word matcher | **Review required**; no TextMate token captures run | #7 |
| Multiple diagnostic sources | Helper's current code registers no diagnostic collection; Validator owns diagnostics; Error Lens decorates | **Code-inspection only**, not a runtime duplicate-Problems pass | #1, Validator |
| Build and package verification | Current `package.json` has no functioning, tracked VS Code test harness baseline | **Blocked pending #2** | #2 |
| Completion/hover timings and memory/CPU | No Windows extension-host benchmark performed | **Unverified; no numerical results** | #6, #9 |
| UNC/network behavior | No mounted Windows share or network test model provided | **Blocked** | Validator, #9 |
| GeoPackage selector/layer | Text fixture includes `>>` selectors; no real GeoPackage included | **Selector text covered; actual layer checks blocked** | Validator |
| Combined and four-extension UI | No test-host instances with all required extensions executed yet | **Blocked** | #1–#9 |
| PRs #1–#8 post-change regression | Workstreams are dependencies, not assumed integrated | **Blocked until PR heads are ready** | #1–#8 |

## What this PR adds

The control-file fixture matrix, self-contained Node fixture consistency checker, VS Code test-host runner, comparison utility, and reproducible four-profile runbook. These are **test assets**, not new diagnostics or feature implementations.

## Pending acceptance sign-off

- [ ] Run fixture checker on a current local clone and record its actual output.
- [ ] Run four isolated extension-host profiles; attach raw JSON reports.
- [ ] Run manual editor checks, including theme/scopes, snippets, Error Lens, seito-openfile and opt-in formatting.
- [ ] Repeat after PRs #1–#8, record base/head SHA and extension versions.
- [ ] Run cold/warm and optional Windows/UNC benchmarks with identified hardware and model sizes.
- [ ] Post actionable regressions on owning PRs, not an ungrounded pass declaration.
- [ ] Obtain independent review of this report and harness before approving the final integration.

No merges, releases, or Marketplace publishing.
