const test = require('node:test');
const assert = require('node:assert/strict');
const service = require('../lib/quickbase-language-service');
const snippets = require('../snippets/snippets.json');
const reference = require('../lib/quickbase-reference');

const catalog = service.buildFunctionCatalog(snippets, reference);

function diagnostics(source, functions = catalog) {
    return service.validateText(source, functions).diagnostics;
}

function assertValidDeclaration(type, expression) {
    const source = `var ${type} result = ${expression};\n$result`;
    assert.deepEqual(diagnostics(source), [], source);
}

test('prototype names remain unknown functions, including with a plain external catalog', () => {
    for (const functions of [catalog, {}]) {
        for (const name of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
            const result = diagnostics(`${name}()`, functions);
            assert.equal(result.length, 1);
            assert.equal(result[0].code, 'QB105');
        }
    }
});

test('inherited function definitions are not catalog entries', () => {
    const inheritedCatalog = Object.create({
        fake: { name: 'Fake', signatures: [], returnStrategy: 'number' }
    });
    assert.equal(diagnostics('Fake()', inheritedCatalog)[0].code, 'QB105');
});

test('prototype names are valid variable names without false duplicates', () => {
    for (const name of ['constructor', 'toString', 'hasOwnProperty']) {
        assert.deepEqual(diagnostics(`var Text ${name} = "ok";\n$${name}`), []);
        assert.equal(diagnostics(`$${name}`)[0].code, 'QB101');
    }
    assert.equal(diagnostics('var constructor value = "ok";')[0].code, 'QB106');
});

test('date, timestamp, and time arithmetic preserves the documented result types', () => {
    const examples = [
        ['Date', 'Date(2026,1,1) + Days(1)'],
        ['Date', 'Days(1) + Date(2026,1,1)'],
        ['Date', 'Date(2026,1,2) - Days(1)'],
        ['Duration', 'Date(2026,1,2) - Date(2026,1,1)'],
        ['DateTime', 'Now() + Hours(1)'],
        ['DateTime', 'Hours(1) + Now()'],
        ['DateTime', 'Now() - Hours(1)'],
        ['Duration', 'Now() - ToTimestamp(Date(2026,1,1))'],
        ['TimeOfDay', 'ToTimeOfDay("2 pm") + Hours(1)'],
        ['TimeOfDay', 'Hours(1) + ToTimeOfDay("2 pm")'],
        ['TimeOfDay', 'ToTimeOfDay("2 pm") - Hours(1)'],
        ['Duration', 'ToTimeOfDay("3 pm") - ToTimeOfDay("2 pm")'],
        ['Date', 'Today() + Days(1)']
    ];
    for (const [type, expression] of examples) {
        assertValidDeclaration(type, expression);
    }
});

test('duration arithmetic distinguishes scaling from duration ratios', () => {
    const examples = [
        ['Duration', 'Days(1) + Hours(1)'],
        ['Duration', 'Days(1) - Hours(1)'],
        ['Duration', '3 * Days(2)'],
        ['Duration', 'Days(2) * 3'],
        ['Duration', 'Days(2) / 2'],
        ['Number', 'Days(2) / Days(1)'],
        ['Number', '2 + 3'],
        ['Number', '2 - 3'],
        ['Number', '2 * 3'],
        ['Number', '2 / 3'],
        ['Number', '2 ^ 3']
    ];
    for (const [type, expression] of examples) {
        assertValidDeclaration(type, expression);
    }
    assert.equal(diagnostics('var Duration ratio = Days(2) / Days(1);')[0].code, 'QB102');
});

test('unsupported arithmetic combinations still produce diagnostics', () => {
    for (const expression of [
        'Date(2026,1,1) + 1',
        'Days(1) + 1',
        'Days(1) - Date(2026,1,1)',
        'Days(1) * Days(2)',
        '2 / Days(1)',
        'Days(1) ^ 2',
        '"text" + 1'
    ]) {
        assert.equal(diagnostics(expression)[0].code, 'QB104', expression);
    }
});

test('unknown field types do not produce an invented arithmetic result type', () => {
    assertValidDeclaration('Date', '[Start Date] + Days(1)');
    assertValidDeclaration('Number', '[Work Amount] / Days(1)');
});

