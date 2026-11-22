# TUFLOW VS Code Extension

This extension provides syntax highlighting and IntelliSense support for TUFLOW files in Visual Studio Code.

TUFLOW is a powerful hydraulic modelling software used for flood simulation. This extension helps improve productivity when working with TUFLOW control files by providing syntax highlighting and command-editing assistance. Missing-file and conditional diagnostics are provided by the separately maintained TUFLOW Path Validator.

## Features

- **Syntax Highlighting**: Comprehensive syntax highlighting for all TUFLOW file types
- **Command Recognition**: Highlights recognised syntax patterns; this is not model or file-reference validation
- **IntelliSense**: Code completion for TUFLOW commands with detailed descriptions
- **Hover Support**: View command descriptions, syntax, and examples by hovering over commands
- **Signature Help**: Get parameter information when typing TUFLOW commands
- **Snippets**: Code snippets for common TUFLOW commands

## Recommended companion VS Code extensions

TUFLOW Helper focuses on control-file syntax highlighting and command-editing assistance. The following optional extensions complement it without requiring those features to be duplicated here:

- **[Open file (seito-openfile)](https://marketplace.visualstudio.com/items?itemName=Fr43nk.seito-openfile)** — opens a referenced file under the cursor. Use this for file navigation rather than TUFLOW Helper's legacy file-opening command.
- **[TUFLOW Path Validator](https://marketplace.visualstudio.com/items?itemName=Chain-Frost.tuflow-path-validator)** — checks TUFLOW control-file references and reports missing files and other supported issues through VS Code diagnostics. See its [source and documentation](https://github.com/Chain-Frost/tuflow_validator).
- **[Error Lens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens)** — optionally displays VS Code diagnostics directly beside the relevant lines, including those produced by TUFLOW Path Validator. It displays diagnostics; it does not perform TUFLOW validation itself.

These extensions are independent installations. TUFLOW Path Validator owns file-reference diagnostics, seito-openfile owns file opening, and TUFLOW Helper owns editor assistance. Compatibility of the two TUFLOW extensions' language registrations is being reviewed; refer to [the integration tracking issue](https://github.com/Chain-Frost/tuflow-vscode/issues/1). The [manual co-installation test](docs/co-installation-smoke-test.md) covers all three optional extensions without requiring or installing them.

## Supported File Types

- `.tcf` - TUFLOW Control Files
- `.ecf` - ESTRY Control Files
- `.tbc` - TUFLOW Boundary Condition Files
- `.tef` - TUFLOW Event Files
- `.tgc` - TUFLOW Geometry Control Files
- `.tmf` - TUFLOW Material Files
- `.ebc` - ESTRY Boundary Condition Files
- `.egf` - ESTRY Geometry Files
- `.rdf` - RAINFACE Definition Files
- `.trd` - TUFLOW Read Data Files
- `.erd` - ESTRY Read Data Files
- `.elf` - TUFLOW Log Filter Files
- `.tlf` - TUFLOW Log Filter Files
- `.trfcf` - TUFLOW Read File Check Files
- `.trfc` - TUFLOW Rainfall Control Files
- `.toc` - TUFLOW Operations Control Files (1D structure operating rules)
- `.qcf` - TUFLOW Quadtree Control Files
- `.fvc` - Flexible Volume Control Files
- `.fvm` - Flexible Volume Mesh Files
- `.fvsed` - Flexible Volume Sediment Files
- `.fvptm` - Flexible Volume Particle Tracking Module Files
- `.mcf` - Materials Control Files
- `.fvwq` - Flexible Volume Water Quality Files

## Requirements

- VS Code version 1.74.0 or higher

## Installation

1. Install from the VS Code Marketplace:
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search for "TUFLOW"
   - Click Install

2. Manual installation:
   - Download the `.vsix` file from releases
   - In VS Code, go to Extensions
   - Click the "..." menu and select "Install from VSIX"
   - Select the downloaded file

## Usage

### Syntax Highlighting

The extension provides syntax highlighting for recognised TUFLOW control-file syntax. Highlighting does not establish that a command or parameter is valid for your installed TUFLOW version.

### IntelliSense

As you type in TUFLOW files, the extension will provide code completion suggestions for commands. Simply start typing a command name and suggestions will appear.

Example:
```tuflow
Read GIS Z Shape ==
Set Mat ==
Define Event ==
```

### Official TUFLOW documentation

Run **TUFLOW: Open Documentation** from the Command Palette or the TUFLOW editor context menu. The extension opens the official [TUFLOW Classic/HPC User Manual 2026.3](https://docs.tuflow.com/classic-hpc/manual/2026.3/) in your web browser, choosing the relevant appendix for supported control-file extensions. Audited commands also carry official reference links in completions and hovers. If there is no active editor, the manual index opens instead. Unsupported extensions also fall back to that index.

Documentation is online; no scraped manuals are bundled and no project-relative document paths are used. The manual is pinned to a known edition rather than selecting a TUFLOW version. Refer to the manual for the TUFLOW build used by your model if it differs.

### Curated command snippets

In a TUFLOW file, type a prefix below and select the snippet from completion suggestions (or choose **Insert Snippet**). Each placeholder is editable and all example paths need to be adjusted for your own model.

| Prefix | Control file | Command or template |
| --- | --- | --- |
| `tcf-geometry` | .tcf | Geometry Control File |
| `tcf-boundaries` | .tcf | BC Control File |
| `tcf-end-time` | .tcf | End Time (hours) |
| `tgc-cell-size` | .tgc | Cell Size |
| `tgc-z-shape` | .tgc | Read GIS Z Shape (vector layer) |
| `tbc-database` | .tbc | BC Database |
| `ecf-network` | .ecf | Read GIS Network |
| `qcf-base-cell-size` | .qcf | Base Cell Size |
| `trfc-interpolation` | .trfc | RF Interpolation Method |
| `tef-event` | .tef | Define Event / End Define block |

The commands and defaults are checked against official manual appendices. The extension uses one VS Code language ID for several TUFLOW file types, so snippets are labelled by the intended file type rather than being automatically restricted by extension. See [verified snippet syntax and documentation sources](docs/documentation-and-snippets.md) and the [optional extension co-installation smoke-test protocol](docs/co-installation-smoke-test.md).


## Known Issues

- Currently, optional additional command keywords (such as the "MAX" in "Read GIS Z Shape MAX") are not supported by the syntax highlighting.

## Requirements

- [Node.js](https://nodejs.org/) version 22 or higher (development tooling)
- npm (comes with Node.js)

## Development

From a fresh clone, install dependencies, compile, lint and run unit plus VS Code Extension Host tests:
```bash
npm ci
npm run compile
npm run lint
npm test
```

To build and audit a local VSIX (without publishing it):
```bash
npm run package:vsix
```

On headless Linux, run the Extension Host tests with `xvfb-run -a npm test`. See [developer and CI instructions](docs/DEVELOPMENT.md) for packaging and manual installation checks.

To watch for changes and compile automatically:
```bash
npm run watch
```

## Release Notes

### 0.8.2

- Current package version; earlier changes were not recorded in the changelog.

### 0.8.1

- Added Node.js and npm development requirements documentation
- Added development commands information (compile, package, watch)

### 0.8.0

- Enhanced package metadata for marketplace compliance
- Improved README documentation
- Added comprehensive CHANGELOG

### 0.7.0

- Added TUFLOW FV file extensions
- Added TUFLOW 2023-03-AA release keywords

### 0.6.0

- Added additional keywords and extensions for TUFLOW Release 2020-01-AA
- Changed some syntax highlighting settings so "IF Scenario" and "If Event" controls were single colour

### 0.4.0

- Testing of initial example code completion/snippet feature. Try typing "Read GIS Z Shape".

### 0.3.0

- More syntax highlighting improvements.

### 0.2.0

- Minor improvements to syntax highlighting.

### 0.1.0

- Initial release of the TUFLOW Visual Studio Code extension.


