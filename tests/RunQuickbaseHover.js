var fs = require('fs');
var quickbaseReference = require('../lib/quickbase-reference');
var quickbaseLanguageService = require('../lib/quickbase-language-service');
var quickbaseHoverService = require('../lib/quickbase-hover-service');
var snippets = require('../snippets/snippets.json');

function offsetAt(text, line, character) {
    var currentLine = 1;
    var currentCharacter = 1;
    var index;

    for (index = 0; index < text.length; index += 1) {
        if (currentLine === line && currentCharacter === character) {
            return index;
        }
        if (text.charAt(index) === '\n') {
            currentLine += 1;
            currentCharacter = 1;
        } else {
            currentCharacter += 1;
        }
    }

    return text.length;
}

try {
    var catalog = quickbaseLanguageService.buildFunctionCatalog(snippets, quickbaseReference);
    var line = parseInt(process.argv[3], 10);
    var character = parseInt(process.argv[4], 10);
    var source = fs.readFileSync(process.argv[2], 'utf8');
    var hover = quickbaseHoverService.getHoverData(source, offsetAt(source, line, character), catalog, quickbaseReference);
    var index;

    if (!hover) {
        console.log('NONE');
        process.exit(0);
    }

    console.log('KIND|' + hover.kind);
    console.log('LABEL|' + hover.label);
    if (hover.summary) {
        console.log('SUMMARY|' + hover.summary);
    }
    if (hover.signatures) {
        for (index = 0; index < hover.signatures.length; index += 1) {
            console.log('SIGNATURE|' + hover.signatures[index]);
        }
    }
    if (hover.notes) {
        for (index = 0; index < hover.notes.length; index += 1) {
            console.log('NOTE|' + hover.notes[index]);
        }
    }
    if (hover.docsUrl) {
        console.log('URL|' + hover.docsUrl);
    }
} catch (error) {
    console.log('HARNESS|' + error.message);
    process.exitCode = 1;
}