test('function return types match the documented conversions and overloads', () => {
    const examples = [
        ['Number', 'ToDays(Days(1))'],
        ['Text', 'UserToID(User())'],
        ['Number', 'WeekdaySub(Date(2026,1,2), Date(2026,1,1))'],
        ['Date', 'Today()'],
        ['Duration', 'Round(Days(3.5), Days(2))'],
        ['Number', 'Round(3.5, 2)'],
        ['Duration', 'Rem(Days(4), Days(3))'],
        ['Number', 'Rem(4, 3)']
    ];
    for (const [type, expression] of examples) {
        assertValidDeclaration(type, expression);
    }
});

test('known function results still reject incompatible declared types', () => {
    for (const [type, expression] of [
        ['Duration', 'ToDays(Days(1))'],
        ['Number', 'UserToID(User())'],
        ['Date', 'WeekdaySub(Date(2026,1,2), Date(2026,1,1))'],
        ['Duration', 'Today()'],
        ['Number', 'Round(Days(3.5), Days(2))'],
        ['Number', 'Rem(Days(4), Days(3))']
    ]) {
        const result = diagnostics(`var ${type} result = ${expression};`);
        assert.ok(result.some(item => item.code === 'QB102'), expression);
    }
});

test('date arithmetic results reject incompatible declared types', () => {
    for (const [type, expression] of [
        ['Number', 'Date(2026,1,1) + Days(1)'],
        ['Date', 'Date(2026,1,2) - Date(2026,1,1)'],
        ['Duration', 'Now() + Hours(1)'],
        ['Duration', 'ToTimeOfDay("2 pm") + Hours(1)']
    ]) {
        const result = diagnostics(`var ${type} result = ${expression};`);
        assert.ok(result.some(item => item.code === 'QB102'), expression);
    }
});

test('functions without return metadata retain an unknown result type', () => {
    const functions = service.buildFunctionCatalog({
        'Unspecified (Number value)': { prefix: 'Unspecified', body: 'Unspecified($1)' }
    });
    assert.deepEqual(diagnostics('var Text result = Unspecified(1);\n$result', functions), []);
});

test('query blocks require a joiner in standalone and formula queries', () => {
    for (const gap of ['', ' ', '\n']) {
        const query = `{'6'.EX.'A'}${gap}{'7'.EX.'B'}`;
        for (const source of [
            query,
            `GetRecords("${query.replace(/\n/g, ' ')}", [_DBID_PROJECTS])`,
            `var Text query = "${query.replace(/\n/g, ' ')}";\n$query`
        ]) {
            assert.equal(diagnostics(source)[0].code, 'QB108', source);
        }
    }
    for (const gap of ['AND', ' OR ', '\nAND\n']) {
        assert.deepEqual(diagnostics(`{'6'.EX.'A'}${gap}{'7'.EX.'B'}`), []);
    }
});

test('declaration data comes from formula syntax and includes source spans', () => {
    const source = [
        'var Text value = "var Number fake = 1;";',
        '// var Number value = 1;',
        'var Date next = Today();',
        '$value'
    ].join('\n');
    const declarations = service.getDeclarations(source);
    assert.deepEqual(declarations.map(({ name, declaredType }) => ({ name, declaredType })), [
        { name: 'value', declaredType: 'Text' },
        { name: 'next', declaredType: 'Date' }
    ]);
    for (const declaration of declarations) {
        assert.equal(source.slice(declaration.keyword.start, declaration.keyword.end), 'var');
        assert.equal(source.slice(declaration.typeStart, declaration.typeEnd), declaration.declaredType);
        assert.equal(source.slice(declaration.nameStart, declaration.nameEnd), declaration.name);
    }
    assert.deepEqual(service.getDeclarations("{'6'.EX.'var Number value = 1;'}"), []);
});

test('comment data excludes comment-like text in strings and references', () => {
    const source = [
        'var Text link = "https://example.com//quoted";',
        '[Field // Name]',
        '// actual comment',
        '$link // trailing comment'
    ].join('\n');
    const comments = service.getComments(source);
    assert.deepEqual(comments.map(({ text }) => text), [' actual comment', ' trailing comment']);
    for (const comment of comments) {
        assert.equal(source.slice(comment.start, comment.end), `//${comment.text}`);
    }
    assert.deepEqual(service.getComments("{'6'.EX.'https://example.com'}"), []);
});
