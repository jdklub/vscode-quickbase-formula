const test = require('node:test');
const assert = require('node:assert/strict');
const service = require('../lib/quickbase-language-service');
const snippets = require('../snippets/snippets.json');
const reference = require('../lib/quickbase-reference');
const catalog = service.buildFunctionCatalog(snippets, reference);

function diagnostics(source) {
    return service.validateText(source, catalog).diagnostics;
}

function formulaString(value) {
    return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function querySources(query) {
    const literal = formulaString(query);
    return [
        query,
        `GetRecords(${literal}, [_DBID_PROJECTS])`,
        `var Text filter = ${literal};\nGetRecords($filter, [_DBID_PROJECTS])`
    ];
}

test('unary plus accepts numbers and durations and preserves their types', () => {
    for (const source of [
        '+5', '+-5', '1 + +2', 'var Number value = +5;\n$value',
        'var Duration value = +Weeks(3);\n$value',
        '// @qb-type [Amount]: Number\n+[Amount]',
        '// @qb-type [Elapsed]: Duration\n+[Elapsed]'
    ]) {
        assert.deepEqual(diagnostics(source), [], source);
    }
    assert.equal(diagnostics('var Text value = +5;')[0].code, 'QB102');
});

test('unary plus keeps invalid operand warnings and unknown field inference', () => {
    for (const source of ['+"text"', '+true', '+Today()', '// @qb-type [Amount]: Text\n+[Amount]']) {
        assert.equal(diagnostics(source)[0].code, 'QB104', source);
    }
    assert.deepEqual(diagnostics('+[Unknown Field]'), []);
});

test('bare integer query values work in standalone, literal, and variable queries', () => {
    for (const value of ['0', '1', '-12', '+12', '123456789']) {
        for (const source of querySources(`{12.EX.${value}}`)) {
            assert.deepEqual(diagnostics(source), [], source);
        }
    }
});

test('unquoted decimals warn about truncation and highlight only the numeric value', () => {
    for (const value of ['5.6', '-5.6', '+5.6', '.5', '-.5', '5.']) {
        for (const source of querySources(`{12.EX.${value}}`)) {
            const result = diagnostics(source);
            assert.equal(result.length, 1, source);
            assert.equal(result[0].code, 'QB114');
            assert.equal(result[0].severity, 'warning');
            assert.match(result[0].message, /truncates.*quotes/);
            assert.equal(source.slice(result[0].start, result[0].end), value);
        }
    }
    for (const source of querySources("{12.EX.'5.6'}")) {
        assert.deepEqual(diagnostics(source), []);
    }
});

test('nested AND and OR query groups work in all query contexts', () => {
    const examples = [
        '({6.EX.1})',
        '({6.EX.1}OR{7.EX.2})AND{8.EX.3}',
        '{6.EX.1}AND({7.EX.2}OR({8.EX.3}AND{9.EX.4}))',
        '(({6.EX.1} OR {7.EX.2}) AND ({8.EX.3} OR {9.EX.4}))',
        '({6.EX.1}or{7.EX.2})and{8.EX.3}'
    ];
    for (const query of examples) {
        for (const source of querySources(query)) {
            assert.deepEqual(diagnostics(source), [], source);
        }
    }
});

test('query structure rejects missing joiners, operands, and group delimiters', () => {
    const examples = [
        '{6.EX.1}{7.EX.2}',
        '({6.EX.1})({7.EX.2})',
        '{6.EX.1}({7.EX.2})',
        '({6.EX.1}){7.EX.2}',
        '({6.EX.1}',
        '{6.EX.1})',
        '(({6.EX.1})',
        '({6.EX.1}AND())',
        '()AND{6.EX.1}',
        '({6.EX.1}AND)',
        '{6.EX.1}AND',
        'AND{6.EX.1}',
        '{6.EX.1}AND OR{7.EX.2}',
        '{6.EX.1}XOR{7.EX.2}',
        '{6.EX.1}AND(OR{7.EX.2})'
    ];
    for (const query of examples) {
        for (const source of querySources(query)) {
            assert.ok(diagnostics(source).some(item => item.code === 'QB108'), source);
        }
    }
});

test('malformed blocks and operators retain their specific diagnostics in groups', () => {
    for (const [query, code] of [
        ['({6.BAD.1})', 'QB107'],
        ['({6.ex.1})', 'QB110'],
        ['({6.EX.})', 'QB108'],
        ['({6.EX})', 'QB108'],
        ['({6})', 'QB108'],
        ["({6.EX.'open})", 'QB108'],
        ['({6.EX.1)', 'QB108']
    ]) {
        for (const source of querySources(query)) {
            assert.ok(diagnostics(source).some(item => item.code === code), source);
        }
    }
});

test('query arguments with only empty or incomplete groups still report errors', () => {
    for (const query of ['()', '( )', '(', ')', '(( ))', '(AND)']) {
        for (const source of [
            `GetRecords(${formulaString(query)})`,
            `var Text filter = ${formulaString(query)};\nGetRecords($filter)`
        ]) {
            assert.ok(diagnostics(source).some(item => item.code === 'QB108'), source);
        }
    }
});

test('quoted braces, parentheses, periods, and escaped apostrophes are query value text', () => {
    for (const query of [
        "({6.EX.'a } ( b { c ) . d'}OR{7.EX.1})",
        String.raw`({6.EX.'O\'Brien } ( Road'}AND{7.EX.1})`,
        String.raw`({6.EX."quoted \" } ( text"}OR{7.EX.1})`,
        "({'6.1'.EX.'value'}AND{7.EX.1})"
    ]) {
        for (const source of querySources(query)) {
            assert.deepEqual(diagnostics(source), [], source);
        }
    }
});

test('standalone query comments and multiline groups preserve diagnostic source spans', () => {
    const source = '// query comment with ( and {ignored}\r\n(\r\n{6.EX.1} // trailing comment\r\nOR {7.BAD.2}\r\n)';
    const result = diagnostics(source);
    assert.equal(result.length, 1);
    assert.equal(result[0].code, 'QB107');
    assert.equal(source.slice(result[0].start, result[0].end), 'BAD');
    assert.equal(result[0].startLine, 3);
    assert.equal(result[0].startCharacter, 6);
});

test('operator and decimal spans survive formula escapes and concatenated literals', () => {
    const query = String.raw`({6.EX.'O\'Brien'}AND{ 7 . BAD . 2})`;
    const source = `GetRecords(${formulaString(query)})`;
    const badOperator = diagnostics(source).find(item => item.code === 'QB107');
    assert.equal(source.slice(badOperator.start, badOperator.end), 'BAD');
    const split = 'GetRecords("(" & "{6.EX.1}" & "AND{7.BAD.2})")';
    const splitOperator = diagnostics(split).find(item => item.code === 'QB107');
    assert.equal(split.slice(splitOperator.start, splitOperator.end), 'BAD');
    const decimal = 'GetRecords("({6.EX.\\\"value\\\"}AND{12.EX. 5.6 })")';
    const decimalWarning = diagnostics(decimal).find(item => item.code === 'QB114');
    assert.equal(decimal.slice(decimalWarning.start, decimalWarning.end), '5.6');
});

test('diagnostic endpoints stay within the correct literal at fragment boundaries', () => {
    for (const [source, code, expected] of [
        ['GetRecords("{6.EX.5.6" & "}")', 'QB114', '5.6'],
        ['GetRecords("{6.BAD" & ".1}")', 'QB107', 'BAD'],
        ['GetRecords("{6." & "BAD.1}")', 'QB107', 'BAD'],
        ['GetRecords("{6.EX." & "5.6}")', 'QB114', '5.6'],
        ['GetRecords("{6.EX.5\\.6" & "}")', 'QB114', '5\\.6']
    ]) {
        const item = diagnostics(source).find(value => value.code === code);
        assert.ok(item, source);
        assert.equal(source.slice(item.start, item.end), expected, source);
    }
});

test('known concatenated query fragments support nested groups and dynamic values', () => {
    for (const source of [
        'GetRecords("(" & "{6.EX.1}" & "OR{7.EX.2})AND{8.EX.3}")',
        'var Text first = "({6.EX.1}OR{7.EX.2})";\nvar Text second = "{8.EX.3}";\nGetRecords($first & "AND(" & $second & ")")',
        'GetRecords("({6.EX.\'" & [Manager] & "\'}OR{7.EX.1})")',
        'GetRecords("({6.EX." & [Numeric Value] & "}OR{7.EX.1})")',
        'GetRecords("({6." & [Operator] & ".1}OR{7.EX.1})")'
    ]) {
        assert.deepEqual(diagnostics(source), [], source);
    }
});

test('dynamic query structure stays conservative while known bad blocks remain errors', () => {
    assert.deepEqual(diagnostics('GetRecords("(" & [Runtime Query] & ")AND{6.EX.1}")'), []);
    const source = 'GetRecords("(" & [Runtime Query] & ")AND{6.BAD.1}")';
    const result = diagnostics(source);
    assert.equal(result.length, 1);
    assert.equal(result[0].code, 'QB107');
    assert.equal(source.slice(result[0].start, result[0].end), 'BAD');
});

test('ordinary formulas, bracket references, strings, and comments retain their classification', () => {
    for (const source of [
        '([Amount] + +2)',
        '((1 + 2) * 3)',
        '// ({6.BAD.1})\n([Amount] + 1)',
        '"({6.BAD.1})"',
        '([Field {6.BAD.1}])',
        '// @qb-type [Amount]: Number\nvar Number total = +[Amount] * 2;\n$total'
    ]) {
        assert.deepEqual(diagnostics(source), [], source);
    }
});

test('automatic declaration checks skip embedded query-like text in CSS and prose', () => {
    for (const source of [
        'var Text style = "<style>.x {margin:0.5em;padding:0.5em;}</style>";\n$style',
        'var Text message = "The example is {6.EX.1}.";\n$message',
        'var Text json = "{\\"amount\\":0.5,\\"rate\\":0.5}";\n$json'
    ]) {
        assert.deepEqual(diagnostics(source), [], source);
    }
    const dynamicPrefix = 'var Text filter = [Runtime Prefix] & "{6.BAD.1}";\n$filter';
    assert.equal(diagnostics(dynamicPrefix)[0].code, 'QB107');
});

test('explicit query arguments still reject plain text before a query block', () => {
    for (const source of [
        'GetRecords("prefix{6.EX.1}")',
        'var Text filter = "prefix{6.EX.1}";\nGetRecords($filter)'
    ]) {
        const result = diagnostics(source);
        assert.equal(result.length, 1, source);
        assert.equal(result[0].code, 'QB108');
        assert.equal(source.slice(result[0].start, result[0].end), 'prefix');
    }
});
