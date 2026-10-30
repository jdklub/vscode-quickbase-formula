const assert = require('node:assert/strict');
const test = require('node:test');
const service = require('../lib/quickbase-language-service');
const reference = require('../lib/quickbase-reference');
const snippets = require('../snippets/snippets.json');
const catalog = service.buildFunctionCatalog(snippets, reference);
const records = 'GetRecords("{6.GT.\'100\'}")';

function diagnostics(source) {
    return service.validateText(source, catalog).diagnostics;
}

function assertResult(type, expression, prefix = '') {
    const source = `${prefix}var ${type} result = ${expression};\n$result`;
    assert.deepEqual(diagnostics(source), [], source);
}

test('current function additions accept documented calls and infer their result types', () => {
    for (const [type, expression] of [
        ['Number', 'Distance(42.36, -71.06, 40.71, -74.01)'],
        ['Number', 'Distance(42.36, -71.06, 40.71, -74.01, "km")'],
        ['Number', 'Distance(42.36, -71.06, 40.71, -74.01, "miles")'],
        ['Number', 'Find("Hello World", "Wo")'],
        ['Text', 'RemoveNewlineCharacters("Hello\\r\\nWorld")'],
        ['Text', 'URLDecode("abc+def%26ghi%3D4")'],
        ['Number', `StDev(${records}, 6)`]
    ]) {
        assertResult(type, expression);
        const incorrectType = type === 'Text' ? 'Number' : 'Text';
        assert.ok(diagnostics(`var ${incorrectType} result = ${expression};`).some(item => item.code === 'QB102'), expression);
    }
});

test('new function overloads reject incorrect argument counts and types', () => {
    for (const expression of [
        'Distance(1, 2, 3)',
        'Distance(1, 2, 3, 4, "km", "extra")',
        'Find("Hello")',
        'RemoveNewlineCharacters()',
        'URLDecode("a", "b")',
        `StDev(${records})`
    ]) {
        assert.equal(diagnostics(expression)[0].code, 'QB103', expression);
    }
    for (const expression of [
        'Distance("42", 2, 3, 4)',
        'Distance(1, 2, 3, 4, 5)',
        'Find(1, "text")',
        'RemoveNewlineCharacters(1)',
        'URLDecode(false)',
        'StDev("records", 6)',
        `StDev(${records}, "field")`
    ]) {
        assert.equal(diagnostics(expression)[0].code, 'QB104', expression);
    }
});

test('formula-query aggregates return numbers and enforce the query overload', () => {
    for (const name of ['Average', 'Avg', 'Min', 'Max', 'Median', 'StDev']) {
        const expression = `${name}(${records}, 6)`;
        assertResult('Number', expression);
        assert.ok(diagnostics(`var RecordList result = ${expression};`).some(item => item.code === 'QB102'), name);
        assert.equal(diagnostics(`${name}(${records})`)[0].code, 'QB103', name);
        assert.equal(diagnostics(`${name}(${records}, 6, 7)`)[0].code, 'QB103', name);
        assert.equal(diagnostics(`${name}(${records}, "six")`)[0].code, 'QB104', name);
    }
});

test('ordinary aggregates preserve scalar types and ignore null arguments', () => {
    for (const [type, expression] of [
        ['Number', 'Average(1, 3, 2)'],
        ['Duration', 'Average(null, Days(1), Days(3))'],
        ['Date', 'Average(Today(), Today())'],
        ['DateTime', 'Average(Now(), Now())'],
        ['TimeOfDay', 'Average(ToTimeOfDay("1 pm"), ToTimeOfDay("3 pm"))'],
        ['Number', 'Median(1, 3, 2)'],
        ['Duration', 'Median(Days(1), Days(3), Days(2))'],
        ['Duration', 'Median(null, Days(1), Days(3))'],
        ['Text', 'Min("b", "a")'],
        ['Text', 'Max("b", "a")'],
        ['Date', 'Min(Today(), Today())'],
        ['DateTime', 'Max(Now(), Now())'],
        ['Duration', 'Min(null, Days(1), Days(3))'],
        ['Bool', 'Max(false, true)']
    ]) {
        assertResult(type, expression);
        const incorrectType = type === 'Text' ? 'Number' : 'Text';
        assert.ok(diagnostics(`var ${incorrectType} result = ${expression};`).some(item => item.code === 'QB102'), expression);
    }
    for (const expression of [
        'Average(1, Days(1))', 'Median(1, Days(1))', 'Median("a", "b")',
        'Min(1, "two")', 'Max(Days(1), 2)', `Min(1, ${records})`
    ]) {
        assert.equal(diagnostics(expression)[0].code, 'QB104', expression);
    }
    assert.equal(diagnostics('Median(1)')[0].code, 'QB103');
});

