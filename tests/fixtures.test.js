const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const diagnosticsRunner = path.join(__dirname, 'RunQuickbaseDiagnostics.js');
const hoverRunner = path.join(__dirname, 'RunQuickbaseHover.js');
const fixture = name => path.join(__dirname, 'fixtures', name);

function runCli(runner, args, cwd = __dirname) {
    const result = spawnSync(process.execPath, [runner, ...args], { cwd, encoding: 'utf8' });

    assert.ifError(result.error);
    return result;
}

function successfulOutput(runner, args, cwd) {
    const result = runCli(runner, args, cwd);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(result.stderr, '');
    return result.stdout.replace(/\r\n/g, '\n').trimEnd();
}

for (const name of [
    'diagnostics-valid.quickbase',
    'diagnostics-standalone-query.quickbase',
    'diagnostics-newline-separated.quickbase'
]) {
    test(`diagnostics CLI accepts ${name}`, () => {
        assert.equal(successfulOutput(diagnosticsRunner, [fixture(name)]), 'OK');
    });
}

test('diagnostics CLI reports semantic errors with source positions', () => {
    const output = successfulOutput(diagnosticsRunner, [fixture('diagnostics-semantic-errors.quickbase')]);

    for (const expected of [
        'QB104|warning|1:30|Join() argument 1 expects TextList but received Text.',
        'QB102|warning|2:25|Declared type Number does not match initializer type Text.',
        'QB104|warning|2:30|Join() argument 1 expects TextList but received Text.',
        'QB107|error|3:24|Invalid Quickbase query operator "BAD".',
        'QB100|error|4:12|Duplicate variable declaration $query.',
        'QB101|error|5:22|Unknown variable $missingOwner.',
        'QB109|error|6:10|Quickbase variable names must use letters only.',
        'QB110|error|6:23|Quickbase query operators must be uppercase.',
        'QB111|warning|8:43|Regex pattern arguments must be string literals in Quickbase formulas.'
    ]) {
        assert.ok(output.split('\n').includes(expected), `Missing diagnostic: ${expected}\n${output}`);
    }
});

test('diagnostics CLI reports structural errors with source positions', () => {
    const output = successfulOutput(diagnosticsRunner, [fixture('diagnostics-structural-errors.quickbase')]);

    for (const expected of [
        'QB108|error|1:25|Unclosed Quickbase query block.',
        'QB104|warning|2:28|Join() argument 1 expects TextList but received Text.',
        'QB001|error|2:54|Expected ) to close the function call.',
        'QB104|warning|3:25|The not operator expects a Boolean value.'
    ]) {
        assert.ok(output.split('\n').includes(expected), `Missing diagnostic: ${expected}\n${output}`);
    }
});

const hoverCases = [
    {
        name: 'query operators', line: 1, character: 22,
        expected: [
            'KIND|queryOperator',
            'LABEL|EX',
            'SUMMARY|Matches records where the field is equal to the target value.'
        ]
    },
    {
        name: 'variable types', line: 2, character: 5,
        expected: [
            'KIND|variableType',
            'LABEL|RecordList',
            'SUMMARY|Intermediate list of records, typically consumed by formula-query functions.'
        ]
    },
    {
        name: 'declared variable references', line: 2, character: 35,
        expected: ['KIND|variableReference', 'LABEL|$query', 'SUMMARY|Declared as Text.']
    },
    {
        name: 'formula-query functions', line: 2, character: 23,
        expected: [
            'KIND|function',
            'LABEL|GetRecords',
            'SIGNATURE|GetRecords(Text)',
            'SIGNATURE|GetRecords(Text, Table)',
            'SUMMARY|Returns a RecordList of records that match a Quickbase query string.'
        ]
    },
    {
        name: 'quoted today values', line: 5, character: 35,
        expected: [
            'KIND|querySpecialValue',
            "LABEL|'today'",
            "SUMMARY|Special date query value that resolves to today's date for Date and Date/Time filters."
        ]
    },
    {
        name: 'relative date values', line: 6, character: 40,
        expected: [
            'KIND|querySpecialValue',
            "LABEL|'-1 days ago'",
            "SUMMARY|Relative date query value such as '2 days ago' or '-1 days ago'."
        ]
    },
    {
        name: 'current-user values', line: 7, character: 36,
        expected: [
            'KIND|querySpecialValue',
            "LABEL|'_curuser_'",
            'SUMMARY|Special user query value that resolves to the current user.'
        ]
    }
];

for (const { name, line, character, expected } of hoverCases) {
    test(`hover CLI describes ${name}`, () => {
        const output = successfulOutput(hoverRunner, [fixture('hover-reference.quickbase'), String(line), String(character)]);
        const lines = output.split('\n');

        assert.equal(lines[0], expected[0]);
        for (const entry of expected) {
            assert.ok(lines.includes(entry), `Missing hover entry: ${entry}\n${output}`);
        }
    });
}

for (const [name, runner, args] of [
    ['diagnostics', diagnosticsRunner, []],
    ['hover', hoverRunner, ['1', '1']]
]) {
    test(`${name} CLI exits with an error for a missing fixture`, () => {
        const result = runCli(runner, [fixture('does-not-exist.quickbase'), ...args]);

        assert.notEqual(result.status, 0);
        assert.match(result.stdout, /^HARNESS\|/);
    });

    test(`${name} CLI works from an unrelated working directory`, () => {
        const target = name === 'diagnostics' ? 'diagnostics-valid.quickbase' : 'hover-reference.quickbase';
        const output = successfulOutput(runner, [fixture(target), ...args], os.tmpdir());

        if (name === 'diagnostics') {
            assert.equal(output, 'OK');
        } else {
            assert.match(output, /^KIND\|variableKeyword\n/);
            assert.ok(output.split('\n').includes('LABEL|var'));
        }
    });
}
