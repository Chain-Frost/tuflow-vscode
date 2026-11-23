# Command-aware editor services (issue #6)

Editor assistance uses the typed registry and pure single-line parser from #3 and the audited control-file commands from #5. It does **not** test file existence, resolve included control files, inspect GIS layers, or reject unknown model syntax.

## Behaviour contract

| Cursor context | Completions | Hover | Signature help |
| --- | --- | --- | --- |
| Left of `==` (or incomplete command) | Commands only from the current file's catalogue; whole phrase is replaced, with optional documented left-side modifiers. If `==` already exists, do not insert a second delimiter | Full recognised command phrase and suffixes, using a source-linked description | None |
| Right of `==`, no value | Documented literal choices, or a path placeholder **only** for source-backed file/GIS inputs | None | Only on an explicitly structured, audited multi-argument value |
| Right of `==`, partial value | Replace the whole editable value span with matching documented choices; no universal keywords | None | Explicit comma- or vertical-bar-delimited arguments only; active parameter follows the separator |
| Inside `!` or `#` comment | None | None | None |
| Unknown syntax / syntax-only file (`.tef`, `.toc`, etc.) | None | None | None |

Value completions do not promise exhaustive TUFLOW support or constrain numerical ranges. The `TGC` option for `Base Cell Size` is a documented literal alternative to a number, not an indication that other inputs are invalid. When no reliable argument count exists, signature help is omitted.

## Test and dependency notes

- Pure Node tests: `src/test/commandEditor.test.ts`, compiled to `out/test/commandEditor.test.js`; run with `node --test out/test/commandEditor.test.js` after `npm run compile`.
- VS Code Extension Host tests: `test/extension/commandEditor.test.cjs`, consumed by the `test/extension/**/*.test.cjs` harness in issue #2. Run `npm run test:extension` **after** the #2 build/test tooling is integrated. They exercise the actual VS Code completion, hover, signature and document language APIs.
- Issue #4 independently audits TCF/TGC data. The `Map Output Format` hover acceptance test is present but conditional until that verified entry is in the registry; the core hover provider already handles multiword commands without special cases.
- Issue #1 changes the registered VS Code language ID from `tuflow-helper` to `tuflow`. When #1 is merged, update the single registration call in `src/extension.ts` accordingly; no parser changes are required.
- No changes to file opening (owned by issue #1), provider diagnostics, TUFLOW runner, release selection, QGIS integration or publishing.
