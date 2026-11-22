# Agent prompt: independent review of TUFLOW Path Validator

Act as an independent senior engineer reviewing a TypeScript VS Code extension used in production TUFLOW Classic/HPC flood-modelling workflows. Your task is an **evidence-based audit and proposed remediation plan**, not a rewrite.

## Target and related repositories

- **Primary:** https://github.com/Chain-Frost/tuflow_validator (main branch and active PRs).
- **Related editor extension:** https://github.com/Chain-Frost/tuflow-vscode.
- **Third-party file opener:** https://marketplace.visualstudio.com/items?itemName=Fr43nk.seito-openfile.
- **Diagnostic display:** https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens.

We control both Chain-Frost repositories and can change either when appropriate. However, responsibilities must be cleanly separated: Path Validator owns file-path and input-reference checking, recursive control-file dependencies, static variable resolution, conditional/block validation, versioned filename checks, safe Quick Fixes, optional formatting and GeoPackage layer checking. TUFLOW Helper owns command highlighting, syntax assistance, snippets, hover and documentation. File opening is handled by seito-openfile. Error Lens displays normal VS Code diagnostics; it does not require special integration.

## Mandatory initial discovery

1. Inventory the current `main` implementation, tests, package metadata, workflows, releases and documented limitations. Check actual source and installation/packaged extension behavior before reporting a defect.
2. Read **all open issues and PRs** and their review comments. In particular:
   - [#3](https://github.com/Chain-Frost/tuflow_validator/issues/3): static variables, recursive dependency tracking and remaining performance/invalidation work;
   - [#4](https://github.com/Chain-Frost/tuflow_validator/issues/4): version-aware Quick Fixes and remaining version-token/tooling work;
   - [#8](https://github.com/Chain-Frost/tuflow_validator/issues/8) and [draft PR #9](https://github.com/Chain-Frost/tuflow_validator/pull/9): **optional read-only GeoPackage layer-name validation**. Audit the pending implementation as well as `main`, and do not propose it as new work;
   - [#10](https://github.com/Chain-Frost/tuflow_validator/issues/10): reported false missing-file diagnostic for numeric `Viscosity Coefficients`. Verify source vs installed build, rather than assuming a current regression.
3. Inspect relevant upstream TUFLOW documentation, especially current control-file syntax, GeoPackage selectors and conditional/event semantics. Distinguish documented behavior, conservative assumptions and uncertain/unsupported cases.
4. Check the **actual VS Code language IDs**: Validator contributes `tuflow`, while TUFLOW Helper currently contributes `tuflow-helper`. Diagnose coexistence through reproducible tests, not assumptions.

## Review focus

### Functional correctness and false positives
- Input vs output vs scalar/non-file commands; ensure unknown commands are skipped conservatively instead of being treated as files.
- Base path resolution for TCF, nested TCF and TRD includes; `Read File`, wildcards, multi-path `|` lists, UNC and mapped network paths, relative/absolute paths and Windows vs Linux path semantics.
- Static `Set Variable` handling, nested includes, repeated include contexts, cycles, unresolved macros, `<<...>>`, `~s/~e` tokens; do not guess runtime scenario/event substitutions.
- GeoPackage explicit `>>` selectors, `&&` combined layers, implicit basename selection, `USE ALL`, `Spatial Database` scopes and unresolved dynamic layer names; compare `main` with PR #9.
- Block matching (`If Event`, `If Scenario`, `Else`, `Else If`, `Define Event`, `Start/End 1D/2D Domain`), correct diagnostic spans and ignore directives.
- Latest/version reference logic: preserve scenario/event identity, avoid mixing numeric model versions and arbitrary numeric filenames, reject ambiguous automatic replacements, recheck targets before applying fixes.
- Diagnostics lifecycle and source codes: refresh on edit/save/close/create/delete/rename/settings; no stale/duplicate diagnostics, false positives, spurious issue propagation or unsafe ignore Quick Fixes.
- Layer checking: read-only, no GeoPackage modifications, no incorrect assumption that a single different-named layer is an implied basename match. Verify behavior on unreadable/locked/actively edited databases.

### Performance, reliability and packaging
- Large dependency graphs, repeated includes, nested roots, watcher count, debounce, cancellation, cache-key accuracy, error recovery and lack of blocking extension-host I/O.
- Windows/local SSD/network share/UNC and temporary unavailability; separate measured performance from conjecture.
- VS Code multi-root workspaces and documents without a workspace, platform differences and resource clean-up.
- Dependency security, licence, VSIX contents, source maps, smoke tests, CI coverage on Windows/Linux, Marketplace published VSIX vs source-branch mismatch and release workflows.
- Readability, code organisation, module responsibilities, test-fixture quality and maintenance cost.
- Verify compatibility with TUFLOW Helper + seito-openfile + Error Lens; do not duplicate their purposes.

### Engineering UX
- Diagnostic wording, severity, specific source ranges, stability of codes, configurable enablement, conservative handling of ambiguity and actionable Quick Fixes.
- Assess opportunities for a useful dependency graph or summary only if existing recursive analysis makes this low-cost and it belongs to Validator. Prefer a small focused enhancement over a broad GUI.
- Recommend changes to the proper repository, not whichever repository currently contains the reviewer.

## Expected work and proof

- Run the existing test suite, build/lint/VSIX verification if the environment permits. State exact commands, platform, branch/commit, pass/fail/skip counts. If a runtime/Windows/network test is unavailable, say **not verified**; do not claim it passed.
- Where a suspected defect is material, provide a minimal TUFLOW control-file fixture or test, expected vs actual result, source file/line reference and how to reproduce.
- Inspect PR #9's actual patch, CI and review state. Do not assume draft work is completed or merged.
- Benchmark only changes where latency matters; capture cold/warm and median/p95 where feasible, including notes on machine/storage context. Do not treat synthetic local timing as representative network evidence.
- Confirm whether each finding is **new**, **already fixed**, **already tracked**, **covered by a draft PR**, or **needs deployment verification**.
- Distinguish confirmed bugs from potential improvements and speculative ideas.

## Deliverables

1. A concise executive assessment.
2. A prioritised findings table: severity P0/P1/P2, affected source, evidence, impact, reproducibility, confidence, existing issue/PR overlap, recommended owning repository and corrective action.
3. Concrete, independently assignable implementation scopes including tests and acceptance criteria, suitable for GitHub issues/stacked PRs. Identify dependencies and possible concurrent workstreams.
4. A short list of items **not** to implement because they duplicate existing tooling, are already under development, are unverified or are out of scope.
5. Optional GitHub issue/PR review comments only for well-grounded findings; do not create duplicates without checking prior issues.

**Do not implement code changes, merge branches, publish extensions or make releases during this independent review unless separately directed.** Report any blockers and preserve existing PR work.

## Explicit exclusions

Do not add a TUFLOW release/version selector, model-run launcher, QGIS integration, new file-opening tool, broad grammar/intellisense engine in Validator, or dependency on Error Lens APIs.
