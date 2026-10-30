var vscode = require('vscode');
var quickbaseHoverService = require('./lib/quickbase-hover-service');
var quickbaseLanguageService = require('./lib/quickbase-language-service');
var quickbaseReference = require('./lib/quickbase-reference');
var snippets = require('./snippets/snippets.json');

function activate(context) {
    var functionCatalog = quickbaseLanguageService.buildFunctionCatalog(snippets, quickbaseReference);
    var diagnostics = vscode.languages.createDiagnosticCollection('quickbase');
    var timers = Object.create(null);
    var disposed = false;

    function isQuickbaseDocument(document) {
        return !disposed && document && !document.isClosed &&
            (document.languageId === 'quickbase' || /\.quickbase$/i.test(document.fileName || ''));
    }

    function toSeverity(level) {
        if (level === 'error') {
            return vscode.DiagnosticSeverity.Error;
        }
        if (level === 'information') {
            return vscode.DiagnosticSeverity.Information;
        }
        if (level === 'hint') {
            return vscode.DiagnosticSeverity.Hint;
        }
        return vscode.DiagnosticSeverity.Warning;
    }

    function createHover(document, position) {
        var hoverData;
        var range;
        var contents = [];
        var markdown;

        if (!isQuickbaseDocument(document)) {
            return null;
        }

        hoverData = quickbaseHoverService.getHoverData(document.getText(), document.offsetAt(position), functionCatalog, quickbaseReference);
        if (!hoverData) {
            return null;
        }

        range = new vscode.Range(document.positionAt(hoverData.start), document.positionAt(hoverData.end));

        markdown = new vscode.MarkdownString();
        if (hoverData.signatures && hoverData.signatures.length) {
            markdown.appendCodeblock(hoverData.signatures.join('\n'), 'quickbase');
        } else {
            markdown.appendCodeblock(hoverData.label, 'quickbase');
        }
        contents.push(markdown);

        if (hoverData.summary) {
            contents.push(new vscode.MarkdownString(hoverData.summary));
        }

        if (hoverData.notes && hoverData.notes.length) {
            contents.push(new vscode.MarkdownString('- ' + hoverData.notes.join('\n- ')));
        }

        if (hoverData.docsUrl) {
            markdown = new vscode.MarkdownString('[Quickbase docs](' + hoverData.docsUrl + ')');
            markdown.isTrusted = true;
            contents.push(markdown);
        }

        return new vscode.Hover(contents, range);
    }

    function validateDocument(document) {
        var validation;
        var items;
        var index;
        var item;
        var range;
        var diagnostic;

        if (!isQuickbaseDocument(document)) {
            return;
        }

        validation = quickbaseLanguageService.validateText(document.getText(), functionCatalog);
        items = [];

        for (index = 0; index < validation.diagnostics.length; index += 1) {
            item = validation.diagnostics[index];
            range = new vscode.Range(document.positionAt(item.start), document.positionAt(item.end));
            diagnostic = new vscode.Diagnostic(range, item.message, toSeverity(item.severity));
            diagnostic.code = item.code;
            diagnostic.source = 'quickbase';
            items.push(diagnostic);
        }

        diagnostics.set(document.uri, items);
    }

    function scheduleValidation(document) {
        var key;

        if (!isQuickbaseDocument(document)) {
            return;
        }

        key = document.uri.toString();
        if (timers[key]) {
            clearTimeout(timers[key]);
        }

        timers[key] = setTimeout(function () {
            delete timers[key];
            validateDocument(document);
        }, 150);
    }

    context.subscriptions.push({
        dispose: function () {
            disposed = true;
            Object.keys(timers).forEach(function (key) {
                clearTimeout(timers[key]);
                delete timers[key];
            });
        }
    });
    context.subscriptions.push(diagnostics);
    context.subscriptions.push(vscode.languages.registerHoverProvider('quickbase', {
        provideHover: createHover
    }));
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(validateDocument));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(function (event) {
        scheduleValidation(event.document);
    }));
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(function (document) {
        var key = document.uri.toString();
        if (timers[key]) {
            clearTimeout(timers[key]);
            delete timers[key];
        }
        diagnostics.delete(document.uri);
    }));

    if (vscode.window && vscode.window.visibleTextEditors) {
        vscode.window.visibleTextEditors.forEach(function (editor) {
            validateDocument(editor.document);
        });
    }
}

function deactivate() {
}

module.exports = {
    activate: activate,
    deactivate: deactivate
};
