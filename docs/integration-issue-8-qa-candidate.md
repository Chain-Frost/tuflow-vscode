# Disposable integrated issue #8 GUI acceptance candidate

This QA-only branch is **never to be merged, released or published**.

## Pinned sources

- Combined test baseline: QA PR #23 head `6025a73fa563a4d742f9b9adf2357a0241e2ea2f`, incorporating PRs #11/#12/#13/#14/#18/#19 for command registry, audited hours-based TCF data, language ID and no duplicate file opener.
- Official browser help and ten snippets: PR #15 head `5e9e3dadebd6d7c4218078c3b0cef160aa228811`, adapted for the registry-driven provider architecture.
- The changes above are an integration verification snapshot, **not** changes to the original owning PR branches.

## Issue #8 follow-up purpose

Manual Windows GUI acceptance at PR #15 comment 7089656556 identified an inaccurate legacy `End Time` hover in standalone #15 and blocked final PR #12 co-installation verification. This candidate includes the #18 hours correction, the shared `tuflow` language ID, removes the duplicate Helper opener, and uses #15 browser-help/snippet assets.

CI should compile, run Node/Extension Host tests, build and audit the VSIX and retest the **installed VSIX on both Windows and Linux**. New tests explicitly cover inherited TEF/Read File/untitled End Time hover using **hours** and expansion of all ten snippets.

The combined candidate requires a short follow-up **interactive Windows co-installation** test using the CI VSIX and Open file / Path Validator / Error Lens, following `docs/co-installation-smoke-test.md`. Do not claim final GUI acceptance without that check. This does not replace formal integration review or permit merging the QA branch into `master`.

No TUFLOW installation, QGIS/GDAL, GIS writes, model execution or production-model changes are required.

## Markdown renderer regression — PR #19

- Reproduce: [PR #15 Windows acceptance report](https://github.com/Chain-Frost/tuflow-vscode/pull/15#issuecomment-7091160677), which found that raw Markdown silently hides `<time_in_hours>` in the rendered hover.
- Owning implementation: PR #19's `documentationForCommand`; fixing that formatter on its own branch (commit `ea211967d3ce81e566f757e80f5c480d1e1bb7c8`) and applying the same formatter fix only to this disposable QA branch for end-to-end verification.
- Added pure and actual Extension Host assertions that `End Time == <time_in_hours>` is represented as a literal Markdown inline code span across TCF, TEF, TRD and untitled TUFLOW documents.
- Automated Markdown-source/hover tests are not substitutes for the final GUI rendered-display check. The QA PR remains **DO NOT MERGE**.

## Targeted manual acceptance for the corrected VSIX

The prior integrated Windows report on [PR #15](https://github.com/Chain-Frost/tuflow-vscode/pull/15#issuecomment-7091160677) already passed the shared `tuflow` ID, no duplicate opener, optional companions, snippets and official-browser navigation. It failed only **rendering of the syntax operand**.

Use the **new** CI artifact from the successful run for the updated PR #26 head (not the prior artifact ID `14784771233`), verify the inner VSIX SHA-256, and open disposable `hours.tcf`/`hours.tef`/`hours.trd` containing `End Time == 12`. In Ctrl+K, Ctrl+I hover, the **visible rendered syntax** must include `End Time == <time_in_hours>` as literal code; description, examples, and source URL must remain correct. Test an untitled document with the `tuflow` language as well if available.

Record PASS/FAIL with screenshot and exact source SHA/VSIX SHA-256 on [PR #15](https://github.com/Chain-Frost/tuflow-vscode/pull/15). This is a focused GUI retest only; there is no need to rerun the entire already-passing eight-file/ten-snippet manual matrix unless behaviour regresses. Do not merge/publish the QA branch.
