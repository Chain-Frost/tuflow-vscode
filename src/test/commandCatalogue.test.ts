import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
    allTuflowCommands, createCommandRegistry, getCommandsByName, getCommandsForFile,
    getControlFileCategory, lookupCommandsForFile, normalizeCommandName, parseTuflowLine
} from '../commands';
import type { CommandDefinition } from '../commands';

test('assignment and comment preserve half-open UTF-16 source ranges', () => {
    const text = '  Read   GIS Z Shape  ==  "gis/road ! bank.gpkg"   ! description';
    const parsed = parseTuflowLine(text, 7);
    assert.equal(parsed.kind, 'assignment');
    assert.equal(parsed.leftHand?.text, 'Read   GIS Z Shape');
    assert.equal(parsed.value?.text, '"gis/road ! bank.gpkg"');
    assert.equal(parsed.comment?.text, '! description');
    const equals = text.indexOf('==');
    assert.deepEqual(parsed.delimiter?.range, {
        start: { line: 7, character: equals },
        end: { line: 7, character: equals + 2 }
    });
    assert.equal(parsed.value?.range.start.character, text.indexOf('"'));
    assert.equal(parsed.comment?.range.end.character, text.length);
});

test('quoted == and ! are not mistaken for syntax', () => {
    const single = parseTuflowLine("Read GIS BC == 'a!b==c.gpkg' ! trailing");
    assert.equal(single.value?.text, "'a!b==c.gpkg'");
    assert.equal(single.comment?.text, '! trailing');
    const quotedText = '"strange == phrase" == x ! note';
    const parsed = parseTuflowLine(quotedText);
    assert.equal(parsed.leftHand?.text, '"strange == phrase"');
    assert.equal(parsed.delimiter?.range.start.character, quotedText.indexOf(' == x') + 1);
    assert.equal(parseTuflowLine('Cmd == "a""!b" ! comment').value?.text, '"a""!b"');
});

test('blank, comments, incomplete and unknown entries never claim errors', () => {
    assert.equal(parseTuflowLine('\t  ').kind, 'empty');
    assert.equal(parseTuflowLine('   ! a note').kind, 'comment');
    assert.equal(parseTuflowLine('Read GIS').kind, 'incomplete');
    assert.equal(parseTuflowLine('  ==  ').kind, 'incomplete');
    assert.equal(parseTuflowLine('Start Time == ! pending').value, null);
    assert.equal(lookupCommandsForFile('.tgc', 'Unlisted Future Command == anything').length, 0);
    assert.equal(lookupCommandsForFile('.tef', 'Set Mat == 1').length, 0);
    assert.equal(lookupCommandsForFile('.tcf', '! Set Mat == 1').length, 0);
});

test('complete multiword lookup is case-insensitive and whitespace tolerant', () => {
    const matches = lookupCommandsForFile('folder\\MODEL.TGC', ' \t read   GIS   Z   sHaPe == gis/terrain.shp');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].name, 'Read GIS Z Shape');
    assert.equal(lookupCommandsForFile('.tgc', 'Read GIS Z Shape Extra == file').length, 0);
    assert.equal(normalizeCommandName(' RF  Grid Size ( N , M ) '), 'rf grid size (n,m)');
});

test('documented optional modifier groups are recognized only in order', () => {
    assert.equal(lookupCommandsForFile('.tgc', 'Read GIS Z Shape RIDGE XF ON == test.shp').length, 1);
    assert.equal(lookupCommandsForFile('.tgc', 'Read GIS Z Shape Write TIN == test.shp').length, 1);
    assert.equal(lookupCommandsForFile('.tgc', 'Read GIS Z Shape RIDGE == test.shp').length, 1);
    assert.equal(lookupCommandsForFile('.tgc', 'Read GIS Z Shape XF ON RIDGE == test.shp').length, 0);
    assert.equal(lookupCommandsForFile('.tgc', 'Read GIS Z Shape WRONG == test.shp').length, 0);
});

test('parentheses and numerical command names match', () => {
    const matches = lookupCommandsForFile('.trfc', 'RF Grid Size ( N, M ) == 50, 60');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].name, 'RF Grid Size (N,M)');
    assert.equal(createCommandRegistry([fixture('1D 2D Area (N,M)', 'TCF')])
        .lookup('.tcf', '1d  2d  AREA ( N, M ) == 5').length, 1);
});

