const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const os = require('node:os');
const test = require('node:test');
const hoverService = require('../lib/quickbase-hover-service');
const languageService = require('../lib/quickbase-language-service');
const reference = require('../lib/quickbase-reference');
const snippets = require('../snippets/snippets.json');
const grammarPath = path.join(__dirname, '..', 'syntaxes', 'quickbase.tmLanguage.json');
const catalog = languageService.buildFunctionCatalog(snippets, reference);

function hoverValue(value, operator = 'IR', quoted = true) {
    const literal = quoted ? `'${value}'` : value;
    const source = `{7.${operator}.${literal}}`;
    return hoverService.getHoverData(source, source.indexOf(value), catalog, reference);
}

const functionExamples = [
    ['Distance', 'Distance(42.36, -71.06, 40.71, -74.01)', /straight-line geographic distance/, 'https://help.quickbase.com/docs/distance-formula'],
    ['Find', 'Find("hello", "ello")', /one-based position/, 'https://help.quickbase.com/v1/docs/quickbase-april-2021-release-notes'],
    ['RemoveNewlineCharacters', 'RemoveNewlineCharacters("line")', /newline characters with a space/, 'https://help.quickbase.com/docs/quickbase-may-2024-release-notes'],
    ['StDev', 'StDev(GetRecords("{3.GT.0}"), 12)', /standard deviation/, 'https://intuitcorp.quickbase.com/nav/app/9kaw8phg/table/6ewwzuuj/action/dr?qid=21&rid=237&rl=gn&title=Formula+Functions+Reference+Home'],
    ['URLDecode', 'URLDecode("hello%20world")', /decoded text/, 'https://help.quickbase.com/docs/quickbase-august-2024-release-notes']
];

test('current function additions provide signatures, summaries, and official documentation links', () => {
    for (const [name, source, summary, docsUrl] of functionExamples) {
        const hover = hoverService.getHoverData(source, 1, catalog, reference);
        assert.equal(hover.kind, 'function', name);
        assert.equal(hover.label.toLowerCase(), name.toLowerCase());
        assert.ok(hover.signatures.length > 0, name + ' must have a signature');
        assert.match(hover.summary, summary);
        assert.equal(hover.docsUrl, docsUrl);
    }
});

test('GetAccessKey describes URL extraction rather than access-key generation', () => {
    const hover = hoverService.getHoverData('GetAccessKey()', 1, catalog, reference);
    assert.match(hover.summary, /Extracts the access key from the current URL/);
    assert.equal(hover.docsUrl, 'https://help.quickbase.com/docs/secure-links');
    assert.equal(hover.notes.length, 0);
});

test('documented named and counted relative date ranges have IR and XIR hovers', () => {
    const examples = ['tomorrow', 'yesterday'];
    for (const period of ['wk', 'mon', 'q', 'fq', 'y', 'fy']) {
        for (const direction of ['this', 'last', 'next']) {
            examples.push(`${direction} ${period}`);
        }
    }
    for (const period of ['d', 'wk', 'mon', 'q', 'fq', 'y', 'fy']) {
        examples.push(`last 5 ${period}`, `next 2 ${period}`);
    }
    for (const value of examples) {
        for (const operator of ['IR', 'XIR']) {
            const hover = hoverValue(value, operator);
            assert.equal(hover.kind, 'querySpecialValue', `${operator}: ${value}`);
            assert.equal(hover.label, `'${value}'`);
            assert.match(hover.summary, /Relative date range/);
            assert.equal(hover.docsUrl, 'https://help.quickbase.com/v1/docs/understanding-relative-date-ranges');
        }
    }
    assert.match(hoverValue('this fq').summary, /current fiscal quarter/);
    assert.match(hoverValue('next 1 fy').summary, /next 1 fiscal year\./);
    assert.match(hoverValue('last 5 d').summary, /previous 5 days/);
});

