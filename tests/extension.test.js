const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const test = require('node:test');

const extensionPath = path.join(__dirname, '..', 'extension.js');
const extensionRequire = createRequire(extensionPath);
const manifest = extensionRequire('./package.json');

function createDocument(text, fileName = 'example.quickbase', languageId = 'quickbase') {
    return {
        text,
        fileName,
        languageId,
        isClosed: false,
        uri: { toString: () => 'file:///' + fileName },
        getText() { return this.text; },
        positionAt(offset) {
            const prefix = this.text.slice(0, offset);
            return { line: prefix.split('\n').length - 1, character: offset - prefix.lastIndexOf('\n') - 1 };
        },
        offsetAt(position) {
            const lines = this.text.split('\n');
            return lines.slice(0, position.line).reduce((offset, line) => offset + line.length + 1, 0) + position.character;
        }
    };
}

function createExtension(visibleDocuments = []) {
    const listeners = { open: new Set(), change: new Set(), close: new Set() };
    const timers = new Map();
    const entries = new Map();
    const updates = [];
    let nextTimer = 1;
    let collectionDisposed = false;
    let hoverProvider;
    const subscriptions = [];

    function subscribe(event, handler) {
        listeners[event].add(handler);
        return { dispose() { listeners[event].delete(handler); } };
    }

    // These APIs exist in VS Code 1.18, including MarkdownString.appendCodeblock:
    // https://github.com/microsoft/vscode/blob/1.18.0/src/vs/vscode.d.ts
    class MarkdownString {
        constructor(value = '') { this.value = value; }
        appendCodeblock(value, language = '') {
            this.value += '\n```' + language + '\n' + value + '\n```\n';
            return this;
        }
    }

    const vscode = {
        DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
        Range: class Range {
            constructor(start, end) { Object.assign(this, { start, end }); }
        },
        Diagnostic: class Diagnostic {
            constructor(range, message, severity) { Object.assign(this, { range, message, severity }); }
        },
        MarkdownString,
        Hover: class Hover {
            constructor(contents, range) { Object.assign(this, { contents, range }); }
        },
        languages: {
            createDiagnosticCollection(name) {
                assert.equal(name, 'quickbase');
                return {
                    set(uri, diagnostics) {
                        assert.equal(collectionDisposed, false, 'cannot write to a disposed collection');
                        entries.set(uri.toString(), diagnostics);
                        updates.push({ uri: uri.toString(), diagnostics });
                    },
                    delete(uri) { entries.delete(uri.toString()); },
                    dispose() { collectionDisposed = true; entries.clear(); }
                };
            },
            registerHoverProvider(selector, provider) {
                assert.equal(selector, 'quickbase');
                hoverProvider = provider;
                return { dispose() { hoverProvider = undefined; } };
            }
        },
        workspace: {
            onDidOpenTextDocument: handler => subscribe('open', handler),
            onDidChangeTextDocument: handler => subscribe('change', handler),
            onDidCloseTextDocument: handler => subscribe('close', handler)
        },
        window: { visibleTextEditors: visibleDocuments.map(document => ({ document })) }
    };
    const sandbox = {
        module: { exports: {} },
        require: specifier => specifier === 'vscode' ? vscode : extensionRequire(specifier),
        setTimeout(callback, delay) {
            assert.equal(delay, 150);
            const id = nextTimer++;
            timers.set(id, callback);
            return id;
        },
        clearTimeout: id => timers.delete(id)
    };
    vm.runInNewContext(fs.readFileSync(extensionPath, 'utf8'), sandbox, { filename: extensionPath });
    sandbox.module.exports.activate({ subscriptions });

    return {
        entries,
        updates,
        timers,
        emit(event, document) {
            for (const handler of listeners[event]) {
                handler(event === 'change' ? { document } : document);
            }
        },
        runTimers() {
            for (const [id, callback] of [...timers]) {
                timers.delete(id);
                callback();
            }
        },
        hover(document, character) {
            return hoverProvider.provideHover(document, { line: 0, character });
        },
        dispose() { subscriptions.forEach(subscription => subscription.dispose()); }
    };
}

