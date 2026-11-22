'use strict';

// Isolated Extension Host acceptance test for issue #4.
// No TUFLOW simulation, existing workspace data or GeoPackages are accessed.
const path = require('node:path');
const { runTests } = require('@vscode/test-electron');

async function main() {
    const projectRoot = path.resolve(__dirname, '..');
    const args = [
        '--disable-extensions',
        '--skip-welcome',
        '--disable-workspace-trust'
    ];
    if (process.platform === 'linux') args.push('--no-sandbox', '--disable-gpu');

    console.log('Command catalogue Extension Host: Node', process.version,
        'platform', process.platform);
    await runTests({
        extensionDevelopmentPath: projectRoot,
        extensionTestsPath: path.join(projectRoot, 'test', 'extension',
            'command-catalogue.test.cjs'),
        launchArgs: args
    });
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