test('new relative date ranges need quotes and range operators', () => {
    for (const value of ['tomorrow', 'yesterday', 'next wk', 'last 5 d']) {
        assert.equal(hoverValue(value, 'EX'), null, value);
        assert.equal(hoverValue(value, 'IR', false), null, value);
    }
    for (const value of ['this d', 'this 3 wk', 'last five d', 'next century']) {
        assert.equal(hoverValue(value), null, value);
    }
});

test('legacy special date and current-user hovers remain available', () => {
    for (const [value, operator] of [['today', 'EX'], ['_curuser_', 'TV'], ['-1 days ago', 'EX']]) {
        assert.equal(hoverValue(value, operator).kind, 'querySpecialValue');
    }
    assert.equal(hoverValue('today', 'EX', false).kind, 'querySpecialValue');
    assert.equal(hoverValue('_curuser_', 'TV', false).kind, 'querySpecialValue');
});

function findVSCodeApp() {
    const candidates = [process.env.QUICKBASE_VSCODE_APP];
    if (process.platform === 'win32') {
        const roots = new Set([process.env.LOCALAPPDATA, path.join(os.homedir(), 'AppData', 'Local')]);
        for (const localAppData of roots) {
            if (!localAppData) {
                continue;
            }
            const installation = path.join(localAppData, 'Programs', 'Microsoft VS Code');
            candidates.push(path.join(installation, 'resources', 'app'));
            if (fs.existsSync(installation)) {
                for (const entry of fs.readdirSync(installation, { withFileTypes: true })) {
                    if (entry.isDirectory()) {
                        candidates.push(path.join(installation, entry.name, 'resources', 'app'));
                    }
                }
            }
        }
    }
    candidates.push('/Applications/Visual Studio Code.app/Contents/Resources/app', '/usr/share/code/resources/app', '/usr/lib/code/resources/app');
    return candidates.find(candidate => candidate && (
        fs.existsSync(path.join(candidate, 'node_modules', 'vscode-textmate', 'release', 'main.js')) ||
        fs.existsSync(path.join(candidate, 'node_modules.asar'))
    ));
}

function loadInstalledEngines(app) {
    const modules = path.join(app, 'node_modules');
    if (fs.existsSync(path.join(modules, 'vscode-textmate', 'release', 'main.js'))) {
        return {
            textmate: require(path.join(modules, 'vscode-textmate', 'release', 'main.js')),
            oniguruma: require(path.join(modules, 'vscode-oniguruma', 'release', 'main.js')),
            wasm: fs.readFileSync(path.join(modules, 'vscode-oniguruma', 'release', 'onig.wasm'))
        };
    }

    // VS Code can store its JavaScript packages in an ASAR archive. Read only
    // the required entries, then compile the installed modules without extraction.
    const archive = path.join(app, 'node_modules.asar');
    const descriptor = fs.openSync(archive, 'r');
    try {
        const prefix = Buffer.alloc(16);
        fs.readSync(descriptor, prefix, 0, prefix.length, 0);
        const headerBuffer = Buffer.alloc(prefix.readUInt32LE(12));
        fs.readSync(descriptor, headerBuffer, 0, headerBuffer.length, 16);
        const header = JSON.parse(headerBuffer.toString('utf8'));
        const dataOffset = 8 + prefix.readUInt32LE(4);
        function load(relative) {
            let entry = header;
            for (const part of relative.split('/')) {
                entry = entry.files[part];
            }
            const contents = Buffer.alloc(entry.size);
            fs.readSync(descriptor, contents, 0, contents.length, dataOffset + Number(entry.offset));
            const filename = archive + '/' + relative;
            const loaded = new Module(filename, module);
            loaded.filename = filename;
            loaded._compile(contents.toString('utf8'), filename);
            return loaded.exports;
        }
        return {
            textmate: load('vscode-textmate/release/main.js'),
            oniguruma: load('vscode-oniguruma/release/main.js'),
            wasm: fs.readFileSync(path.join(app, 'node_modules.asar.unpacked', 'vscode-oniguruma', 'release', 'onig.wasm'))
        };
    } finally {
        fs.closeSync(descriptor);
    }
}

