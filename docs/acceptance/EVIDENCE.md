# Issue #9 — executed acceptance evidence ledger

This supplements [the initial baseline](BASELINE.md) and [runbook](README.md). Do not treat fixture-only CI or partial Extension Host results as full issue #9 acceptance.

## 2026-11-22: first real Linux Extension Host run

**Provenance:** [Validator PR #19](https://github.com/Chain-Frost/tuflow_validator/pull/19), [run 45038562609](https://github.com/Chain-Frost/tuflow_validator/actions/runs/45038562609), artifact `issue10-vsix-host-evidence-linux`. The Validator workflow copied and instrumented the *unmodified original* acceptance runner from Helper PR #16; full source/VSIX hashes are in its JSON evidence.

- VS Code **1.147.0 on Linux**; isolated test profiles.
- Helper PR #12: `8a3411f528e33e7f227d72ca8b5ad41172fefdb4`, `lmillard79.tuflow-helper@0.8.2`.
- Validator main: `4a0282e93b979345374076fb0adc60c7faf6af99`, `Chain-Frost.tuflow-path-validator@0.2.6`.
- Helper PR #16 acceptance source: `3f68375b448ce26bf9d369fda9f3b3e05049ba27`.
- Four-extension installation also had seito-openfile **2.3.3** and Error Lens **3.30.0**.

### Verified on that tested Linux configuration

- `.tcf/.tgc/.tbc/.ecf/.tef/.trd/.qcf` documents used `tuflow` language ID.
- Helper and Validator activated, with no duplicate Problems entries or Helper diagnostic sources; obsolete Helper open-file command was absent.
- TGC `Read GIS Z Shape` completion was available; tested Validator numeric/path and Quick Fix checks passed.
- The third-party extensions installed and activated. Their **manual** cursor-navigation and visual-decoration behaviour were **not** verified.

### Four Helper acceptance failures on the unintegrated #12 head

| Runner case ID | Observed | Owner |
|---|---|---|
| `multiword-command-hover` | Empty hover for `Read GIS Z Shape` | #6 |
| `no-cross-file-command-leakage` | TEF suggests TGC commands | #5 / #6 |
| `no-generic-completions-in-comment` | Generic values inside inline comments | #6 |
| `no-universal-gis-values` | Generic values offered for GIS path operand | #6 |

Details are in [the PR #12 evidence comment](https://github.com/Chain-Frost/tuflow-vscode/pull/12#issuecomment-7081389849). **Do not attribute these failures to the Validator or assume they persist after the #3/#5/#6 feature stack is integrated and retested.**

## Still blocked or unverified

- [ ] Independent code review of PR #16 and resolution of findings.
- [ ] Rerun the four profiles against a documented integration of **all relevant Helper PRs #1–#8**, using exact commit/VSIX SHA-256 identities.
- [ ] Baseline and post-integration cold/warm open/activation, completion/hover p50/p95, CPU/RSS, and large-file responsiveness.
- [ ] Manual syntax, snippet expansion, seito-openfile path opening, Error Lens decorations and opt-in formatting.
- [ ] Representative **Windows** local and UNC/mapped-drive tests, including genuine GeoPackage selectors/layers where a safe read-only dataset is available.
- [ ] Confirm Helper adds no redundant filesystem probes, diagnostics, formatter, file opener or model-run integration.
- [ ] Record and assign observed regressions to their owning PRs; retain the issue open.

No merge, issue closure, release or publication is implied by this evidence.