test('duplicate names from different control files retain their context', () => {
    const tcf = lookupCommandsForFile('.tcf', 'Set IWL == 2');
    const tgc = lookupCommandsForFile('.TGC', 'Set IWL == 2');
    assert.equal(tcf.length, 1);
    assert.equal(tgc.length, 1);
    assert.equal(tcf[0].category, 'TCF');
    assert.equal(tgc[0].category, 'TGC');
    assert.notEqual(tcf[0].id, tgc[0].id);
    assert.ok(getCommandsByName('Set IWL').length >= 2);
    assert.equal(getControlFileCategory('C:\\runs\\MODEL.TGC'), 'TGC');
    assert.equal(getControlFileCategory('rainfall.tef'), undefined);
    assert.equal(getCommandsForFile('.tef').length, 0);
});

test('multiple matching definitions in one category remain distinct', () => {
    const registry = createCommandRegistry([fixture('Source', 'TCF', 'a'), fixture('Source', 'TCF', 'b')]);
    assert.deepEqual(registry.lookup('model.tcf', 'Source == x').map(value => value.id), ['a', 'b']);
    assert.equal(registry.lookup('model.tgc', 'Source == x').length, 0);
});

test('provenance and verified metadata do not silently certify legacy fields', () => {
    assert.ok(allTuflowCommands.length > 50);
    for (const command of allTuflowCommands) {
        assert.match(command.provenance.url, /^https:\/\/docs\.tuflow\.com\//);
        assert.match(command.provenance.section, /Appendix/);
        assert.equal(command.provenance.auditStatus,
            command.category === 'TCF' || command.category === 'TGC'
                ? 'verified' : 'needs-audit');
        assert.ok(command.canonicalName.length > 0);
    }
    const format = lookupCommandsForFile('.trfc', 'RF Grid Format == TIF')[0];
    assert.deepEqual(format.allowedValues, ['ASC', 'FLT', 'NC', 'TIF']);
    assert.deepEqual(format.safeExamples, ['RF Grid Format == TIF']);
    assert.equal(lookupCommandsForFile('.tcf', 'Define Source == something').length, 0);
    const remainingLegacy = getCommandsForFile('.tbc')[0];
    assert.equal(remainingLegacy.valueKind, 'unknown');
    assert.equal(remainingLegacy.allowedValues, undefined);
});

function fixture(name: string, category: CommandDefinition['category'], id = 'example'): CommandDefinition {
    return {
        id, name, canonicalName: name, category, categories: [category],
        description: 'Test fixture', suffixGroups: [], valueKind: 'unknown',
        safeExamples: [], provenance: {
            url: 'https://docs.tuflow.com/classic-hpc/manual/2025.1/',
            section: 'fixture', auditStatus: 'needs-audit', verifiedFields: []
        }
    };
}


const expectedAudited = {
    TCF: ["Start Time","End Time","Timestep","Cell Size","Map Output Interval","Time Series Output Interval","Start Map Output","End Map Output","Geometry Control File","BC Control File","ESTRY Control File","Event File","Quadtree Control File","Rainfall Control File","BC Database","Read Materials File","Read Soils File","Read GIS PO","Read GIS IWL","Set IWL","Solution Scheme","Hardware","GIS Format","GPKG Projection","SHP Projection","Output Folder","Log Folder","Map Output Data Types","Map Output Format","Time Series Output Format","Timestep Maximum","Read File","Write Check Files","Output Files EXCLUDE","Output Files INCLUDE","XMDF Map Output Interval","TIF Map Output Data Types"],
    TGC: ["Cell Size","Grid Size (N,M)","Grid Size (X,Y)","Origin","Orientation","Orientation Angle","Read GIS Location","Read Grid Location","Read GIS Code","Set Code","Set Code and Clean Zpt","Set Zpt","Read Grid Zpts","Read GIS Z Shape","Read GIS Mat","Read Grid Mat","Set Mat","Read GIS Soil","Read Grid Soil","Read GIS IWL","Read Grid IWL","Set IWL","Read GIS FLC","Read GIS FLC/L","Read GIS SRF","Read GIS WrF","Read GIS Layered FC Shape","Read GIS Variable Z Shape","Read TIN Zpts","Create TIN Zpts","Read File"]
} as const;

test('audited completion names are stable, context-specific and unique', () => {
    for (const category of ['TCF', 'TGC'] as const) {
        const commands = getCommandsForFile('.' + category.toLowerCase());
        assert.deepEqual(commands.map(cmd => cmd.name), [...expectedAudited[category]]);
        assert.equal(new Set(commands.map(cmd => cmd.name.toLowerCase())).size, commands.length);
        assert.ok(commands.every(cmd => cmd.category === category));
    }
});

test('TCF and TGC examples resolve against the audited registry', () => {
    for (const category of ['TCF', 'TGC'] as const) {
        const commands = getCommandsForFile('.' + category.toLowerCase());
        for (const command of commands) {
            assert.equal(command.provenance.auditStatus, 'verified');
            assert.ok(command.provenance.url.includes('/manual/2026.3/'));
            assert.ok(command.provenance.section.includes('Appendix'));
            assert.ok(command.safeExamples.length > 0, command.name);
            assert.ok(command.syntax?.startsWith(command.name + ' == '));
            for (const example of command.safeExamples) {
                assert.ok(example.includes(' == '), example);
                assert.ok(example.split(' == ')[1].trim(), example);
                assert.equal(
                    lookupCommandsForFile('.' + category.toLowerCase(), example).length,
                    1, 'No matching documented example: ' + example
                );
            }
        }
    }
});

test('TCF hours and output intervals are not misrepresented as clock times', () => {
    for (const name of ['Start Time', 'End Time']) {
        const matches = lookupCommandsForFile('.tcf', name + ' == 0');
        assert.equal(matches.length, 1);
        assert.match(matches[0].syntax ?? '', /time_in_hours/);
        assert.ok(matches[0].safeExamples.every(x => !/\d+:\d+/.test(x)));
    }
    assert.match(lookupCommandsForFile('.tcf', 'Map Output Interval == 900')[0].syntax ?? '',
        /time_in_seconds/);
    assert.equal(lookupCommandsForFile('.tcf', 'Solution Scheme == HPC')[0].valueKind,
        'keyword');
    assert.equal(lookupCommandsForFile('.tcf', 'Set Code == HPC').length, 0);
});

test('TGC raster guidance, vector Z Shapes and left-hand modifier groups', () => {
    const shape = lookupCommandsForFile('.tgc', 'Read GIS Z Shape == model.shp')[0];
    assert.ok(shape.safeExamples.every(x => !/\.(?:tif|asc)\b/i.test(x)));
    const grid = lookupCommandsForFile('.tgc', 'Read Grid Zpts == model.tif')[0];
    assert.ok(grid.safeExamples.some(x => x.endsWith('.tif')));
    assert.ok(grid.safeExamples.some(x => x.endsWith('.asc')));
    for (const suffix of ['ADD', 'MAX', 'MIN']) {
        assert.equal(lookupCommandsForFile('.tgc', 'Read Grid Zpts ' + suffix + ' == test.tif')
            .length, 1);
    }
    for (const suffix of ['RIDGE', 'GULLY', 'Write TIN', 'RIDGE XF ON']) {
        assert.equal(lookupCommandsForFile('.tgc', 'Read GIS Z Shape ' + suffix + ' == test.shp')
            .length, 1);
    }
    assert.ok(lookupCommandsForFile('.tgc', 'Read GIS Layered FC Shape == test.shp')[0]
        .safeExamples.some(x => x.includes('2d_lfcsh.shp')));
    assert.deepEqual(lookupCommandsForFile('.tgc', 'Set Mat == 1')[0].safeExamples,
        ['Set Mat == 1']);
});

test('quarantined invented or misplaced commands are not offered as suggestions', () => {
    for (const name of ['Read GIS', 'Write GIS', 'Write Results', 'Set Code', 'Define Source',
        'Set 1D Domain', 'Set 2D Domain', 'Set Mat']) {
        assert.equal(lookupCommandsForFile('.tcf', name + ' == sample').length, 0, name);
    }
    for (const name of ['Read GIS BC', 'Read GIS SX', 'Read GIS SA', 'Read GIS Pipe',
        'Set Grid', 'Set Extent', 'Set Origin', 'Set Node', 'Set Pipe']) {
        assert.equal(lookupCommandsForFile('.tgc', name + ' == sample').length, 0, name);
    }
    assert.equal(lookupCommandsForFile('.tgc', 'Future Unknown == sample').length, 0);
    assert.equal(parseTuflowLine('Future Unknown == sample').kind, 'assignment');
});
