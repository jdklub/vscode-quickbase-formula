const assert = require('node:assert/strict');
const test = require('node:test');
const service = require('../lib/quickbase-language-service');
const hoverService = require('../lib/quickbase-hover-service');
const reference = require('../lib/quickbase-reference');
const catalog = service.buildFunctionCatalog(require('../snippets/snippets.json'), reference);

function diagnostics(source) {
    return service.validateText(source, catalog).diagnostics;
}

function hover(source, field) {
    return hoverService.getHoverData(source, source.lastIndexOf(field) + 1, catalog, reference);
}

test('field hints support assignment, arithmetic, and function argument checks', () => {
    assert.deepEqual(diagnostics([
        '// @qb-type [Amount]: Number',
        '// @qb-type [Start Date]: Date',
        'var Number total = [Amount] * 2;',
        'var Date next = [Start Date] + Days(1);',
        '$total'
    ].join('\n')), []);
    assert.equal(diagnostics('// @qb-type [Amount]: Text\n[Amount] * 2')[0].code, 'QB104');
    assert.equal(diagnostics('// @qb-type [Amount]: Number\nvar Text value = [Amount];')[0].code, 'QB102');
    assert.equal(diagnostics('// @qb-type [Amount]: Number\nLower([Amount])')[0].code, 'QB104');
});

test('hints apply throughout the formula, including after the referenced field', () => {
    const source = 'var Text result = [Amount];\n// @qb-type [Amount]: Number\n$result';
    assert.equal(diagnostics(source)[0].code, 'QB102');
    assert.equal(hover(source, '[Amount]').summary, 'Hinted as Number.');
});

test('only actual comments define field hints', () => {
    const examples = [
        '"// @qb-type [Amount]: Text";\n[Amount] * 2',
        '"https://example.com/@qb-type [Amount]: Text";\n[Amount] * 2',
        '[Label // @qb-type Amount: Text];\n[Amount] * 2',
        '// ordinary prose about @qb-type [Amount]: Text\n[Amount] * 2'
    ];
    for (const source of examples) {
        assert.deepEqual(Object.keys(service.getTypeHints(source).hints), [], source);
        assert.deepEqual(diagnostics(source), [], source);
    }
});

test('supported field types and aliases normalize consistently', () => {
    const types = {
        Boolean: 'bool', Number: 'number', Numeric: 'number', Text: 'text', TextList: 'textlist',
        Date: 'date', 'Date/Time': 'datetime', Duration: 'duration',
        TimeOfDay: 'timeofday', WorkDate: 'workdate', User: 'user', UserList: 'userlist'
    };
    for (const [label, expected] of Object.entries(types)) {
        const result = service.getTypeHints(`// @qb-type [Field]: ${label}\n[Field]`);
        assert.deepEqual(result.diagnostics, []);
        assert.equal(result.hints['[Field]'].type, expected);
    }
});

test('invalid hint syntax and unsupported types produce a warning at the comment', () => {
    for (const hint of [
        '// @qb-type [Amount] Number',
        '// @qb-type [Amount]: Banana',
        '// @qb-type [Amount]: constructor',
        '// @qb-type [Amount]: Table',
        '// @qb-type [Amount]: RecordList',
        '// @qb-type [ ]: Text',
        '// @qb-type $amount: Number'
    ]) {
        const source = `1;\r\n${hint}\r\n2`;
        const result = diagnostics(source);
        assert.equal(result.length, 1, source);
        assert.equal(result[0].code, 'QB112', source);
        assert.equal(result[0].severity, 'warning');
        assert.equal(result[0].startLine, 1);
        assert.equal(source.slice(result[0].start, result[0].end).trimEnd(), hint);
    }
});

test('identical hints are harmless and conflicting hints leave the field untyped', () => {
    assert.deepEqual(diagnostics('// @qb-type [Amount]: Number\n// @qb-type [Amount]: number\n[Amount]'), []);
    const source = [
        '// @qb-type [Amount]: Number',
        '// @qb-type [Amount]: Text',
        '// @qb-type [Amount]: Number',
        'var Date result = [Amount];',
        '$result'
    ].join('\n');
    const result = diagnostics(source);
    assert.equal(result.length, 1);
    assert.equal(result[0].code, 'QB113');
    assert.equal(result[0].startLine, 1);
    assert.equal(service.getTypeHints(source).hints['[Amount]'].type, 'unknown');
    assert.doesNotMatch(hover(source, '[Amount]').summary, /^Hinted as/);
});

test('hinted field hovers identify the type and explain that comments do not convert values', () => {
    const source = '// @qb-type [Amount]: Number\n[Amount]';
    const result = hover(source, '[Amount]');
    assert.equal(result.kind, 'bracketReference');
    assert.equal(result.summary, 'Hinted as Number.');
    assert.equal(source.slice(result.start, result.end), '[Amount]');
    assert.match(result.notes.join(' '), /does not convert the value in Quickbase/);
});

test('formula variables retain their declared types and cannot receive comment overrides', () => {
    const source = '// @qb-type $amount: Number\nvar Text amount = "ok";\n$amount';
    assert.equal(diagnostics(source)[0].code, 'QB112');
    const result = hoverService.getHoverData(source, source.lastIndexOf('$amount') + 1, catalog, reference);
    assert.equal(result.summary, 'Declared as Text.');
});

test('unhinted and differently spelled fields retain conservative inference', () => {
    assert.deepEqual(diagnostics('var Date next = [Start] + Days(1);'), []);
    assert.deepEqual(diagnostics('// @qb-type [Amount]: Text\n[amount] * 2'), []);
    assert.deepEqual(diagnostics('// @qb-type [Amount]: Text\n[Other] * 2'), []);
});

test('inline comments and escaped string quotes do not confuse hint detection', () => {
    const source = '"quoted \\" // @qb-type [Fake]: Text"; // @qb-type [Amount]: Number\r\n[Amount]';
    const result = service.getTypeHints(source);
    assert.deepEqual(result.diagnostics, []);
    assert.deepEqual(Object.keys(result.hints), ['[Amount]']);
    assert.equal(result.hints['[Amount]'].type, 'number');
});

test('standalone query values cannot declare field hints', () => {
    const source = "{'6'.EX.'// @qb-type [Amount]: Text'}";
    assert.deepEqual(Object.keys(service.getTypeHints(source).hints), []);
    assert.deepEqual(diagnostics(source), []);
});

test('known field types constrain table arguments while text DBIDs and aliases remain valid', () => {
    const call = 'GetRecords("{6.EX.a}", [Target])';
    assert.equal(diagnostics('// @qb-type [Target]: Number\n' + call)[0].code, 'QB104');
    assert.deepEqual(diagnostics('// @qb-type [Target]: Text\n' + call), []);
    assert.deepEqual(diagnostics('GetRecords("{6.EX.a}", [_DBID_PROJECTS])'), []);
    assert.deepEqual(diagnostics('GetRecords("{6.EX.a}", "bck7gp3q2")'), []);
});

test('WorkDate fields retain their type through supported weekday functions', () => {
    const hint = '// @qb-type [Start]: WorkDate\n';
    for (const expression of ['WeekdayAdd([Start], 2)', 'WorkdayAdd([Start], 2)']) {
        assert.deepEqual(diagnostics(hint + `var WorkDate next = ${expression};\n$next`), []);
        assert.equal(diagnostics(hint + `var Date next = ${expression};\n$next`)[0].code, 'QB102');
    }
    assert.deepEqual(diagnostics('// @qb-type [Start]: Date\nvar Date next = WeekdayAdd([Start], 2);\n$next'), []);
});
