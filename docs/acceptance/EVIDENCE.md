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


## Independent review of PR #16

Codex completed a review of the original acceptance runner at `3f68375b448ce26bf9d369fda9f3b3e05049ba27` and identified **four valid harness defects** (not production TUFLOW defects). These are the remediation targets:

1. Positives were satisfied by unrelated diagnostics, including incomplete two-file path lists.
2. Recursion was not tested independently of editor-opening the nested TRD.
3. Inline-comment completion checks missed command labels that were not universal values.
4. Total CPU durations were compared without accounting for differing sample counts.

The acceptance branch now uses exact Validator source `TUFLOW Path Validator` and code `TPV001` with a complete expected-path multiset, checks `TPV002` parent summaries and `TPV001` nested references **before the TRD is opened independently**, includes command-completion leakage checks and compares CPU milliseconds **per measured call**. The nested TRD's existing reference was changed to `include/leaf.trd`, because the Validator's include traversal resolves it against the source TCF directory, not the TRD directory. The indexed case ID is unchanged.

Tests in `assertions.test.cjs` and `compare-reports.test.cjs` specifically exercise these false-positive conditions on both CI platforms.

The review must be repeated on the resulting head after CI; an earlier review receipt with findings is **not an approval**.


## 2026-11-22: independent Linux and Windows Extension Host evidence

A dedicated, reproducible workflow now packages the pinned Helper #12 and
Validator main source SHAs into separate VSIX artifacts and executes all four
profiles on **both Linux and native Windows GitHub-hosted runners**.

- [Workflow run 45041718254](https://github.com/Chain-Frost/tuflow-vscode/actions/runs/45041718254), artifact names
  `tuflow-acceptance-ubuntu-latest-pinned-baseline` and
  `tuflow-acceptance-windows-latest-pinned-baseline` (five JSON reports per OS).
- Helper `ec6ac6b774f119320d2f623b012f91c2d0215057`,
  Validator `4a0282e93b979345374076fb0adc60c7faf6af99`,
  VS Code **1.147.0**, Node 22 for CI setup.
- All four profiles ran and produced JSON on each OS. Validator-only had
  **zero failed assertions**. Helper-only, combined and full each reported
  the **same four known pre-integration Helper failures** listed above.
  No additional unexpected harness failures were observed.
- The new **root-only recursive-include** check passed on both OSs:
  the nested TRD was not editor-open; the parent had a TPV002 child summary;
  the nested missing reference had TPV001; and the existing leaf reference
  caused no TPV001. Two GIS input paths each generated their own TPV001.
- Full profile installed and activated seito-openfile 2.3.3 and Error Lens
  3.30.0. Installation/activation does **not** establish cursor-opening or
  visible decorations; those require a real UI inspection.

### Illustrative timing observations (p50 / p95 ms)

| Measured VS Code provider | Linux combined | Windows combined | Linux full | Windows full |
|---|---:|---:|---:|---:|
| Completion | 3.37 / 4.85 | 3.86 / 4.00 | 2.71 / 3.12 | 3.87 / 4.70 |
| Hover | 0.63 / 0.83 | 1.67 / 1.75 | 0.57 / 0.63 | 1.78 / 2.09 |

These are **five-sample exploratory measurements**, not a statistically
representative network-drive benchmark or baseline/post-feature comparison.
The initial hosted run preopened `model.tcf` in VS Code command-line arguments,
so its `rootFirstOpen` timing cannot be described as a cold file open.
The driver has subsequently been corrected to omit that preopen, and the
comparator now reports first-open versus subsequent warm reopen separately.

No actual mapped-drive/UNC model was available in GitHub-hosted runners;
`network-fixture` remains **blocked**. Syntax-theme inspection, snippet
expansion, cursor file opening, Error Lens decorations and opt-in formatting
remain manual/UI acceptance requirements.

## 2026-11-22: disposable feature-stack merge audit

[GitHub Actions run 45041947578](https://github.com/Chain-Frost/tuflow-vscode/actions/runs/45041947578)
attempted to combine the current feature heads in an isolated runner.
No remote branch or default branch was modified.

- Editor-services PR #19 (including #13/#14) merged cleanly.
- TCF/TGC command audit PR #18 conflicted in
  `.github/workflows/command-catalogue.yml` and
  `src/test/commandCatalogue.test.ts`.
- Grammar PR #17 conflicted in `src/extension.ts`.
- Documentation/snippets PR #15 conflicted in `src/extension.ts`.

This is a **merge-composition diagnostic**, not approval of partially
integrated code. Findings have been linked to the owning PRs; a complete
#1–#8 candidate has **not** been compiled or end-to-end tested.


## Corrected first-open measurement verification

The independent Codex follow-up review found that the performance comparison
omitted the runner's `rootFirstOpen` measurement. The comparator now outputs
`root first open/show` and `root subsequent open/show` separately, with a
unit test where first-open latency doubles but warm reopen remains unchanged.

The CI host driver no longer preopens `model.tcf`. In the [corrected Linux and
Windows Extension Host run 45042111135](https://github.com/Chain-Frost/tuflow-vscode/actions/runs/45042111135),
the first-root-open metadata reports
`alreadyOpenBeforeMeasurement: false` in **all eight profile results**.
Every profile again completed with no unexpected acceptance-harness failures;
the four documented Helper #12 failures persist as recorded failures, while
Validator-only has zero failed assertions.

Example first-open-and-show values from this run: Linux combined **199.04 ms**,
full **218.19 ms**; Windows combined **685.61 ms**, full **608.58 ms**. Each is
one first-open operation on a hosted runner, not a distribution estimate, and
there is still no integrated-feature post-change dataset. These results must
not be interpreted as a performance regression or a platform benchmark.