test('date, month, and number formatting overloads accept documented arguments', () => {
    for (const [type, expression] of [
        ['Date', 'ToDate(1678910133784)'],
        ['Date', 'ToDate("04/07/2014", "MMDDYYYY")'],
        ['Number', 'ToUnixTime(Today())'],
        ['Number', 'ToUnixTime(Now())'],
        ['Text', 'ToFormattedText(1234567.89, "comma_dot", 3)'],
        ['Text', 'NameOfMonth(Today(), "short")'],
        ['Text', 'NameOfMonth(Now(), "short")'],
        ['Text', 'NameOfMonth(12, "short")'],
        ['Text', 'NameOfMonth(Today())'],
        ['Text', 'NameOfMonth(Now())'],
        ['Text', 'NameOfMonth(12)']
    ]) {
        assertResult(type, expression);
    }
    for (const expression of [
        'ToDate(true)', 'ToDate("04/07/2014", 1)', 'ToDate(1234, "MMDDYYYY")',
        'ToUnixTime("2026-10-30")', 'ToFormattedText(1234, "comma_dot", "3")',
        'NameOfMonth(true, "short")', 'NameOfMonth(12, 1)'
    ]) {
        assert.equal(diagnostics(expression)[0].code, 'QB104', expression);
    }
    assert.equal(diagnostics('NameOfMonth(12, "short", "extra")')[0].code, 'QB103');
});

test('established literal field properties determine Boolean, Number, and Text results', () => {
    for (const [property, type] of [
        ['required', 'Bool'], ['unique', 'Bool'], ['maxLength', 'Number'],
        ['currencySymbol', 'Text'], ['fieldType', 'Text']
    ]) {
        const expression = `GetFieldProperty(15, "${property}")`;
        assertResult(type, expression);
        const incorrectType = type === 'Text' ? 'Number' : 'Text';
        assert.ok(diagnostics(`var ${incorrectType} result = ${expression};`).some(item => item.code === 'QB102'), property);
    }
    assertResult('Bool', 'GetFieldProperty([Field ID], "required")');
    assert.equal(diagnostics('GetFieldProperty("15", "required")')[0].code, 'QB104');
    assert.equal(diagnostics('GetFieldProperty(15, false)')[0].code, 'QB104');
});

test('unestablished and dynamic property names keep conservative result inference', () => {
    for (const property of ['currencyFormat', 'notEstablished', 'constructor']) {
        for (const type of ['Bool', 'Number', 'Text']) {
            assertResult(type, `GetFieldProperty(15, "${property}")`);
        }
    }
    for (const type of ['Bool', 'Number', 'Text']) {
        assertResult(type, 'GetFieldProperty(15, [Property])');
        assertResult(type, 'GetFieldProperty(15, $property)', 'var Text property = "required";\n');
    }
});

test('user list converters return semicolon-separated text rather than TextList', () => {
    for (const expression of [
        'UserListToEmails(ToUserList(User()))',
        'UserListToIDs(ToUserList(User()))',
        'UserListToNames(ToUserList(User()))',
        'UserListToNames(ToUserList(User()), "LF")'
    ]) {
        assertResult('Text', expression);
        assert.ok(diagnostics(`var TextList result = ${expression};`).some(item => item.code === 'QB102'), expression);
    }
    assert.equal(diagnostics('UserListToEmails("person@example.com")')[0].code, 'QB104');
});

test('field hints continue to constrain the new function and aggregate signatures', () => {
    assertResult('Number', 'Distance([Latitude], 1, 2, 3)', '// @qb-type [Latitude]: Number\n');
    assert.equal(diagnostics('// @qb-type [Latitude]: Text\nDistance([Latitude], 1, 2, 3)')[0].code, 'QB104');
    assertResult('Duration', 'Median([Elapsed], Days(1))', '// @qb-type [Elapsed]: Duration\n');
    assert.equal(diagnostics('// @qb-type [Elapsed]: Text\nMedian([Elapsed], Days(1))')[0].code, 'QB104');
    assert.equal(diagnostics('// @qb-type [Field ID]: Text\nGetFieldProperty([Field ID], "required")')[0].code, 'QB104');
});
