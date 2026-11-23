# Integration-only verification branch — DO NOT MERGE

Purpose: exercise issues #5/#6 in a Windows/Linux real VS Code Extension Host and installed VSIX, using the existing issue #2 harness with issue #1 language ID and issue #4 audited TCF/TGC catalogue. This is deliberately a disposable CI fixture, not a proposal to merge the combined feature set.

Source snapshots at initial integration: issue #19 `567a1e9a34`, issue #11 `124dd25b98`, issue #12 `ec6ac6b77`, issue #18 `037b8d0357` (PR #18 may have advanced afterwards). Do not merge this branch into `master`; apply any confirmed integration fix to its owning PR separately.

The integration changes are confined to test adaptation, manifest registration, provider registration, and combining audited registry entries from two parallel PRs. Tests and CI generated here must be evaluated independently.
