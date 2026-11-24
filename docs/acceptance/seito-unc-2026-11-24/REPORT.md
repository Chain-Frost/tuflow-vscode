# seito-openfile Windows UNC correction, 24 November 2026

Local implementation and real Windows SMB acceptance PASS. Upstream issue/MR submission and merge remain BLOCKED by missing GitLab authentication; neither has happened. Keep issues #35 and #9 open pending upstream delivery/integration.

Read [PR #34](https://github.com/Chain-Frost/tuflow-vscode/pull/34), its report, trace and review discussion before changes. Queried all publicly visible upstream issues and merge requests, including closed items, through GitLab project 11531943's REST API. No equivalent UNC report or MR found. Latest upstream HEAD and tag v2.3.3-release both resolve to `39ef7abc3374a8888f93919201425684e9cf1a40`.

Independent seito-only profiles reproduce the defect with the retained source-built 2.3.3 VSIX from PR #34 and with a fresh latest-source webpack build. Local and mapped opens pass; genuine UNC opens fail. The retained package is not asserted to be a freshly downloaded Marketplace artifact. `true-case-path` 2.2.1 splits the UNC path, discards empty segments, and assumes the server name is a drive letter. It then enumerates a relative `SERVER\` directory under VS Code's working directory. seito's preceding relative-child resolution already returned the correct UNC path.

The patch adds a case-resolution helper that parses and preserves the UNC server/share root, passes only child segments with that root as the dependency's base, and normalizes the extra separator returned by the dependency. Non-UNC paths retain the existing dependency call. It replaces the single case-correction call in `openDocument`; no Helper runtime changes. [Applyable patch with tests](fix.patch), source commit `56b0a240390650e8eb7ef0983b25a68269c5cf20` on local branch `fix/windows-unc-case-root` in `E:\Github\seito-openfile`.

| Check | Result |
|---|---|
| Packaged 2.3.3, seito-only, local / UNC / mapped | PASS / FAIL / PASS |
| Latest upstream, seito-only, local / UNC / mapped | PASS / FAIL / PASS |
| Corrected installed VSIX, local / UNC / mapped | PASS / PASS / PASS |
| Corrected installed command matrix | 15/15 PASS |
| Focused regression tests, real UNC and mapped SMB | 4 PASS, 0 failures, 0 skips |
| Existing upstream suite, unchanged baseline | 69 PASS, 4 failures |
| Full corrected suite including regressions | 73 PASS, same 4 failures |
| Production webpack package and ESLint | PASS |
| Project TypeScript with `--skipLibCheck` | PASS |
| Unmodified TypeScript command | FAIL in inherited `@types/glob` / minimatch declarations |
| Independent Codex final review | No remaining concrete findings |
| Upstream issue, MR, hosted CI, merge | BLOCKED / not performed |

The 15-case installed matrix covers relative child, nested relative child, mismatched filename/directory case, absolute file and missing file in each storage mode. It ran with the genuine UNC folder open as workspace. Missing files leave root.tcf active and report File not found; they are expected negative cases. Mixed-case opens restore `Nested\Child.trd`. TUFLOW extensions are absent from that profile. Direct seito command invocation is used, not an alternative opener. Tests edit root document text only in memory, then revert it. Fixture writes stay within the existing authorized disposable share directory and a new local scratch directory. No production model or normal profile was changed.

The same four full-suite failures were reproduced using a separate pristine upstream worktree: inconsistent drive-letter case expectation, two existing `$` leadingPathMapping cases and a HOME-dependent fixture expectation. The production environment's HOME was not repurposed to satisfy a test. These remain failed; the suite is not described as green.

Independent review found the dependency's duplicate separator and a mapped-root assertion that expected behavior the existing dependency does not provide. Both were corrected; the reviewer independently repeated all four focused tests on genuine SMB and reported no remaining findings. [Review receipt](independent-review.md).

Exact source/package and installed JS hashes are in [provenance.json](provenance.json). Fixed inner VSIX SHA-256: `c91460b2d5f282b36ab184d2a03b655fc858657892c9f48d6b93fbd1001b20d0`. The package retains version 2.3.3 and is an unreleased local fix, not an upstream released version. Local VSIX: `E:\Github\seito-openfile\seito-openfile-unc-fix.vsix`. Installed JS matches built JS byte-for-byte. No extension was published.

Raw receipts: [packaged](packaged/report.json), [latest](latest/report.json), [installed](installed/report.json), [15-case installed matrix](installed-matrix/report.json), [baseline suite log](baseline-full-suite/host.log), [corrected suite log](full-suite/host.log). Server/share identifiers are sanitized. Supplemental observation drivers are included; their paths are environment-specific and require adaptation. The original private local packet is `E:\Github\seito-unc-evidence-20261124`.

To rerun the committed focused tests, build TypeScript, prepare an owner-approved disposable `Nested/Child.trd`, set `SEITO_TEST_UNC` and `SEITO_TEST_MAPPED` to matching aliases of its parent, then run `node node_modules/mocha/bin/mocha.js --ui tdd out/test/suite/common/uncpaths.test.js`. Network tests explicitly skip if Windows or either required environment variable is absent. Local tests run without SMB. Never interpret a skipped network test as UNC acceptance.

Remaining work: authenticate GitLab, recheck upstream HEAD/issues, submit the prepared issue and fork/MR, carry the independent review receipt and exact artifact evidence into the MR, resolve any upstream review/CI findings, and obtain the appropriate upstream merge. Then link those actual upstream URLs to #35 and #9 and qualify the delivered build. The local passing build does not by itself change installed user versions or close the tracking issues.
