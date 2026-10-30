const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const hoverService = require('../lib/quickbase-hover-service');
const languageService = require('../lib/quickbase-language-service');
const reference = require('../lib/quickbase-reference');
const snippets = require('../snippets/snippets.json');
const catalog = languageService.buildFunctionCatalog(snippets, reference);

function hover(text, offset, functionCatalog = catalog) {
    return hoverService.getHoverData(text, offset, functionCatalog, reference);
}

test('commented declarations do not replace the real variable type', () => {
    const text = 'var Text value = "ok";\n// var Number value = 1;\n$value';

    assert.equal(hover(text, text.lastIndexOf('$value')).summary, 'Declared as Text.');
    assert.equal(hover(text, text.indexOf('// var') + 3), null);
});

test('declaration text inside a string does not replace the real variable type', () => {
    const text = 'var Text value = "var Number value = 1;";\n$value';

    assert.equal(hover(text, text.lastIndexOf('$value')).summary, 'Declared as Text.');
    assert.equal(hover(text, text.indexOf('var Number')), null);
});

test('uppercase declarations provide keyword, type, name, and reference hovers', () => {
    const text = 'VAR\tText value = "ok";\r\n$value';
    const keyword = hover(text, 1);
    const type = hover(text, text.indexOf('Text'));
    const name = hover(text, text.indexOf('value'));
    const variable = hover(text, text.lastIndexOf('$value'));

    assert.equal(keyword.kind, 'variableKeyword');
    assert.equal(text.slice(keyword.start, keyword.end), 'VAR');
    assert.equal(type.kind, 'variableType');
    assert.equal(type.label, 'Text');
    assert.equal(text.slice(type.start, type.end), 'Text');
    assert.equal(name.kind, 'variableDeclaration');
    assert.equal(name.summary, 'Declared as Text.');
    assert.equal(variable.kind, 'variableReference');
    assert.equal(variable.summary, 'Declared as Text.');
});

test('inherited function catalog properties do not produce a hover', () => {
    assert.equal(hover('constructor()', 1, {}), null);
    assert.equal(hover('Abs(1)', 1, Object.create({ abs: catalog.abs })), null);
});

test('known function and query hovers remain available', () => {
    const functionHover = hover('GetRecords("{6.EX.today}")', 1);
    const query = 'var Text query = "{6.EX.today}";';

    assert.equal(functionHover.kind, 'function');
    assert.ok(functionHover.signatures.includes('GetRecords(Text)'));
    assert.equal(hover(query, query.indexOf('EX')).kind, 'queryOperator');
    assert.equal(hover(query, query.indexOf('today')).kind, 'querySpecialValue');
});

test('global scripts support the existing Windows Script Host include order', () => {
    const context = vm.createContext({});
    for (const file of ['quickbase-reference.js', 'quickbase-language-service.js', 'quickbase-hover-service.js']) {
        const filename = path.join(__dirname, '..', 'lib', file);
        vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
    }
    const text = 'VAR Text value = "ok";\n// var Number value = 1;\n$value';
    const globalCatalog = context.QuickbaseLanguageService.buildFunctionCatalog(snippets, context.QuickbaseReference);
    const result = context.QuickbaseHoverService.getHoverData(text, text.lastIndexOf('$value'), globalCatalog, context.QuickbaseReference);

    assert.equal(result.summary, 'Declared as Text.');
});
