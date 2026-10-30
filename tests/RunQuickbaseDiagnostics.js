var fs = require('fs');
var quickbaseReference = require('../lib/quickbase-reference');
var quickbaseLanguageService = require('../lib/quickbase-language-service');
var snippets = require('../snippets/snippets.json');

try {
    var catalog = quickbaseLanguageService.buildFunctionCatalog(snippets, quickbaseReference);
    var source = fs.readFileSync(process.argv[2], 'utf8');
    var validation = quickbaseLanguageService.validateText(source, catalog);
    var diagnostics = validation.diagnostics;
    var index;
    var item;

    if (!diagnostics.length) {
        console.log('OK');
    }

    for (index = 0; index < diagnostics.length; index += 1) {
        item = diagnostics[index];
        console.log(
            item.code + '|' + item.severity + '|' +
            (item.startLine + 1) + ':' + (item.startCharacter + 1) + '|' +
            item.message
        );
    }
} catch (error) {
    console.log('HARNESS|' + error.message);
    process.exitCode = 1;
}
