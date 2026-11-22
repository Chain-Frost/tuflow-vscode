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

test('both documented comment delimiters ignore whole-line and trailing directives', () => {
    for (const marker of ['#', '!']) {
        const wholeLine = '  ' + marker + ' Read GIS Z Shape == absent.gpkg';
        const commented = parseTuflowLine(wholeLine, 4);
        assert.equal(commented.kind, 'comment');
        assert.equal(commented.leftHand, null);
        assert.equal(commented.delimiter, null);
        assert.equal(commented.value, null);
        assert.equal(commented.comment?.text, marker + ' Read GIS Z Shape == absent.gpkg');
        assert.deepEqual(commented.comment?.range, {
            start: { line: 4, character: 2 },
            end: { line: 4, character: wholeLine.length }
        });
        assert.equal(lookupCommandsForFile('model.tgc', wholeLine).length, 0);

        const trailing = 'Start Time == 0  ' + marker + ' end of command';
        const parsed = parseTuflowLine(trailing, 9);
        assert.equal(parsed.kind, 'assignment');
        assert.equal(parsed.leftHand?.text, 'Start Time');
        assert.equal(parsed.value?.text, '0');
        assert.equal(parsed.comment?.text, marker + ' end of command');
        assert.deepEqual(parsed.comment?.range, {
            start: { line: 9, character: trailing.indexOf(marker) },
            end: { line: 9, character: trailing.length }
        });

        const emptyValue = parseTuflowLine('Start Time ==  ' + marker + ' pending');
        assert.equal(emptyValue.value, null);
        assert.equal(emptyValue.comment?.text, marker + ' pending');
    }
});

test('quoted comment markers remain in values and earliest unquoted marker wins', () => {
    for (const marker of ['#', '!']) {
        const other = marker === '#' ? '!' : '#';
        const line = 'Read GIS Z Shape == "model/' + marker + other + '.gpkg" ' +
            marker + ' first ' + other + ' second';
        const parsed = parseTuflowLine(line, 3);
        assert.equal(parsed.value?.text, '"model/' + marker + other + '.gpkg"');
        assert.equal(parsed.comment?.text, marker + ' first ' + other + ' second');
        assert.equal(parsed.comment?.range.start.character, line.indexOf(marker + ' first'));
        assert.equal(parsed.comment?.range.end.character, line.length);

        const quotedSingle = "Read GIS Z Shape == 'a" + marker + "b.gpkg' " + other + ' ignored';
        const single = parseTuflowLine(quotedSingle);
        assert.equal(single.value?.text, "'a" + marker + "b.gpkg'");
        assert.equal(single.comment?.text, other + ' ignored');
    }
    const doubledQuotes = parseTuflowLine('Command == "a""#b" # trailing');
    assert.equal(doubledQuotes.value?.text, '"a""#b"');
    assert.equal(doubledQuotes.comment?.text, '# trailing');
    const commentBeforeDelimiter = parseTuflowLine('Start Time # disabled == 0');
    assert.equal(commentBeforeDelimiter.delimiter, null);
    assert.equal(commentBeforeDelimiter.leftHand?.text, 'Start Time');
    assert.equal(commentBeforeDelimiter.comment?.text, '# disabled == 0');
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
    const tcf = lookupCommandsForFile('.tcf', 'Set Mat == 2');
    const tgc = lookupCommandsForFile('.TGC', 'Set Mat == 2');
    assert.equal(tcf.length, 1);
    assert.equal(tgc.length, 1);
    assert.equal(tcf[0].category, 'TCF');
    assert.equal(tgc[0].category, 'TGC');
    assert.notEqual(tcf[0].id, tgc[0].id);
    assert.ok(getCommandsByName('Set Mat').length >= 2);
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
            ['TBC', 'ECF', 'TRFC', 'QCF'].includes(command.category) ? 'verified' : 'needs-audit');
        assert.ok(command.canonicalName.length > 0);
    }
    const format = lookupCommandsForFile('.trfc', 'RF Grid Format == TIF')[0];
    assert.deepEqual(format.allowedValues, ['ASC', 'FLT', 'NC', 'TIF']);
    assert.ok(format.safeExamples.includes('RF Grid Format == TIF'));
    // A documented single-value keyword is not a multi-argument signature.
    assert.equal(format.parameters, undefined);
    assert.deepEqual(
        lookupCommandsForFile('.trfc', 'RF Grid Origin == 1, 2')[0].parameters,
        ['<OX>', '<OY>']
    );
    assert.deepEqual(
        lookupCommandsForFile('.ecf', 'BC Event Name == RAIN')[0].parameters,
        ['<bc_event_name>']
    );
    const uncertain = lookupCommandsForFile('.tcf', 'Define Source == something')[0];
    assert.equal(uncertain.valueKind, 'unknown');
    assert.equal(uncertain.allowedValues, undefined);
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
