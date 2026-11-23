# Issue #9: Windows acceptance, 24 November 2026

**Overall: FAIL for complete UNC companion navigation; retain issue #9 OPEN.** The current Helper and corrected Validator pass their integrated functional checks. A reproducible seito-openfile UNC failure remains in the four-extension toolchain. It also fails with the historical Helper baseline, so this is not evidence of a new Helper regression. No Helper runtime defect was isolated, and no replacement opener or filesystem subsystem was added.

The supplied handoff, issue/comments, both repository heads, applicable instructions and CI were refreshed. No applicable AGENTS.md was found in either tested checkout or the workspace ancestors. Helper advanced from `b44907293fc96f5a5f4a5fae2548ea2ebd53f996` to `b838b184f5e74c116bde70578f5d8bf2d30d2225` through #33: obsolete root samples were removed and VSIX packaging checks changed. Validator remains `b8d5f9d42fe0a7f1f5e8d5337e8c9646ffdebfc5`. Both heads were fetched again before preparing this report. All new integrated receipts identify the current Helper head; old evidence is not substituted for this build.

Helper exact-head [Extension CI](https://github.com/Chain-Frost/tuflow-vscode/actions/runs/45195436531) and Validator [extension tests](https://github.com/Chain-Frost/tuflow_validator/actions/runs/45189582842) passed. The earlier [8/8 hosted acceptance](https://github.com/Chain-Frost/tuflow-vscode/actions/runs/45191128498) remains context for its tested source, rather than proof of #33. Local compilation/package verification, lint, 74 pure-logic tests and 45 indexed fixture checks passed. The separate nine acceptance-unit assertions also passed; those are included in the 74 and are not counted twice.

**Environment and provenance.** Windows 10 Pro 10.0.19045 x64; Ryzen 7 7700X, 16 logical processors, 67,869,888,512 bytes RAM; NTFS on E:, genuine existing SMB storage reached by UNC and a mapped drive. VS Code 1.147.0, commit `8a14f0cc1b08d531eb83255ea3764ae22aa932b5`, Extension Host Node 24.22.1. Current Helper/Validator were built in isolated WSL Docker `node:24-bookworm` containers with Node 24.22.3, `npm ci` and the repositories' VSIX packaging commands. No source version was changed. The actual inner VSIX files, not an enclosing artifact ZIP, were hashed. Both current packages were installed into fresh isolated profiles. Normal VS Code user-data/extensions were preserved.

| Package | Version | Source SHA | Actual VSIX SHA-256 |
|---|---|---|---|
| Helper | 0.8.2 | b838b184f5e74c116bde70578f5d8bf2d30d2225 | e3cea314de3e6e2664c83b4357d283606a110ea2ab8c121ab5b4df6ed8cf0df3 |
| Validator | 0.2.7 | b8d5f9d42fe0a7f1f5e8d5337e8c9646ffdebfc5 | 6dc8dfeaa3bff8eec733e13c85774fce7f23d4bd969a41041f0009e8ba2f0e09 |
| Historical Helper baseline | 0.8.2 | 4e2fffd9f924f45e510c784ce4a8b3c6d5335258 | 0ac585ac644c3f99606c4a8d03b8e6b526a1888ce13de0a10126ef9e140e9c2b |
| seito-openfile | 2.3.3 | 39ef7abc3374a8888f93919201425684e9cf1a40 | 897e6e85daafa331306af95fbb52e908f76b72152014cc9191cd79e7010be5c5 |
| Error Lens | 3.30.0 | 43632f75bb42af5945fdcc7d4e3b001a89456ca7 | f579746cdf6923f006045d6888bc6c48ea292b6501b3a608e02b0b37d3e12a62 |

The historical baseline and companions are retained source-built packages from the earlier local packet, with hashes rechecked, rather than newly rebuilt packages. Their source attribution is retained in [provenance.json](provenance.json). The corrected Validator was freshly built; the stale Marketplace 0.2.6 package was not used. Current source/package identities and installed receipts are distinct from the retained baseline.

**Acceptance ledger.** PASS applies to the specified tested setup. Raw harness UNVERIFIED/BLOCKED entries are preserved; additional GUI/network evidence below resolves those specific checks without rewriting the original JSON.

| Criterion | Result | Evidence and limit |
|---|---|---|
| Exact current source/VSIX, isolated installation | PASS | Provenance above; per-trial installed.json |
| Four configurations, activation and file association | PASS | Fresh NTFS helper-only 21, validator-only 28, combined 33, full 33 passing assertions; zero failed assertions. All four have separate real GUI captures under gui/ |
| Syntax in light/dark themes | PASS | Full-profile Light Modern/Dark Modern captures distinguish assignment, comments, scientific numbers, macros and selectors; unknown command is not marked audited |
| Automatic indentation | PASS | GUI typing produced indented branch bodies and unindented Else/End If; gui/full/indent-state.json |
| Audited completion and correct insertion | PASS | Ten provider contexts; GUI completion popup and insertion with one == delimiter |
| Hover, literal angle-bracket hours operand | PASS | Actual hover screenshot displays End Time == <time_in_hours> |
| Signature help | PASS | Origin signature screenshot; Origin and BC Event Source provider checks |
| Snippet expansion, editing and tab stops | PASS | Ten snippets exercised in a live editor; TEF GUI captures plus snippet-final-second.json show accepted_event and the selected second placeholder 12 |
| Official external documentation | PASS | Native VS Code confirmation displays pinned official TCF appendix; Open was invoked and Firefox displayed its matching TCF Commands manual title |
| File opening on NTFS | PASS | Actual seito navigation opens present.trd in the GUI |
| File opening on mapped SMB | PASS | navigation/mapped receipt opens the expected nested child.trd |
| File opening on UNC SMB | **FAIL** | Two current-Helper trials and a baseline-Helper trial remain on root.tcf; seito stack traces a failed scandir under the VS Code installation directory |
| Diagnostic ownership and deduplication | PASS | TPV001/TPV002 source is TUFLOW Path Validator; no Helper diagnostic collection; full GUI shows one Problems entry and the matching Error Lens decoration |
| Formatting is opt-in and Validator-owned | PASS | Actual Format Document leaves fixture unchanged when false; when true it indents only branch bodies; final setting restored false |
| Root-only nested TRD traversal | PASS | Canonical host check runs before child editor opening; separate workspace probe verifies parent summaries |
| Shared child updates both roots | PASS | Network probe opens root.tcf and second.tcf referencing the same child; both summaries clear/return |
| External create, modify, restore, rename away/back, delete | PASS | NTFS, UNC and mapped workspace probes: 18/18 automatic transitions observed |
| Manual Refresh Path Diagnostics | PASS | Dedicated UNC/mapped out-of-workspace probes first observe stale diagnostics for 1 second after external create/delete; Refresh then causes the required transitions (4/4). Earlier workspace checks prove invocation only |
| Ignored references, unresolved macros, lists and unknown lines | PASS | Exact current canonical acceptance assertions |
| Genuine layer-bearing GeoPackage, read-only selector handling | PASS, file-selector scope | GDAL opened a valid one-feature acceptance_points layer read-only; hash unchanged. Validator reports only the absent physical .gpkg, not a missing layer inside an existing .gpkg |
| Layer-existence checking | UNVERIFIED / unsupported scope | Existing-but-absent layer is deliberately not asserted to be a Helper error; no new layer-checking feature was introduced |
| First editor open, warm reopen, providers, CPU/RSS and baseline comparison | PASS, measurement scope | Raw 30-sample series for all access modes; tables below; no invented performance threshold |
| True physical cold-cache I/O | UNVERIFIED | No cache eviction or reboot; first-editor opens are explicitly not called physical cold opens |
| Representative control-file content | PASS, snapshot scope | Three real control files copied into disposable workspaces: 414/216/3,532 lines, 15,223/10,672/122,462 bytes; source and snapshot hashes unchanged |
| Complete live production-model dependency population | UNVERIFIED | This run qualifies the representative copies and disposable dependency graph, not an entire production model |
| Outside-workspace automatic SMB freshness | UNVERIFIED, accepted limitation | Not required for this workspace-mode acceptance; no polling or recursive-watcher workaround |
| No redundant Helper filesystem/formatter/opener/model integration | PASS | Source registration inspection and installed behavior agree: completion, hover, signatures and documentation only |
| Production/profile preservation and prohibited operations | PASS | No solver execution, production edits, normal-profile modifications, version bump, merge, Marketplace publication or release |

**UNC opener failure reproduction and ownership.** On an approved disposable SMB folder, create `watch/root.tcf` with `Read File == child.trd` and an existing `watch/child.trd`. Open the folder as a VS Code workspace through `\\SMB-SERVER\TEST-SHARE\scratch`, open only the root, put the caret at the operand's end, and invoke seito-openfile's Open File From Text command (Alt+P). Direct VS Code opening and Validator traversal reach the child. seito leaves the root active. The equivalent mapped-drive action opens the child.

The readiness repeat explicitly activated seito and waited 750 ms before invocation and 1,500 ms afterwards. The same failure occurs with the historical Helper baseline. [unc-opener-error.txt](unc-opener-error.txt) records `ENOENT ... scandir 'C:\Program Files\Microsoft VS Code\SMB-SERVER\'` with the stack in `Fr43nk.seito-openfile` and its `true-case-path` dependency. This is an external companion path-normalization failure, not Helper path ownership or a reason to add an opener to Helper. The tested companion source is hosted at `https://gitlab.com/fr43nk/seito-openfile`; no change to that external repository was made. The precise reproducible finding is supplied for upstream repair or an explicit owner decision on UNC navigation. The mapped-drive workaround passes, but is not silently substituted for UNC acceptance.

**Network observations and trial corrections.** External edits were made by a separate Python process to newly created disposable fixtures. Source-root path resolution was used. Automatic transitions took 169 to 189 ms on NTFS, 132 to 201 ms through UNC and 185 to 204 ms mapped, including external-process startup and 50-ms observation granularity. Earlier workspace manual-command values of 1 to 9 ms demonstrate invocation only: the state was already correct. Independent review caught that evidence gap. New isolated UNC/mapped probes open the target outside an empty local workspace, observe stale diagnostics for 1,000 ms after each external create/delete, and then invoke Refresh. All four stale-to-current transitions pass: UNC 7/3 ms and mapped 9/4 ms for create/delete. Before/after diagnostics and targetOutsideWorkspace are retained in raw/manual-refresh. These command timings are not comparable watcher benchmarks. Each automatic transition has one observation, not a p95 estimate. Some VS Code watcher error logs occurred on SMB despite successful observed transitions; disconnected-share reliability and universal server support are not claimed.

The first mapped initial-missing probe failed because UNC and mapped access alias the same fixture and the preceding trial left the recovered file present. The reset-before-run correction passed all nine mapped checks. Both receipts remain under raw/network and raw/network-reset. The canonical runner's network-fixture check is BLOCKED because its separate optional network-root variable was not supplied; the entire workspace was instead launched directly at each UNC/mapped fixture root, as recorded in workspaceFolders and the dedicated network receipts.

The initial native keyboard automation lost desktop focus. Several early captures or text-input attempts were unsuitable and are retained only in the private local packet, not treated as acceptance. Final GUI evidence uses the actual installed Windows VS Code renderer through local CDP, native dialog UI Automation, and a disposable editor-state observer. Entering the observer command can terminate a snippet session, so the final snippet insertion/type/tab sequence ran atomically inside one observer invocation. Its selected second tab stop and screenshots agree. The automated documentation probe encountered VS Code's deliberate refusal to show native permission dialogs in test mode; the separate GUI prompt and successful Firefox handoff resolve that test limitation.

**Performance interpretation.** Each measured series has two warm-ups and 30 retained samples, nearest-rank p50/p95/max, and shared Extension Host CPU time/RSS before and after the series. CPU is not attributed to Helper alone; RSS is not peak working set. The ordinary desktop and other applications remained running. Trials were sequential, with matching VS Code, companions, profile settings, fixtures and machine. UNC and mapped paths alias the same server files, so the later run is not an independent physical cold cache. Hashing/copying also warms caches. Root first-open is one editor observation per fresh profile; it is not a distribution estimate or private activation time.

The comparable canonical full-profile series ran after fixture preparation stabilized. Earlier integrated/baseline trials are retained separately. The synthetic canonical file is named .tcf but contains `Read GIS Z Shape`, a TGC command; correct integrated cross-file filtering changes its completion semantics. Its measured latency increase is retained, not suppressed, but is not sufficient to diagnose slow valid-command completion. A separate matching 10,001-line .tgc probe qualifies a valid command on every filesystem. Representative-file samples include real TCF/TGC/TRD content in disposable folders, not production execution or full-model semantic acceptance. No numerical speed threshold or general no-regression guarantee is invented.

| Canonical full profile | First editor open baseline / integrated (ms) | Warm reopen integrated p50 / p95 / max (ms) | Completion integrated p50 / p95 / max (ms) | Hover integrated p50 / p95 / max (ms) |
|---|---:|---:|---:|---:|
| ntfs | 2425.91 / 125.43 | 64.51 / 73.25 / 90.42 | 3.48 / 5.45 / 5.84 | 0.96 / 1.42 / 1.55 |
| unc | 208.91 / 167.71 | 54.94 / 80.85 / 86.60 | 3.31 / 4.26 / 4.88 | 1.00 / 1.54 / 2.78 |
| mapped | 237.88 / 144.42 | 51.03 / 64.16 / 65.31 | 3.52 / 13.20 / 30.71 | 0.93 / 1.19 / 1.26 |

| Valid 10,001-line TGC | Completion baseline p50 / p95 / max (ms) | Completion integrated p50 / p95 / max (ms) | Hover integrated p50 / p95 / max (ms) | Completion CPU baseline / integrated (ms, 30 calls) | Completion RSS before / after integrated (MiB) |
|---|---:|---:|---:|---:|---:|
| ntfs | 1.87 / 12.10 / 23.67 | 2.41 / 3.31 / 4.30 | 0.81 / 1.18 / 1.91 | 63 / 32 | 240.2 / 252.2 |
| unc | 2.33 / 11.53 / 23.31 | 2.51 / 3.57 / 3.67 | 0.82 / 2.04 / 2.07 | 95 / 109 | 242.8 / 255.1 |
| mapped | 2.10 / 3.44 / 3.65 | 2.52 / 3.16 / 3.66 | 0.79 / 1.84 / 2.42 | 79 / 78 | 237.1 / 250.4 |

In the original cross-file synthetic .tcf probe, completion medians were baseline 1.84/1.89/2.29 ms versus integrated 10.97/9.85/9.28 ms (NTFS/UNC/mapped). The valid .tgc probe above is a separate added measurement, not a replacement or relabeling of those raw results. Valid-command medians still increase by 0.18 to 0.54 ms in these samples; p95 is lower in all three modes. Representative TCF/TGC provider medians generally decrease; TRD completion is mixed (including NTFS p95 8.98 to 14.92 ms). Those observations and outliers remain in raw/model-*; no cause or acceptance threshold is inferred from them.

| Representative snapshot, integrated | First editor open (ms) | Warm reopen p50 / p95 / max (ms) | Completion p50 / p95 / max (ms) | Hover p50 / p95 / max (ms) |
|---|---:|---:|---:|---:|
| ntfs, representative-0.tcf | 143.12 | 62.21 / 82.03 / 87.22 | 1.17 / 1.83 / 2.76 | 0.88 / 1.21 / 2.15 |
| ntfs, representative-1.tgc | 25.31 | 57.60 / 77.14 / 81.68 | 1.17 / 1.81 / 2.61 | 0.82 / 1.21 / 1.31 |
| ntfs, representative-2.trd | 36.90 | 42.86 / 52.16 / 54.33 | 6.11 / 14.92 / 39.75 | 0.89 / 1.01 / 6.05 |
| unc, representative-0.tcf | 214.00 | 54.21 / 72.76 / 85.91 | 1.27 / 1.76 / 2.30 | 0.85 / 1.31 / 3.17 |
| unc, representative-1.tgc | 63.05 | 58.84 / 83.91 / 94.15 | 1.25 / 1.78 / 2.01 | 0.84 / 1.12 / 1.23 |
| unc, representative-2.trd | 43.06 | 48.32 / 60.69 / 67.66 | 6.16 / 8.20 / 8.76 | 0.85 / 1.10 / 1.10 |
| mapped, representative-0.tcf | 223.83 | 57.91 / 73.44 / 86.13 | 1.37 / 2.17 / 3.73 | 0.86 / 1.02 / 1.19 |
| mapped, representative-1.tgc | 81.66 | 63.52 / 95.62 / 98.88 | 1.20 / 1.83 / 3.22 | 1.21 / 13.28 / 16.69 |
| mapped, representative-2.trd | 37.25 | 45.17 / 59.00 / 84.27 | 6.81 / 8.62 / 10.62 | 0.99 / 1.20 / 1.26 |

**Evidence custody and reproduction.** The complete private packet is retained at `E:/Github/tuflow-issue9-20261124/`: exact VSIX binaries, detached build checkouts, original JSON, profiles/logs, screenshots, disposable fixture snapshots and trial tooling. This public directory contains sanitized raw numerical/functional receipts, provenance, selected inspected screenshots and the executed supplemental drivers. Private server/share identities are replaced; production file contents are not published. The retained historical companion/baseline build provenance is distinguished from newly compiled current product packages.

Use the current repository's documented build commands and `test/acceptance/` runner for canonical results. The supplemental [drivers](drivers/) show the executed network, navigation, provider and performance operations; their recorded workstation root must be adapted when reproducing elsewhere. Supply the five hashed packages at the paths described in run_local.py and create config-private.json locally with root/harness/helperSha/validatorSha and environments labelled ntfs/unc/mapped. Copy the indexed fixture folder to a unique approved scratch subfolder for each access mode; UNC/mapped must alias a genuine SMB directory. For the network probe, create watch/root.tcf and watch/second.tcf each referencing child.trd, and watch/child.trd referencing external.trd; initially omit the latter. The network driver resets its disposable target state before running. Never point that mutating driver at production inputs.

Retain issue #9 open for the demonstrated UNC companion failure until it is fixed or explicitly accepted. Current Helper/Validator correctness and requested measurement evidence are supplied; an unrelated Helper runtime patch would not repair this failure. No merge or issue closure is performed by this report.
