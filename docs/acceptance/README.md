# Integrated TUFLOW editor acceptance — issue #9

This workstream records *repeatable evidence*, not a competing editor parser or path validator.
No solver, QGIS, GDAL, formatter or file-opening implementation is introduced.

## Responsibilities

| Component | Owns | Must not duplicate |
|---|---|---|
| TUFLOW Helper | Language association, syntax grammar, command completion/hover, snippets, help | File existence, GIS-layer checks, model running, formatting, opening paths |
| [TUFLOW Path Validator](https://github.com/Chain-Frost/tuflow_validator) | Missing-file/recursive/conditional diagnostics, optional formatting | Helper IntelliSense |
| [seito-openfile](https://marketplace.visualstudio.com/items?itemName=Fr43nk.seito-openfile) | File opening under cursor | TUFLOW command validation |
| [Error Lens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens) | Displaying existing VS Code diagnostics inline | Diagnostic creation |

## Fixture coverage

The files in [test/acceptance/fixtures](../../test/acceptance/fixtures) cover **45 individually indexed cases** in TCF, TGC, TBC, ECF, TEF, TRD and QCF. Each case is identified by the exact source line and an explicit intent in [matrix.json](../../test/acceptance/fixtures/matrix.json).

Coverage includes existing and missing relative references, nested TRD files (resolved from the source TCF directory), ignored references, unknown, incomplete and malformed-delimiter command lines, conditional directives, inline comments, decimal/scientific values, unresolved macro placeholders, Windows UNC-style references, file lists and GeoPackage `>>` selectors. Cases marked `incomplete` or `unknown` are *not* blanket errors: Helper must not reject them. Some QCF/TEF inputs are deliberately **syntax-only probes**, not claims of a verified TUFLOW command.

Run the fixture consistency test (no npm dependencies required):

    node test/acceptance/check-fixtures.mjs

## Automated assertions and hosted VS Code tests

`test/acceptance/assertions.cjs` provides strict, testable checks for Validator
`TPV001` / `TPV002` diagnostic source, code and **all expected missing paths**.
A root-only stage opens the TCF before independently opening its included TRD;
this ensures a nested missing reference cannot pass solely because the editor
opened the child document. Under the current Validator's source-TCF-directory
rule, the nested fixture references `include/leaf.trd`.

Use `node --test test/acceptance/assertions.test.cjs test/acceptance/compare-reports.test.cjs`
to test these invariants without VS Code. The Linux/Windows fixture CI executes
these tests as well as fixture integrity checks.

`.github/workflows/acceptance-host.yml` tests the integrated Helper at the exact
acceptance checkout SHA and pinned current Validator source, using Node 24 and
VS Code 1.147.0. Every failed assertion fails the run; historical Helper #12
failures are never exempted. Both source-built VSIX hashes and actual installed
versions are recorded. The standalone driver also accepts
`TUFLOW_ACCEPT_VSCODE_VERSION`, `TUFLOW_ACCEPT_FIXTURES`,
`TUFLOW_ACCEPT_PHASE`, `TUFLOW_ACCEPT_REPEATS` and `TUFLOW_ACCEPT_LINES` for
like-for-like local baseline/post-change trials. Raw timing arrays are preserved,
including subsequent root open/show trials. A first editor open is not proof of
cold filesystem caches. Manual UI, network watchers and real GIS layers still
require separate observations.

## Profiles

Use an isolated VS Code user-data and extensions directory **for every profile**; never reuse a directory between cases.

| `TUFLOW_ACCEPT_PROFILE` | Helper | Validator | seito-openfile | Error Lens |
|---|:---:|:---:|:---:|:---:|
| `helper-only` | Yes | No | No | No |
| `validator-only` | No | Yes | No | No |
| `combined` | Yes | Yes | No | No |
| `full` | Yes | Yes | Yes | Yes |

Prepare both repositories locally. Compile each development extension independently using its documented commands. Run each scenario with the folder `test/acceptance/fixtures` open as the workspace; this is necessary to trigger the Validator's `workspaceContains` activation.

The test module exports `run()` as expected by the [VS Code extension test host](https://code.visualstudio.com/api/working-with-extensions/testing-extension). Example in PowerShell from the Helper repository root:

    $helper = (Resolve-Path .).Path
    $validator = (Resolve-Path ..\tuflow_validator).Path
    $fixtures = Join-Path $helper 'test\acceptance\fixtures'
    $runner = Join-Path $helper 'test\acceptance\vscode-runner.cjs'
    $testRoot = Join-Path $env:TEMP 'tuflow-ux-acceptance'
    $env:TUFLOW_ACCEPT_PHASE = 'baseline'
    $env:TUFLOW_ACCEPT_REVISION = (git rev-parse --short HEAD)

For **Helper alone**:

    $env:TUFLOW_ACCEPT_PROFILE = 'helper-only'
    $env:TUFLOW_ACCEPT_OUTPUT = Join-Path $testRoot 'helper-before.json'
    code --user-data-dir "$testRoot\helper-user" --extensions-dir "$testRoot\helper-ext" --disable-extensions --extensionDevelopmentPath="$helper" --extensionTestsPath="$runner" "$fixtures"

For **Validator alone**:

    $env:TUFLOW_ACCEPT_PROFILE = 'validator-only'
    $env:TUFLOW_ACCEPT_OUTPUT = Join-Path $testRoot 'validator-before.json'
    code --user-data-dir "$testRoot\validator-user" --extensions-dir "$testRoot\validator-ext" --disable-extensions --extensionDevelopmentPath="$validator" --extensionTestsPath="$runner" "$fixtures"

For **Helper plus Validator**, explicitly install the companion into the isolated extensions directory (or use a pinned VSIX):

    code --user-data-dir "$testRoot\both-user" --extensions-dir "$testRoot\both-ext" --install-extension "$testRoot\validator-source-built.vsix"
    $env:TUFLOW_ACCEPT_PROFILE = 'combined'
    $env:TUFLOW_ACCEPT_OUTPUT = Join-Path $testRoot 'both-before.json'
    code --user-data-dir "$testRoot\both-user" --extensions-dir "$testRoot\both-ext" --extensionDevelopmentPath="$helper" --extensionTestsPath="$runner" "$fixtures"

For **all four**, use a *different* profile and extensions directory:

    code --user-data-dir "$testRoot\full-user" --extensions-dir "$testRoot\full-ext" --install-extension "$testRoot\validator-source-built.vsix"
    code --user-data-dir "$testRoot\full-user" --extensions-dir "$testRoot\full-ext" --install-extension Fr43nk.seito-openfile
    code --user-data-dir "$testRoot\full-user" --extensions-dir "$testRoot\full-ext" --install-extension usernamehw.errorlens
    $env:TUFLOW_ACCEPT_PROFILE = 'full'
    $env:TUFLOW_ACCEPT_OUTPUT = Join-Path $testRoot 'full-before.json'
    code --user-data-dir "$testRoot\full-user" --extensions-dir "$testRoot\full-ext" --extensionDevelopmentPath="$helper" --extensionTestsPath="$runner" "$fixtures"

On VS Code Stable, close other VS Code windows before CLI extension tests if the launcher reports that a running instance prevents extension-host testing. VS Code Insiders with its own profile is another option.

**Important:** The runner deliberately exits with failure if it observes an unmet assertion. This is expected for the known baseline issues before #1–#8. It always attempts to write a JSON report; **do not treat a blocked or unverified check as passed**. The environment, extension versions and actual report path are recorded in the output.

## Performance measurement

The runner measures:

- Control-file open-and-show latency (an **activation readiness proxy**, not the private extension activation time).
- Completion and hover response times (two warm-ups, default twelve measured calls), using p50/p95/max.
- Extension-host process CPU time and RSS around each timing series (**shared across all installed extensions**, not per-extension attribution).
- Synthetic 10,000-line, comment-heavy control-file opening and command completion.
- Optional network fixture open/show latency **only** if `TUFLOW_ACCEPT_NETWORK_FIXTURES` points to an existing copy on an accessible mapped/network drive.

Override `TUFLOW_ACCEPT_REPEATS`, `TUFLOW_ACCEPT_LINES` and `TUFLOW_ACCEPT_SETTLE_MS` as needed; record these values with the report. The runner does **not** write to a network location. In Windows, copy the fixtures under a UNC path beforehand and set:

    $env:TUFLOW_ACCEPT_NETWORK_FIXTURES = '\\server\share\acceptance-fixtures'

Do not declare UNC or layer verification passed just because a path string is highlighted. Real network permissions, latency and a legitimate GeoPackage/layer are needed for those separate manual checks.

After dependent PRs are integrated in a test branch, repeat the same four profiles with `TUFLOW_ACCEPT_PHASE=post-change`, fresh output paths and equivalent machines/VS Code/extension versions. Compare one profile at a time:

    node test/acceptance/compare-reports.mjs "$testRoot\both-before.json" "$testRoot\both-after.json"

The comparator reports deltas; it does not invent pass/fail performance thresholds.

## Manual checks — do in a real editor session

Run each profile in a VS Code Extension Development Host **without** `--extensionTestsPath` to keep the editor open, and record pass/fail/blocked plus the exact issue/PR. In the `full` profile specifically:

1. Opening each supported control file yields language ID `tuflow`, with Helper's TextMate syntax, snippets, command completion, and multiword hover available where documented.
2. Syntax colouring correctly distinguishes `==`, inline `!` comments, numeric/exponent values, macro placeholders and GPKG selectors in both light and dark themes; unknown lines aren't represented as verified valid commands.
3. Prefix completion inserts only the intended command, does not duplicate `==`, and does not offer unrelated values on unsupported control files. Verify snippet *expansion*, not just its presence in completion results.
4. Validator diagnostics appear only once in Problems for missing paths, and Error Lens displays **those same** diagnostics without creating extra sources. Unresolved macros and `! tpv-ignore` lines receive no inappropriate missing-path diagnostics; Helper must not create diagnostics.
5. Formatting is absent unless Path Validator's optional setting is enabled; with it enabled, no second Helper formatter competes.
6. seito-openfile opens a selected supported file; Helper has **no** `openFileUnderCursor` command or duplicate editor menu contribution.
7. On an actual Windows model share, check normal and absent UNC/relative files, nested TRD path resolution, and any available GeoPackage-layer checking. If no real layer-bearing GPKG is available, explicitly mark the layer check **blocked**.
8. Capture responsiveness on representative large control files and network folders, including at least one cold and warm open; compare like-for-like profiles and record filesystem/cache conditions.

## Ownership and review

Review #1 through #8 (not merely the default branch) after each stacked PR is available. Direct defects back to the owning PR: #1 language/opening; #2 build/VSIX/CI; #3 parser/registry; #4–#5 command data; #6 completion/hover; #7 TextMate/indentation; #8 docs/snippets.

Report every finding with the fixture case ID, exact line, profile, installed versions, observed vs expected result, and timing if relevant. Do **not** merge, release, tag, or publish from this acceptance workstream.

The initial evidence inventory is in [BASELINE.md](BASELINE.md). It intentionally distinguishes code-inspection findings from unrun functional tests.