const installedApp = findVSCodeApp();
test('the actual VS Code TextMate and Oniguruma engines tokenize current syntax', { skip: !installedApp && 'VS Code is unavailable; set QUICKBASE_VSCODE_APP to its resources/app directory' }, async t => {
    t.diagnostic('Grammar engines: ' + installedApp);
    const { textmate, oniguruma, wasm } = loadInstalledEngines(installedApp);
    await oniguruma.loadWASM(wasm);
    const rawGrammar = JSON.parse(fs.readFileSync(grammarPath, 'utf8'));
    const registry = new textmate.Registry({
        onigLib: Promise.resolve({
            createOnigScanner: patterns => new oniguruma.OnigScanner(patterns),
            createOnigString: value => new oniguruma.OnigString(value)
        }),
        loadGrammar: () => rawGrammar
    });
    try {
        const grammar = await registry.loadGrammar('source.quickbase');
        function scopeAt(source, offset) {
            const result = grammar.tokenizeLine(source, textmate.INITIAL);
            return result.tokens.find(token => offset >= token.startIndex && offset < token.endIndex).scopes;
        }
        for (const [name, source] of functionExamples) {
            assert.ok(scopeAt(source, 1).includes('support.function.quickbase'), name);
        }
        for (const value of ['today', '-1 days ago', 'tomorrow', 'yesterday', 'this wk', 'next mon', 'last q', 'this fq', 'next y', 'last fy', 'last 5 d', 'next 2 wk', 'last 3 mon', 'next 4 q', 'last 2 fq', 'next 3 y', 'last 2 fy']) {
            const query = `{7.IR.'${value}'}`;
            for (const source of [query, `GetRecords("${query}")`]) {
                assert.ok(scopeAt(source, source.indexOf(value)).includes('constant.language.quickbase.query.special'), value);
            }
        }
        for (const value of ['150', '-10', '+4', '0.5', '.5', '-.5']) {
            const query = `{72.LT.${value}}`;
            for (const source of [query, `GetRecords("${query}")`]) {
                assert.ok(scopeAt(source, source.indexOf(value, 5)).includes('constant.numeric.quickbase.query'), value);
            }
        }
        const grouped = `GetRecords("(({6.EX.'A'}OR{6.EX.'B'})AND{7.GTE.150})")`;
        const tokens = grammar.tokenizeLine(grouped, textmate.INITIAL).tokens;
        assert.equal(tokens.filter(token => token.scopes.includes('punctuation.section.group.begin.quickbase.query')).length, 2);
        assert.equal(tokens.filter(token => token.scopes.includes('punctuation.section.group.end.quickbase.query')).length, 2);
        assert.ok(!scopeAt(grouped, grouped.length - 1).includes('meta.query.group.quickbase'));
        const standaloneGroup = `(({6.EX.'A'}OR{6.EX.'B'})AND{7.GTE.150})`;
        assert.ok(scopeAt(standaloneGroup, 0).includes('punctuation.section.group.begin.quickbase.query'));
        assert.ok(scopeAt(standaloneGroup, standaloneGroup.length - 1).includes('punctuation.section.group.end.quickbase.query'));
        assert.ok(!scopeAt("{7.EX.'next fy'}", 8).includes('constant.language.quickbase.query.special'));
        assert.ok(!scopeAt('{7.IR.tomorrow}', 7).includes('constant.language.quickbase.query.special'));
        const quotedParens = `{6.EX.'text (with) parentheses'}`;
        assert.ok(scopeAt(quotedParens, quotedParens.indexOf('(')).includes('string.quoted.single.quickbase.query'));
        assert.ok(!scopeAt(quotedParens, quotedParens.indexOf('(')).includes('meta.query.group.quickbase'));
        const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'current-coverage.quickbase'), 'utf8');
        let ruleStack = textmate.INITIAL;
        for (const line of fixture.split(/\r?\n/)) {
            const result = grammar.tokenizeLine(line, ruleStack);
            ruleStack = result.ruleStack;
        }
        assert.equal(ruleStack.depth, textmate.INITIAL.depth);
    } finally {
        registry.dispose();
    }
});