test('validates visible and newly opened Quickbase documents through the VS Code adapter', () => {
    const initial = createDocument('$missing');
    const extension = createExtension([initial]);
    const diagnostic = extension.entries.get(initial.uri.toString())[0];
    assert.equal(diagnostic.code, 'QB101');
    assert.equal(diagnostic.severity, 0);
    assert.equal(diagnostic.source, 'quickbase');
    assert.equal(diagnostic.message, 'Unknown variable $missing.');
    assert.equal(diagnostic.range.start.character, 0);
    assert.equal(diagnostic.range.end.character, 8);

    const opened = createDocument('1 + 2', 'opened.quickbase');
    extension.emit('open', opened);
    assert.equal(extension.entries.get(opened.uri.toString()).length, 0);
    extension.emit('open', createDocument('$missing', 'plain.txt', 'plaintext'));
    assert.equal(extension.updates.length, 2);
    extension.dispose();
});

test('coalesces edits and validates the latest text after the debounce', () => {
    const extension = createExtension();
    const document = createDocument('$missing');
    extension.emit('change', document);
    document.text = '1 + 2';
    extension.emit('change', document);
    assert.equal(extension.timers.size, 1);
    assert.equal(extension.updates.length, 0);
    extension.runTimers();
    assert.equal(extension.updates.length, 1);
    assert.equal(extension.entries.get(document.uri.toString()).length, 0);
    assert.equal(extension.timers.size, 0);
    extension.dispose();
});

test('cancels pending validation when a document closes', () => {
    const document = createDocument('$missing');
    const extension = createExtension([document]);
    extension.emit('change', document);
    document.isClosed = true;
    extension.emit('close', document);
    assert.equal(extension.timers.size, 0);
    extension.runTimers();
    assert.equal(extension.entries.has(document.uri.toString()), false);
    assert.equal(extension.updates.length, 1);
    extension.dispose();
});

test('a closed document cannot replace diagnostics from a reopened document', () => {
    const extension = createExtension();
    const oldDocument = createDocument('$missing');
    extension.emit('change', oldDocument);
    oldDocument.isClosed = true;
    extension.emit('close', oldDocument);
    const reopened = createDocument('1 + 2');
    extension.emit('open', reopened);
    extension.runTimers();
    assert.equal(extension.entries.get(reopened.uri.toString()).length, 0);
    assert.equal(extension.updates.length, 1);
    extension.dispose();
});

test('disposal clears all pending timers and prevents later validation', () => {
    const extension = createExtension();
    const first = createDocument('$missing', 'first.quickbase');
    const second = createDocument('$missing', 'second.quickbase');
    extension.emit('change', first);
    extension.emit('change', second);
    assert.equal(extension.timers.size, 2);
    extension.dispose();
    assert.equal(extension.timers.size, 0);
    extension.runTimers();
    extension.emit('change', first);
    extension.emit('open', second);
    assert.equal(extension.updates.length, 0);
    assert.equal(extension.entries.size, 0);
    assert.equal(extension.timers.size, 0);
    extension.dispose();
});

test('does not validate a closed document even if its timer callback already exists', () => {
    const extension = createExtension();
    const document = createDocument('$missing');
    extension.emit('change', document);
    document.isClosed = true;
    extension.runTimers();
    assert.equal(extension.updates.length, 0);
    extension.dispose();
});

test('creates function and type hovers with the VS Code 1.18 API surface', () => {
    const extension = createExtension();
    const document = createDocument('var RecordList records = GetRecords("{6.EX.1}");');
    const functionHover = extension.hover(document, document.text.indexOf('GetRecords') + 2);
    assert.match(functionHover.contents[0].value, /```quickbase\nGetRecords\(Text\)/);
    assert.match(functionHover.contents.map(part => part.value).join('\n'), /Returns a RecordList/);
    assert.match(functionHover.contents.at(-1).value, /\[Quickbase docs\]\(https:\/\//);
    assert.equal(functionHover.range.start.character, document.text.indexOf('GetRecords'));

    const typeHover = extension.hover(document, document.text.indexOf('RecordList') + 2);
    assert.match(typeHover.contents[0].value, /```quickbase\nRecordList\n```/);
    assert.equal(extension.hover(createDocument('// no reference here'), 4), null);
    extension.dispose();
});

test('the supported VS Code range excludes versions without the hover APIs', () => {
    const match = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(manifest.engines.vscode);
    assert.ok(match, 'the engine range must declare a caret minimum version');
    const minimum = match.slice(1).map(Number);
    const required = [1, 18, 0];
    let comparison = 0;
    for (let index = 0; index < minimum.length && comparison === 0; index += 1) {
        comparison = Math.sign(minimum[index] - required[index]);
    }
    assert.ok(comparison >= 0, 'MarkdownString.appendCodeblock requires VS Code 1.18 or later');
});
