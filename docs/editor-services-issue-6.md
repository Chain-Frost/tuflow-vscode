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

## Audited syntax rendering (November 2026)

The command formatter must present documented operand placeholders as **literal code**, not unquoted Markdown. The [Windows issue #8 GUI acceptance](https://github.com/Chain-Frost/tuflow-vscode/pull/15#issuecomment-7091160677) showed `End Time == <time_in_hours>` rendered as `End Time ==` because VS Code treated the raw angle-bracket operand as HTML.

`documentationForCommand` now places **verified syntax** in a Markdown inline code span (with a safe delimiter when the syntax itself contains backticks). This preserves literal `<...>`, punctuation and optional modifiers without modifying command data. It applies to both completion and hover documentation through their common formatter. Unverified catalogue entries remain explicitly marked as unaudited.

Pure regression tests cover `RF Grid Origin == <OX>, <OY>`, the future audited `End Time == <time_in_hours>` form and embedded backticks. Extension Host coverage asserts the actual MarkdownString returned by VS Code hover. The integrated hours-based End Time regression is also exercised in disposable [QA PR #26](https://github.com/Chain-Frost/tuflow-vscode/pull/26), which is **not for merging**. The final *rendered* VS Code GUI acceptance is a separate check; do not claim it passed solely from Markdown source assertions.
