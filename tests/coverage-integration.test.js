const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const languageService = require('../lib/quickbase-language-service');
const hoverService = require('../lib/quickbase-hover-service');
const reference = require('../lib/quickbase-reference');
const catalog = languageService.buildFunctionCatalog(require('../snippets/snippets.json'), reference);

test('the current coverage fixture validates and exposes the new function and date hovers', () => {
    const source = fs.readFileSync(path.join(__dirname, 'fixtures', 'current-coverage.quickbase'), 'utf8');
    assert.deepEqual(languageService.validateText(source, catalog).diagnostics, []);

    for (const name of ['Distance', 'Find', 'RemoveNewlineCharacters', 'URLDecode', 'StDev']) {
        const hover = hoverService.getHoverData(source, source.indexOf(name) + 1, catalog, reference);
        assert.equal(hover.kind, 'function', name);
        assert.equal(hover.label.toLowerCase(), name.toLowerCase());
        assert.ok(hover.signatures.length > 0, name);
        assert.ok(hover.docsUrl.startsWith('https://'), name);
    }
    for (const value of ['tomorrow', 'yesterday', 'this wk', 'last 5 d', 'next 2 fq', 'this fy']) {
        const hover = hoverService.getHoverData(source, source.indexOf(value) + 1, catalog, reference);
        assert.equal(hover.kind, 'querySpecialValue', value);
        assert.match(hover.summary, /Relative date range/, value);
    }
});
