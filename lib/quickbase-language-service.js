(function (root, factory) {
    var api = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.QuickbaseLanguageService = api;
    }
}(this, function () {
    var QUERY_OPERATORS = {
        CT: true,
        XCT: true,
        WC: true,
        HAS: true,
        XHAS: true,
        EX: true,
        TV: true,
        XTV: true,
        XEX: true,
        SW: true,
        XSW: true,
        BF: true,
        OBF: true,
        AF: true,
        OAF: true,
        IR: true,
        XIR: true,
        LT: true,
        LTE: true,
        GT: true,
        GTE: true
    };

    var VARIABLE_TYPES = {
        bool: true,
        number: true,
        text: true,
        textlist: true,
        date: true,
        datetime: true,
        duration: true,
        timeofday: true,
        workdate: true,
        user: true,
        userlist: true,
        recordlist: true
    };

    var MANUAL_SIGNATURES = {
        'if': {
            special: 'if'
        },
        'case': {
            special: 'case'
        },
        'includes': {
            signatures: [
                {
                    params: [{ type: 'userlist' }, { type: 'userlist' }],
                    minArgs: 2,
                    maxArgs: Infinity,
                    variadic: true,
                    variadicType: 'userlist'
                }
            ],
            returnStrategy: 'bool'
        }
    };

    var RETURN_STRATEGIES = {
        abs: 'same-as-first',
        adjustmonth: 'date',
        adjustyear: 'date',
        appid: 'text',
        average: 'aggregate',
        avg: 'number',
        base64decode: 'text',
        base64encode: 'text',
        begins: 'bool',
        ceil: 'same-as-first',
        contains: 'bool',
        count: 'number',
        date: 'date',
        day: 'number',
        dayofweek: 'number',
        dayofyear: 'number',
        days: 'duration',
        dbid: 'text',
        distance: 'number',
        ends: 'bool',
        exp: 'number',
        find: 'number',
        firstdayofmonth: 'date',
        firstdayofperiod: 'date',
        firstdayofweek: 'date',
        firstdayofyear: 'date',
        floor: 'same-as-first',
        frac: 'number',
        getaccesskey: 'text',
        getfieldproperty: 'field-property',
        getfieldvalues: 'textlist',
        getrecord: 'recordlist',
        getrecordbyuniquefield: 'recordlist',
        getrecords: 'recordlist',
        htmltotext: 'text',
        hour: 'number',
        hours: 'duration',
        includes: 'bool',
        int: 'number',
        isleapday: 'bool',
        isleapyear: 'bool',
        isnull: 'bool',
        isuseremail: 'bool',
        isweekday: 'bool',
        join: 'text',
        lastdayofmonth: 'date',
        lastdayofperiod: 'date',
        lastdayofweek: 'date',
        lastdayofyear: 'date',
        left: 'text',
        length: 'number',
        list: 'text',
        ln: 'number',
        log: 'number',
        lower: 'text',
        max: 'aggregate',
        median: 'aggregate',
        mid: 'text',
        min: 'aggregate',
        minute: 'number',
        minutes: 'duration',
        mod: 'same-as-first',
        month: 'number',
        msecond: 'number',
        mseconds: 'duration',
        nameofmonth: 'text',
        nextdayofweek: 'date',
        notleft: 'text',
        notright: 'text',
        now: 'datetime',
        nz: 'same-as-first',
        padleft: 'text',
        padright: 'text',
        part: 'text',
        prevdayofweek: 'date',
        pv: 'number',
        qb32decode: 'text',
        qb32encode: 'text',
        regexextract: 'text',
        regexmatch: 'bool',
        regexreplace: 'text',
        rem: 'same-as-first',
        removenewlinecharacters: 'text',
        right: 'text',
        round: 'same-as-first',
        searchandreplace: 'text',
        second: 'number',
        seconds: 'duration',
        sha256: 'text',
        size: 'number',
        split: 'textlist',
        sqrt: 'number',
        stdev: 'number',
        sum: 'same-as-first',
        sumvalues: 'number',
        toboolean: 'bool',
        todate: 'date',
        today: 'date',
        todays: 'number',
        toformattedtext: 'text',
        tohours: 'number',
        tominutes: 'number',
        tomseconds: 'number',
        tonumber: 'number',
        toseconds: 'number',
        totext: 'text',
        totimeofday: 'timeofday',
        totimestamp: 'datetime',
        tounixtime: 'number',
        touser: 'user',
        touserlist: 'userlist',
        toweekdayn: 'date',
        toweekdayp: 'date',
        toweeks: 'number',
        toworkdate: 'workdate',
        trim: 'text',
        upper: 'text',
        urldecode: 'text',
        urlencode: 'text',
        urlroot: 'text',
        user: 'user',
        userlisttoemails: 'text',
        userlisttoids: 'text',
        userlisttonames: 'text',
        userroles: 'textlist',
        usertoemail: 'text',
        usertoid: 'text',
        usertoname: 'text',
        weekdayadd: 'same-as-first',
        weekdaysub: 'number',
        weekofyear: 'number',
        weeks: 'duration',
        workdayadd: 'workdate',
        year: 'number'
    };

    // Operator overloads from the Quickbase formula reference.
    var ARITHMETIC_SIGNATURES = {
        '+': [
            ['number', 'number', 'number'],
            ['duration', 'duration', 'duration'],
            ['date', 'duration', 'date'],
            ['duration', 'date', 'date'],
            ['datetime', 'duration', 'datetime'],
            ['duration', 'datetime', 'datetime'],
            ['timeofday', 'duration', 'timeofday'],
            ['duration', 'timeofday', 'timeofday']
        ],
        '-': [
            ['number', 'number', 'number'],
            ['duration', 'duration', 'duration'],
            ['date', 'duration', 'date'],
            ['date', 'date', 'duration'],
            ['datetime', 'duration', 'datetime'],
            ['datetime', 'datetime', 'duration'],
            ['timeofday', 'duration', 'timeofday'],
            ['timeofday', 'timeofday', 'duration']
        ],
        '*': [
            ['number', 'number', 'number'],
            ['number', 'duration', 'duration'],
            ['duration', 'number', 'duration']
        ],
        '/': [
            ['number', 'number', 'number'],
            ['duration', 'duration', 'number'],
            ['duration', 'number', 'duration']
        ],
        '^': [
            ['number', 'number', 'number']
        ]
    };

    function createDictionary() {
        // Windows Script Host does not expose Object.create.
        return typeof Object.create === 'function' ? Object.create(null) : {};
    }

    function hasOwn(object, key) {
        return !!object && Object.prototype.hasOwnProperty.call(object, key);
    }

    function getOwn(object, key) {
        return hasOwn(object, key) ? object[key] : null;
    }

    function trim(value) {
        return String(value || '').replace(/^\s+|\s+$/g, '');
    }

    function startsWith(value, search) {
        return String(value).slice(0, search.length) === search;
    }

    function isDigit(character) {
        return character >= '0' && character <= '9';
    }

    function isIdentifierStart(character) {
        return !!character && /[A-Za-z_]/.test(character);
    }

    function isIdentifierPart(character) {
        return !!character && /[A-Za-z0-9_]/.test(character);
    }

    function createLineStarts(text) {
        var lineStarts = [0];
        var index;

        for (index = 0; index < text.length; index += 1) {
            if (text.charAt(index) === '\n') {
                lineStarts.push(index + 1);
            }
        }

        return lineStarts;
    }

    function positionAt(lineStarts, offset) {
        var safeOffset = offset;
        var low = 0;
        var high = lineStarts.length - 1;
        var mid;

        if (safeOffset < 0) {
            safeOffset = 0;
        }

        while (low <= high) {
            mid = Math.floor((low + high) / 2);
            if (lineStarts[mid] > safeOffset) {
                high = mid - 1;
            } else if (mid + 1 < lineStarts.length && lineStarts[mid + 1] <= safeOffset) {
                low = mid + 1;
            } else {
                return {
                    line: mid,
                    character: safeOffset - lineStarts[mid]
                };
            }
        }

        return {
            line: 0,
            character: safeOffset
        };
    }

    function normalizeTypeName(typeName) {
        var normalized = trim(typeName).toLowerCase();

        normalized = normalized.replace(/[<>]/g, '');
        normalized = normalized.replace(/\s+/g, '');
        normalized = normalized.replace(/date\/time/g, 'datetime');

        if (normalized === 'boolean') {
            return 'bool';
        }
        if (normalized === 'numeric') {
            return 'number';
        }
        if (normalized === 'time') {
            return 'timeofday';
        }
        if (normalized === 'table' || normalized === 'alias') {
            return 'table';
        }
        if (normalized === 'field') {
            return 'field';
        }
        if (normalized === 'record') {
            return 'recordlist';
        }
        if (normalized === 'null' || normalized === 'empty') {
            return 'null';
        }
        if (normalized === 'any') {
            return 'any';
        }

        return normalized;
    }

    function displayType(typeName) {
        var normalized = normalizeTypeName(typeName);
        var labels = {
            any: 'Any',
            bool: 'Boolean',
            number: 'Number',
            text: 'Text',
            textlist: 'TextList',
            date: 'Date',
            datetime: 'DateTime',
            duration: 'Duration',
            timeofday: 'TimeOfDay',
            workdate: 'WorkDate',
            user: 'User',
            userlist: 'UserList',
            recordlist: 'RecordList',
            table: 'Table',
            field: 'Field',
            'null': 'Null',
            reference: 'Reference',
            unknown: 'Unknown'
        };

        return labels[normalized] || typeName;
    }

    function normalizeFunctionName(name) {
        var compact = trim(name).replace(/\s+/g, ' ');
        var duplicateMatch = /^([A-Za-z_][A-Za-z0-9_]*)\s+\1$/i.exec(compact);

        if (duplicateMatch) {
            compact = duplicateMatch[1];
        }

        return compact;
    }

    function splitParameters(parameterText) {
        var rawParts = parameterText.split(',');
        var parts = [];
        var index;

        for (index = 0; index < rawParts.length; index += 1) {
            parts.push(trim(rawParts[index]));
        }

        return parts;
    }

    function parseParameter(part, previousType) {
        var value = trim(part);
        var variadic = false;
        var match;
        var typeName;

        if (!value) {
            return null;
        }

        if (value === '...') {
            return {
                type: previousType || 'any',
                variadic: true,
                placeholder: true
            };
        }

        if (/\.\.\.?$/.test(value)) {
            variadic = true;
            value = trim(value.replace(/\.\.\.?$/, ''));
        }

        match = /^<([^>]+)>/.exec(value);
        if (match) {
            typeName = match[1];
        } else {
            match = /^([A-Za-z]+(?:\/[A-Za-z]+)?)/.exec(value);
            typeName = match ? match[1] : 'any';
        }

        return {
            type: normalizeTypeName(typeName),
            variadic: variadic
        };
    }

    function createSignature(parameters) {
        var signature = {
            params: [],
            minArgs: 0,
            maxArgs: 0,
            variadic: false,
            variadicType: 'any'
        };
        var index;
        var parameter;
        var previousType = 'any';

        for (index = 0; index < parameters.length; index += 1) {
            parameter = parseParameter(parameters[index], previousType);
            if (!parameter) {
                continue;
            }

            if (parameter.placeholder && parameter.variadic) {
                signature.variadic = true;
                signature.variadicType = previousType || 'any';
                continue;
            }

            signature.params.push({ type: parameter.type });
            signature.minArgs += 1;
            signature.maxArgs += 1;
            previousType = parameter.type;

            if (parameter.variadic) {
                signature.variadic = true;
                signature.variadicType = parameter.type;
                signature.maxArgs = Infinity;
            }
        }

        return signature;
    }

    function parseSignatureKey(key) {
        var match = /^(.*?)\s*\((.*)\)$/.exec(key);
        var functionName;
        var parameterText;
        var signature;

        if (!match) {
            return null;
        }

        functionName = normalizeFunctionName(match[1]);
        parameterText = trim(match[2]);

        if (!functionName) {
            return null;
        }

        signature = createSignature(parameterText ? splitParameters(parameterText) : []);

        return {
            name: functionName,
            lowerName: functionName.toLowerCase(),
            signature: signature
        };
    }

    function ensureCatalogEntry(catalog, name) {
        if (!hasOwn(catalog, name)) {
            catalog[name] = {
                name: name,
                signatures: [],
                returnStrategy: getOwn(RETURN_STRATEGIES, name),
                special: null,
                summary: null,
                docsUrl: null,
                notes: null,
                queryArgumentIndexes: null,
                literalArgumentIndexes: null,
                literalArgumentMessage: null
            };
        }

        return catalog[name];
    }

    function cloneArray(values) {
        var result = [];
        var index;

        if (!values || !values.length) {
            return result;
        }

        for (index = 0; index < values.length; index += 1) {
            result.push(values[index]);
        }

        return result;
    }

    function applyReferenceMetadata(entry, metadata) {
        if (!entry || !metadata) {
            return;
        }

        if (metadata.summary) {
            entry.summary = metadata.summary;
        }
        if (metadata.docsUrl) {
            entry.docsUrl = metadata.docsUrl;
        }
        if (metadata.notes && metadata.notes.length) {
            entry.notes = cloneArray(metadata.notes);
        }
        if (metadata.queryArgumentIndexes && metadata.queryArgumentIndexes.length) {
            entry.queryArgumentIndexes = cloneArray(metadata.queryArgumentIndexes);
        }
        if (metadata.literalArgumentIndexes && metadata.literalArgumentIndexes.length) {
            entry.literalArgumentIndexes = cloneArray(metadata.literalArgumentIndexes);
        }
        if (metadata.literalArgumentMessage) {
            entry.literalArgumentMessage = metadata.literalArgumentMessage;
        }
    }

    function buildFunctionCatalog(snippets, referenceData) {
        var catalog = createDictionary();
        var key;
        var parsed;
        var entry;
        var override;
        var signatureIndex;
        var functionMetadata;

        for (key in snippets) {
            if (!hasOwn(snippets, key)) {
                continue;
            }

            parsed = parseSignatureKey(key);
            if (!parsed) {
                continue;
            }

            entry = ensureCatalogEntry(catalog, parsed.lowerName);
            entry.name = parsed.name;
            entry.signatures.push(parsed.signature);
        }

        for (key in MANUAL_SIGNATURES) {
            if (!hasOwn(MANUAL_SIGNATURES, key)) {
                continue;
            }

            override = MANUAL_SIGNATURES[key];
            entry = ensureCatalogEntry(catalog, key);
            if (override.special) {
                entry.special = override.special;
            }
            if (override.returnStrategy) {
                entry.returnStrategy = override.returnStrategy;
            }
            if (override.signatures) {
                entry.signatures = [];
                for (signatureIndex = 0; signatureIndex < override.signatures.length; signatureIndex += 1) {
                    entry.signatures.push(override.signatures[signatureIndex]);
                }
            }
        }

        functionMetadata = referenceData && referenceData.functionMetadata ? referenceData.functionMetadata : null;
        if (functionMetadata) {
            for (key in functionMetadata) {
                if (!hasOwn(functionMetadata, key)) {
                    continue;
                }

                entry = ensureCatalogEntry(catalog, key);
                applyReferenceMetadata(entry, functionMetadata[key]);
            }
        }

        return catalog;
    }

    function createDiagnostic(code, severity, message, start, end, lineStarts) {
        var startPosition = positionAt(lineStarts, start);
        var endPosition = positionAt(lineStarts, end < start ? start : end);

        return {
            code: code,
            severity: severity,
            message: message,
            start: start,
            end: end < start ? start : end,
            startLine: startPosition.line,
            startCharacter: startPosition.character,
            endLine: endPosition.line,
            endCharacter: endPosition.character
        };
    }

    function Tokenizer(text, lineStarts) {
        this.text = text || '';
        this.length = this.text.length;
        this.offset = 0;
        this.lineStarts = lineStarts;
        this.diagnostics = [];
        this.comments = [];
    }

    Tokenizer.prototype.peek = function (distance) {
        var safeDistance = typeof distance === 'number' ? distance : 0;
        var index = this.offset + safeDistance;

        if (index < 0 || index >= this.length) {
            return '';
        }

        return this.text.charAt(index);
    };

    Tokenizer.prototype.advance = function () {
        this.offset += 1;
    };

    Tokenizer.prototype.skipTrivia = function () {
        var character;
        var commentStart;

        while (this.offset < this.length) {
            character = this.peek(0);

            if (character === '/' && this.peek(1) === '/') {
                commentStart = this.offset;
                while (this.offset < this.length && this.peek(0) !== '\n') {
                    this.advance();
                }
                this.comments.push({
                    start: commentStart,
                    end: this.offset,
                    text: this.text.slice(commentStart + 2, this.offset)
                });
                continue;
            }

            if (/\s/.test(character)) {
                this.advance();
                continue;
            }

            break;
        }
    };

    Tokenizer.prototype.createToken = function (type, value, start, end, extras) {
        var token = {
            type: type,
            value: value,
            start: start,
            end: end
        };
        var key;

        if (extras) {
            for (key in extras) {
                if (extras.hasOwnProperty && !extras.hasOwnProperty(key)) {
                    continue;
                }
                token[key] = extras[key];
            }
        }

        return token;
    };

    Tokenizer.prototype.readNumber = function () {
        var start = this.offset;
        var sawDecimal = false;

        while (this.offset < this.length) {
            if (isDigit(this.peek(0))) {
                this.advance();
                continue;
            }

            if (this.peek(0) === '.' && !sawDecimal && isDigit(this.peek(1))) {
                sawDecimal = true;
                this.advance();
                continue;
            }

            break;
        }

        return this.createToken('number', this.text.slice(start, this.offset), start, this.offset);
    };

    Tokenizer.prototype.readIdentifier = function () {
        var start = this.offset;
        var value;
        var lowerValue;

        this.advance();
        while (isIdentifierPart(this.peek(0))) {
            this.advance();
        }

        value = this.text.slice(start, this.offset);
        lowerValue = value.toLowerCase();

        if (lowerValue === 'var') {
            return this.createToken('keyword', lowerValue, start, this.offset);
        }

        if (lowerValue === 'and' || lowerValue === 'or' || lowerValue === 'not') {
            return this.createToken('operatorKeyword', lowerValue, start, this.offset);
        }

        if (lowerValue === 'true' || lowerValue === 'false') {
            return this.createToken('boolean', lowerValue, start, this.offset);
        }

        if (lowerValue === 'null') {
            return this.createToken('null', lowerValue, start, this.offset);
        }

        return this.createToken('identifier', value, start, this.offset);
    };

    Tokenizer.prototype.readVariableReference = function () {
        var start = this.offset;

        this.advance();
        if (!isIdentifierStart(this.peek(0))) {
            this.diagnostics.push(createDiagnostic('QB001', 'error', 'Expected a variable name after $.', start, this.offset, this.lineStarts));
            return this.createToken('unknown', '$', start, this.offset);
        }

        while (isIdentifierPart(this.peek(0))) {
            this.advance();
        }

        return this.createToken('variableReference', this.text.slice(start, this.offset), start, this.offset);
    };

    Tokenizer.prototype.readBracketReference = function () {
        var start = this.offset;
        var closed = false;

        this.advance();
        while (this.offset < this.length) {
            if (this.peek(0) === ']') {
                this.advance();
                closed = true;
                break;
            }
            if (this.peek(0) === '\n') {
                break;
            }
            this.advance();
        }

        if (!closed) {
            this.diagnostics.push(createDiagnostic('QB003', 'error', 'Unterminated bracketed reference.', start, this.offset, this.lineStarts));
        }

        return this.createToken('bracketReference', this.text.slice(start, this.offset), start, this.offset);
    };

    Tokenizer.prototype.readString = function () {
        var start = this.offset;
        var innerStart;
        var closed = false;

        this.advance();
        innerStart = this.offset;

        while (this.offset < this.length) {
            if (this.peek(0) === '\\') {
                this.advance();
                if (this.offset < this.length) {
                    this.advance();
                }
                continue;
            }

            if (this.peek(0) === '"') {
                closed = true;
                break;
            }

            if (this.peek(0) === '\n') {
                break;
            }

            this.advance();
        }

        if (closed) {
            this.advance();
        } else {
            this.diagnostics.push(createDiagnostic('QB002', 'error', 'Unterminated string literal.', start, this.offset, this.lineStarts));
        }

        return this.createToken('string', this.text.slice(innerStart, closed ? this.offset - 1 : this.offset), start, this.offset, {
            raw: this.text.slice(start, this.offset),
            contentStart: innerStart,
            terminated: closed
        });
    };

    Tokenizer.prototype.nextToken = function () {
        var start;
        var twoCharacterOperator;
        var character;

        this.skipTrivia();

        if (this.offset >= this.length) {
            return this.createToken('eof', '', this.offset, this.offset);
        }

        start = this.offset;
        character = this.peek(0);
        twoCharacterOperator = character + this.peek(1);

        if (character === '$') {
            return this.readVariableReference();
        }

        if (character === '[') {
            return this.readBracketReference();
        }

        if (character === '"') {
            return this.readString();
        }

        if (isDigit(character)) {
            return this.readNumber();
        }

        if (isIdentifierStart(character)) {
            return this.readIdentifier();
        }

        if (twoCharacterOperator === '>=' || twoCharacterOperator === '<=' || twoCharacterOperator === '!=' || twoCharacterOperator === '<>') {
            this.advance();
            this.advance();
            return this.createToken('operator', twoCharacterOperator, start, this.offset);
        }

        if (character === '=' || character === '>' || character === '<' || character === '+' || character === '-' || character === '*' || character === '/' || character === '&' || character === '^') {
            this.advance();
            return this.createToken('operator', character, start, this.offset);
        }

        if (character === '(') {
            this.advance();
            return this.createToken('lparen', character, start, this.offset);
        }
        if (character === ')') {
            this.advance();
            return this.createToken('rparen', character, start, this.offset);
        }
        if (character === ',') {
            this.advance();
            return this.createToken('comma', character, start, this.offset);
        }
        if (character === ';') {
            this.advance();
            return this.createToken('semicolon', character, start, this.offset);
        }

        this.advance();
        this.diagnostics.push(createDiagnostic('QB001', 'error', 'Unexpected character "' + character + '".', start, this.offset, this.lineStarts));
        return this.createToken('unknown', character, start, this.offset);
    };

    function tokenize(text, lineStarts) {
        var tokenizer = new Tokenizer(text, lineStarts);
        var tokens = [];
        var token;

        do {
            token = tokenizer.nextToken();
            tokens.push(token);
        } while (token.type !== 'eof');

        return {
            tokens: tokens,
            comments: tokenizer.comments,
            diagnostics: tokenizer.diagnostics
        };
    }

    function Parser(tokens, lineStarts) {
        this.tokens = tokens;
        this.lineStarts = lineStarts;
        this.index = 0;
        this.diagnostics = [];
    }

    Parser.prototype.current = function () {
        return this.tokens[this.index];
    };

    Parser.prototype.previous = function () {
        return this.tokens[this.index - 1] || this.tokens[0];
    };

    Parser.prototype.isAtEnd = function () {
        return this.current().type === 'eof';
    };

    Parser.prototype.advance = function () {
        if (!this.isAtEnd()) {
            this.index += 1;
        }
        return this.previous();
    };

    Parser.prototype.check = function (type, value) {
        var token = this.current();

        if (!token) {
            return false;
        }
        if (token.type !== type) {
            return false;
        }
        if (typeof value !== 'undefined' && token.value !== value) {
            return false;
        }
        return true;
    };

    Parser.prototype.match = function (type, value) {
        if (this.check(type, value)) {
            this.advance();
            return true;
        }
        return false;
    };

    Parser.prototype.consume = function (type, message) {
        var token = this.current();

        if (this.check(type)) {
            return this.advance();
        }

        this.diagnostics.push(createDiagnostic('QB001', 'error', message, token.start, token.end, this.lineStarts));
        return {
            type: type,
            value: '',
            start: token.start,
            end: token.end
        };
    };

    Parser.prototype.hasImplicitStatementSeparator = function (statementEnd) {
        return positionAt(this.lineStarts, statementEnd).line < positionAt(this.lineStarts, this.current().start).line;
    };

    Parser.prototype.parseDocument = function () {
        var statements = [];
        var statement;

        while (!this.isAtEnd()) {
            if (this.match('semicolon')) {
                continue;
            }

            if (this.check('keyword', 'var')) {
                statement = this.parseVariableDeclaration();
            } else {
                statement = this.parseExpressionStatement();
            }

            statements.push(statement);

            if (this.match('semicolon')) {
                continue;
            }

            if (!this.isAtEnd() && !this.check('rparen') && !this.check('comma')) {
                if (this.hasImplicitStatementSeparator(statement.end)) {
                    continue;
                }

                this.diagnostics.push(createDiagnostic('QB001', 'error', 'Expected a semicolon or the end of the formula.', this.current().start, this.current().end, this.lineStarts));
                this.advance();
            }
        }

        return {
            statements: statements,
            diagnostics: this.diagnostics
        };
    };

    Parser.prototype.parseVariableDeclaration = function () {
        var varToken = this.advance();
        var typeToken = this.consume('identifier', 'Expected a Quickbase data type after var.');
        var nameToken = this.consume('identifier', 'Expected a variable name after the declared type.');
        var initializer = null;

        if (this.match('operator', '=')) {
            initializer = this.parseExpression();
        } else {
            this.diagnostics.push(createDiagnostic('QB001', 'error', 'Expected = followed by a variable initializer.', this.current().start, this.current().end, this.lineStarts));
        }

        return {
            type: 'VariableDeclaration',
            keyword: varToken,
            declaredType: typeToken.value,
            typeStart: typeToken.start,
            typeEnd: typeToken.end,
            name: nameToken.value,
            nameStart: nameToken.start,
            nameEnd: nameToken.end,
            start: varToken.start,
            end: initializer ? initializer.end : nameToken.end,
            initializer: initializer
        };
    };

    Parser.prototype.parseExpressionStatement = function () {
        var expression = this.parseExpression();

        return {
            type: 'ExpressionStatement',
            expression: expression,
            start: expression.start,
            end: expression.end
        };
    };

    Parser.prototype.parseExpression = function () {
        return this.parseBinaryExpression(1);
    };

    Parser.prototype.parseBinaryExpression = function (minimumPrecedence) {
        var left = this.parseUnaryExpression();
        var token;
        var precedence;
        var operator;
        var right;

        while (!this.isAtEnd()) {
            token = this.current();
            precedence = getPrecedence(token);
            if (precedence < minimumPrecedence) {
                break;
            }

            this.advance();
            operator = token.value;
            right = this.parseBinaryExpression(precedence + 1);
            left = {
                type: 'BinaryExpression',
                operator: operator,
                left: left,
                right: right,
                start: left.start,
                end: right.end
            };
        }

        return left;
    };

    Parser.prototype.parseUnaryExpression = function () {
        var token = this.current();
        var expression;

        if ((token.type === 'operatorKeyword' && token.value === 'not') || (token.type === 'operator' && (token.value === '-' || token.value === '+'))) {
            this.advance();
            expression = this.parseUnaryExpression();
            return {
                type: 'UnaryExpression',
                operator: token.value,
                expression: expression,
                start: token.start,
                end: expression.end
            };
        }

        return this.parsePrimaryExpression();
    };

    Parser.prototype.parsePrimaryExpression = function () {
        var token = this.current();
        var expression;
        var args;
        var nameToken;

        if (this.match('number')) {
            return {
                type: 'NumberLiteral',
                value: Number(token.value),
                raw: token.value,
                start: token.start,
                end: token.end
            };
        }

        if (this.match('string')) {
            return {
                type: 'StringLiteral',
                value: token.value,
                raw: token.raw,
                contentStart: token.contentStart,
                terminated: token.terminated,
                start: token.start,
                end: token.end
            };
        }

        if (this.match('boolean')) {
            return {
                type: 'BooleanLiteral',
                value: token.value === 'true',
                start: token.start,
                end: token.end
            };
        }

        if (this.match('null')) {
            return {
                type: 'NullLiteral',
                value: null,
                start: token.start,
                end: token.end
            };
        }

        if (this.match('variableReference')) {
            return {
                type: 'VariableReference',
                name: token.value.slice(1),
                raw: token.value,
                start: token.start,
                end: token.end
            };
        }

        if (this.match('bracketReference')) {
            return {
                type: 'BracketReference',
                name: token.value,
                start: token.start,
                end: token.end
            };
        }

        if (this.match('identifier')) {
            nameToken = token;
            if (this.match('lparen')) {
                args = this.parseArguments();
                return {
                    type: 'CallExpression',
                    callee: nameToken.value,
                    arguments: args.arguments,
                    start: nameToken.start,
                    end: args.end
                };
            }

            return {
                type: 'Identifier',
                name: nameToken.value,
                start: nameToken.start,
                end: nameToken.end
            };
        }

        if (this.match('lparen')) {
            expression = this.parseExpression();
            token = this.consume('rparen', 'Expected ) to close the parenthesized expression.');
            return {
                type: 'ParenthesizedExpression',
                expression: expression,
                start: expression.start,
                end: token.end
            };
        }

        this.diagnostics.push(createDiagnostic('QB001', 'error', 'Expected an expression.', token.start, token.end, this.lineStarts));
        this.advance();
        return {
            type: 'ErrorExpression',
            start: token.start,
            end: token.end
        };
    };

    Parser.prototype.parseArguments = function () {
        var args = [];
        var closingToken;

        if (this.match('rparen')) {
            return {
                arguments: args,
                end: this.previous().end
            };
        }

        do {
            args.push(this.parseExpression());
        } while (this.match('comma'));

        closingToken = this.consume('rparen', 'Expected ) to close the function call.');
        return {
            arguments: args,
            end: closingToken.end
        };
    };

    function getPrecedence(token) {
        if (!token) {
            return 0;
        }
        if (token.type === 'operatorKeyword') {
            if (token.value === 'or') {
                return 1;
            }
            if (token.value === 'and') {
                return 2;
            }
        }
        if (token.type === 'operator') {
            if (token.value === '=' || token.value === '!=' || token.value === '<>' || token.value === '>' || token.value === '<' || token.value === '>=' || token.value === '<=') {
                return 3;
            }
            if (token.value === '&') {
                return 4;
            }
            if (token.value === '+' || token.value === '-') {
                return 5;
            }
            if (token.value === '*' || token.value === '/' || token.value === '^') {
                return 6;
            }
        }
        return 0;
    }

    function collectDiagnostics(result, diagnostics) {
        var index;

        for (index = 0; index < diagnostics.length; index += 1) {
            result.push(diagnostics[index]);
        }

        result.sort(function (left, right) {
            if (left.start !== right.start) {
                return left.start - right.start;
            }
            if (left.end !== right.end) {
                return left.end - right.end;
            }
            return left.code < right.code ? -1 : 1;
        });
    }

    function isKnownVariableType(typeName) {
        return hasOwn(VARIABLE_TYPES, normalizeTypeName(typeName));
    }

    function canAssignType(targetType, sourceType) {
        var target = normalizeTypeName(targetType);
        var source = normalizeTypeName(sourceType);

        if (target === 'any' || source === 'any' || source === 'unknown') {
            return true;
        }
        if (source === 'null') {
            return true;
        }
        if (target === source) {
            return true;
        }

        return false;
    }

    function isNumberLike(typeName) {
        var normalized = normalizeTypeName(typeName);
        return normalized === 'number' || normalized === 'duration';
    }

    function isValidVariableName(name) {
        return /^[A-Za-z]+$/.test(String(name || ''));
    }

    function signatureAllowsCount(signature, argCount) {
        if (signature.variadic) {
            return argCount >= signature.minArgs;
        }
        return argCount >= signature.minArgs && argCount <= signature.maxArgs;
    }

    function getExpectedTypeForArgument(signature, index) {
        if (index < signature.params.length) {
            return signature.params[index].type;
        }
        if (signature.variadic) {
            return signature.variadicType || 'any';
        }
        return null;
    }

    function getArgumentTypes(args, state) {
        var argTypes = [];
        var index;

        for (index = 0; index < args.length; index += 1) {
            argTypes.push(inferExpressionType(args[index], state));
        }

        return argTypes;
    }

    function createTextTemplate(text, sourceStart, sourceEnd, dynamic) {
        return {
            text: String(text || ''),
            segments: [{
                generatedStart: 0,
                generatedEnd: String(text || '').length,
                sourceStart: sourceStart,
                sourceEnd: sourceEnd,
                dynamic: !!dynamic
            }]
        };
    }

    function cloneTemplateSegments(segments, offset) {
        var result = [];
        var index;
        var segment;

        for (index = 0; index < segments.length; index += 1) {
            segment = segments[index];
            result.push({
                generatedStart: segment.generatedStart + offset,
                generatedEnd: segment.generatedEnd + offset,
                sourceStart: segment.sourceStart,
                sourceEnd: segment.sourceEnd,
                dynamic: segment.dynamic
            });
        }

        return result;
    }

    function combineTextTemplates(left, right) {
        var combined = {
            text: left.text + right.text,
            segments: []
        };
        var index;

        for (index = 0; index < left.segments.length; index += 1) {
            combined.segments.push(left.segments[index]);
        }
        combined.segments = combined.segments.concat(cloneTemplateSegments(right.segments, left.text.length));

        return combined;
    }

    function makeDynamicTextTemplate(node) {
        return createTextTemplate('{{dynamic}}', node.start, node.end, true);
    }

    function createStringTextTemplate(node) {
        var value = node.value;
        var result = { text: '', segments: [] };
        var index = 0;
        var start;
        var generatedStart;

        while (index < value.length) {
            start = index;
            generatedStart = result.text.length;
            if (value.charAt(index) === '\\' && index + 1 < value.length) {
                result.text += value.charAt(index + 1);
                index += 2;
            } else {
                while (index < value.length && value.charAt(index) !== '\\') {
                    result.text += value.charAt(index);
                    index += 1;
                }
                if (index === start) {
                    result.text += value.charAt(index);
                    index += 1;
                }
            }
            result.segments.push({
                generatedStart: generatedStart,
                generatedEnd: result.text.length,
                sourceStart: node.contentStart + start,
                sourceEnd: node.contentStart + index,
                dynamic: false
            });
        }

        return result;
    }

    function toTextTemplate(node, state) {
        var left;
        var right;
        var symbol;

        if (!node) {
            return null;
        }

        switch (node.type) {
        case 'StringLiteral':
            return createStringTextTemplate(node);
        case 'ParenthesizedExpression':
            return toTextTemplate(node.expression, state);
        case 'BinaryExpression':
            if (node.operator !== '&') {
                return makeDynamicTextTemplate(node);
            }
            left = toTextTemplate(node.left, state) || makeDynamicTextTemplate(node.left);
            right = toTextTemplate(node.right, state) || makeDynamicTextTemplate(node.right);
            return combineTextTemplates(left, right);
        case 'VariableReference':
            symbol = getOwn(state.symbols, node.name);
            if (symbol && symbol.textTemplate) {
                return symbol.textTemplate;
            }
            return makeDynamicTextTemplate(node);
        default:
            return makeDynamicTextTemplate(node);
        }
    }

    function looksLikeQueryText(text) {
        var source = String(text || '');
        // Automatic checks on text declarations need a query prefix. Embedded
        // CSS, JSON, and examples can contain braces and periods as plain text.
        return /^\s*(?:(?:[()]|AND\b|OR\b|\{\{[^{}]+\}\})\s*)*\{\s*(?:['0-9]|\{\{)/i.test(source);
    }

    function isStandaloneQueryDocument(text) {
        var source = String(text || '');
        var index = 0;
        var match;

        // Stop before formula strings, fields, and function calls. Only query
        // punctuation and joiners can precede the first query block.
        while (index < source.length) {
            if (/\s/.test(source.charAt(index))) {
                index += 1;
            } else if (source.slice(index, index + 2) === '//') {
                index = source.indexOf('\n', index + 2);
                if (index < 0) {
                    return false;
                }
            } else if (source.charAt(index) === '(' || source.charAt(index) === ')') {
                index += 1;
            } else if (source.charAt(index) === '{') {
                return source.charAt(index + 1) !== '{';
            } else {
                match = /^(AND|OR)\b/i.exec(source.slice(index));
                if (!match) {
                    return false;
                }
                index += match[0].length;
            }
        }

        return false;
    }

    function mapGeneratedOffset(template, generatedOffset, preferEnd) {
        var offset = generatedOffset;
        var index;
        var segment;
        var relativeOffset;

        if (offset < 0) {
            offset = 0;
        }

        for (index = 0; index < template.segments.length; index += 1) {
            segment = template.segments[index];
            if (offset < segment.generatedEnd || (preferEnd && offset === segment.generatedEnd && offset > segment.generatedStart) || index === template.segments.length - 1) {
                if (segment.dynamic) {
                    return preferEnd ? segment.sourceEnd : segment.sourceStart;
                }
                if (offset >= segment.generatedEnd) {
                    return segment.sourceEnd;
                }
                relativeOffset = offset - segment.generatedStart;
                if (relativeOffset < 0) {
                    relativeOffset = 0;
                }
                if (segment.sourceStart + relativeOffset > segment.sourceEnd) {
                    return segment.sourceEnd;
                }
                return segment.sourceStart + relativeOffset;
            }
        }

        return 0;
    }

    function createTemplateDiagnostic(code, severity, message, start, end, template, lineStarts) {
        return createDiagnostic(
            code,
            severity,
            message,
            mapGeneratedOffset(template, start),
            mapGeneratedOffset(template, end, true),
            lineStarts
        );
    }

    function findQueryQuotedEnd(text, startIndex) {
        var quote = text.charAt(startIndex);
        var index = startIndex + 1;

        while (index < text.length) {
            if (text.charAt(index) === '\\') {
                index += 2;
            } else if (text.charAt(index) === quote) {
                return index + 1;
            } else {
                index += 1;
            }
        }

        return -1;
    }

    function findQueryBlock(text, startIndex) {
        var index = startIndex + 1;
        var placeholderEnd;
        var quotedEnd;

        while (index < text.length) {
            if (text.charAt(index) === "'" || text.charAt(index) === '"') {
                quotedEnd = findQueryQuotedEnd(text, index);
                if (quotedEnd < 0) {
                    return null;
                }
                index = quotedEnd;
                continue;
            }
            if (text.slice(index, index + 2) === '{{') {
                placeholderEnd = text.indexOf('}}', index + 2);
                if (placeholderEnd < 0) {
                    return null;
                }
                index = placeholderEnd + 2;
                continue;
            }

            if (text.charAt(index) === '}') {
                return {
                    start: startIndex,
                    end: index + 1,
                    text: text.slice(startIndex, index + 1)
                };
            }

            index += 1;
        }

        return null;
    }

    function findQueryDots(text) {
        var dots = [];
        var index = 0;
        var quotedEnd;
        var placeholderEnd;

        while (index < text.length && dots.length < 2) {
            if (text.charAt(index) === "'" || text.charAt(index) === '"') {
                quotedEnd = findQueryQuotedEnd(text, index);
                index = quotedEnd < 0 ? text.length : quotedEnd;
            } else if (text.slice(index, index + 2) === '{{') {
                placeholderEnd = text.indexOf('}}', index + 2);
                index = placeholderEnd < 0 ? text.length : placeholderEnd + 2;
            } else {
                if (text.charAt(index) === '.') {
                    dots.push(index);
                }
                index += 1;
            }
        }

        return dots;
    }

    function isQuotedQueryText(text) {
        return (text.charAt(0) === "'" || text.charAt(0) === '"') && findQueryQuotedEnd(text, 0) === text.length;
    }

    function isValidQueryField(fieldText) {
        if (!fieldText) {
            return false;
        }
        if (fieldText.charAt(0) === "'" && fieldText.length > 2 && isQuotedQueryText(fieldText)) {
            return true;
        }
        if (/^\d+$/.test(fieldText)) {
            return true;
        }
        if (/^\{\{[^{}]+\}\}$/.test(fieldText)) {
            return true;
        }
        return false;
    }

    function isValidQueryValue(valueText) {
        if (!valueText) {
            return false;
        }
        if (isQuotedQueryText(valueText)) {
            return true;
        }
        if (/^\{\{[^{}]+\}\}$/.test(valueText)) {
            return true;
        }
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(valueText)) {
            return true;
        }
        if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(valueText)) {
            return true;
        }
        return false;
    }

    function validateQueryBlock(block, template, state) {
        var queryText = block.text;
        var innerText = queryText.slice(1, queryText.length - 1);
        var dots = findQueryDots(innerText);
        var firstDot = dots.length ? dots[0] : -1;
        var secondDot;
        var fieldText;
        var operatorSegment;
        var operatorText;
        var rawOperatorText;
        var valueText;
        var operatorWhitespace;
        var operatorStart;
        var valueStart;

        if (firstDot < 0) {
            state.diagnostics.push(createTemplateDiagnostic('QB108', 'error', 'Malformed Quickbase query block.', block.start, block.end, template, state.lineStarts));
            return;
        }

        secondDot = dots.length > 1 ? dots[1] : -1;
        if (secondDot < 0) {
            state.diagnostics.push(createTemplateDiagnostic('QB108', 'error', 'Malformed Quickbase query block.', block.start, block.end, template, state.lineStarts));
            return;
        }

        fieldText = trim(innerText.slice(0, firstDot));
        operatorSegment = innerText.slice(firstDot + 1, secondDot);
        rawOperatorText = trim(operatorSegment);
        operatorText = rawOperatorText.toUpperCase();
        valueText = trim(innerText.slice(secondDot + 1));

        if (!isValidQueryField(fieldText)) {
            state.diagnostics.push(createTemplateDiagnostic('QB108', 'error', 'Malformed Quickbase query field reference.', block.start, block.end, template, state.lineStarts));
        }

        operatorWhitespace = (/^\s*/.exec(operatorSegment) || [''])[0].length;
        operatorStart = block.start + 1 + firstDot + 1 + operatorWhitespace;
        if (operatorText.indexOf('{{') >= 0) {
            // The expression supplies some or all of the operator at runtime.
        } else if (hasOwn(QUERY_OPERATORS, operatorText) && rawOperatorText !== operatorText) {
            state.diagnostics.push(createTemplateDiagnostic('QB110', 'error', 'Quickbase query operators must be uppercase.', operatorStart, operatorStart + rawOperatorText.length, template, state.lineStarts));
        } else if (!hasOwn(QUERY_OPERATORS, operatorText)) {
            state.diagnostics.push(createTemplateDiagnostic('QB107', 'error', 'Invalid Quickbase query operator "' + operatorText + '".', operatorStart, operatorStart + rawOperatorText.length, template, state.lineStarts));
        }

        if (!isValidQueryValue(valueText)) {
            state.diagnostics.push(createTemplateDiagnostic('QB108', 'error', 'Malformed Quickbase query value.', block.start, block.end, template, state.lineStarts));
        } else if (/^[+-]?(?:\d+\.\d*|\.\d+)$/.test(valueText)) {
            valueStart = block.start + 1 + secondDot + 1 + (/^\s*/.exec(innerText.slice(secondDot + 1)) || [''])[0].length;
            state.diagnostics.push(createTemplateDiagnostic('QB114', 'warning', 'Quickbase truncates unquoted decimal query values. Enclose the value in quotes.', valueStart, valueStart + valueText.length, template, state.lineStarts));
        }
    }

    function validateQueryTemplate(template, state) {
        var text = template.text || '';
        var index = 0;
        var start;
        var block;
        var tokens = [];
        var match;
        var dynamicStructure = false;
        var token;
        var groups = [];
        var expectOperand = true;
        var previous = null;
        var lastJoiner = null;

        while (index < text.length) {
            if (/\s/.test(text.charAt(index))) {
                index += 1;
                continue;
            }
            if (state.standaloneQuery && text.slice(index, index + 2) === '//') {
                index = text.indexOf('\n', index + 2);
                if (index < 0) {
                    index = text.length;
                }
                continue;
            }
            start = index;
            if (text.slice(index, index + 2) === '{{') {
                index = text.indexOf('}}', index + 2);
                index = index < 0 ? text.length : index + 2;
                dynamicStructure = true;
                continue;
            }
            if (text.charAt(index) === '{') {
                block = findQueryBlock(text, index);
                if (!block) {
                    state.diagnostics.push(createTemplateDiagnostic('QB108', 'error', 'Unclosed Quickbase query block.', index, text.length, template, state.lineStarts));
                    return;
                }
                validateQueryBlock(block, template, state);
                index = block.end;
                tokens.push({ type: 'block', start: start, end: index });
            } else if (text.charAt(index) === '(' || text.charAt(index) === ')') {
                index += 1;
                tokens.push({ type: text.charAt(start), start: start, end: index });
            } else {
                match = /^(AND|OR)\b/i.exec(text.slice(index));
                if (match) {
                    index += match[0].length;
                    tokens.push({ type: 'joiner', value: match[0].toUpperCase(), start: start, end: index });
                } else {
                    while (index < text.length && !/[\s{}()]/.test(text.charAt(index))) {
                        index += 1;
                    }
                    if (index === start) {
                        index += 1;
                    }
                    tokens.push({ type: 'invalid', start: start, end: index });
                }
            }
        }

        // A dynamic fragment outside a block can supply groups or joiners.
        // Validate the known blocks above, but do not invent its structure.
        if (dynamicStructure) {
            return;
        }

        for (index = 0; index < tokens.length; index += 1) {
            token = tokens[index];
            if (token.type === 'block' || token.type === '(') {
                if (!expectOperand) {
                    state.diagnostics.push(createTemplateDiagnostic('QB108', 'error', 'Quickbase query blocks must be joined with AND or OR.', token.start, token.end, template, state.lineStarts));
                }
                if (token.type === '(') {
                    groups.push(token);
                    expectOperand = true;
                } else {
                    expectOperand = false;
                }
                lastJoiner = null;
            } else if (token.type === ')') {
                if (!groups.length) {
                    state.diagnostics.push(createTemplateDiagnostic('QB108', 'error', 'Unexpected ) in the Quickbase query.', token.start, token.end, template, state.lineStarts));
                } else {
                    groups.pop();
                    if (expectOperand) {
                        state.diagnostics.push(createTemplateDiagnostic('QB108', 'error', previous && previous.type === '(' ? 'Quickbase query groups must not be empty.' : 'Expected a Quickbase query block before ).', token.start, token.end, template, state.lineStarts));
                    }
                }
                expectOperand = false;
                lastJoiner = null;
            } else if (token.type === 'joiner') {
                if (expectOperand) {
                    state.diagnostics.push(createTemplateDiagnostic('QB108', 'error', 'Expected a Quickbase query block before ' + token.value + '.', token.start, token.end, template, state.lineStarts));
                }
                expectOperand = true;
                lastJoiner = token;
            } else {
                state.diagnostics.push(createTemplateDiagnostic('QB108', 'error', expectOperand ? 'Expected a Quickbase query block or parenthesized group.' : 'Quickbase query blocks must be joined with AND or OR.', token.start, token.end, template, state.lineStarts));
            }
            previous = token;
        }

        if (expectOperand && lastJoiner) {
            state.diagnostics.push(createTemplateDiagnostic('QB108', 'error', 'Expected another Quickbase query block after ' + lastJoiner.value + '.', lastJoiner.start, lastJoiner.end, template, state.lineStarts));
        }
        for (index = 0; index < groups.length; index += 1) {
            state.diagnostics.push(createTemplateDiagnostic('QB108', 'error', 'Expected ) to close the Quickbase query group.', groups[index].start, groups[index].end, template, state.lineStarts));
        }
    }

    function validateQueryArgument(node, state) {
        var symbol;
        var template;

        if (!node) {
            return;
        }

        if (node.type === 'VariableReference') {
            symbol = getOwn(state.symbols, node.name);
            if (symbol && symbol.queryTemplateValidated) {
                return;
            }
        }

        template = toTextTemplate(node, state);
        if (!template) {
            return;
        }

        validateQueryTemplate(template, state);
    }

    function mergeTypes(types) {
        var merged = 'unknown';
        var index;
        var normalized;

        for (index = 0; index < types.length; index += 1) {
            normalized = normalizeTypeName(types[index]);
            if (normalized === 'unknown' || normalized === 'null') {
                continue;
            }
            if (merged === 'unknown') {
                merged = normalized;
                continue;
            }
            if (merged !== normalized) {
                return 'unknown';
            }
        }

        return merged;
    }

    function inferReturnType(functionName, argTypes, node) {
        var strategy = getOwn(RETURN_STRATEGIES, functionName) || 'unknown';
        var resultTypes;
        var index;
        var property;
        var propertyTypes;

        if (strategy === 'field-property') {
            property = node && node.arguments[1];
            if (!property || property.type !== 'StringLiteral') {
                return 'unknown';
            }
            propertyTypes = {
                currencySymbol: 'text',
                fieldType: 'text',
                maxLength: 'number',
                required: 'bool',
                unique: 'bool'
            };
            return getOwn(propertyTypes, property.value) || 'unknown';
        }

        if (strategy === 'aggregate') {
            if (argTypes.length && normalizeTypeName(argTypes[0]) === 'recordlist') {
                return 'number';
            }
            return mergeTypes(argTypes);
        }

        if (strategy === 'same-as-first') {
            return argTypes.length ? argTypes[0] : 'unknown';
        }

        if (strategy !== 'unknown') {
            return strategy;
        }

        if (functionName === 'if') {
            resultTypes = [];
            for (index = 1; index < argTypes.length; index += 2) {
                resultTypes.push(argTypes[index]);
            }
            if (argTypes.length % 2 === 1) {
                resultTypes.push(argTypes[argTypes.length - 1]);
            }
            return mergeTypes(resultTypes);
        }

        if (functionName === 'case') {
            resultTypes = [];
            for (index = 2; index < argTypes.length; index += 2) {
                resultTypes.push(argTypes[index]);
            }
            if (argTypes.length % 2 === 0) {
                resultTypes.push(argTypes[argTypes.length - 1]);
            }
            return mergeTypes(resultTypes);
        }

        return 'unknown';
    }

    function inferArithmeticType(node, leftType, rightType, state) {
        var left = normalizeTypeName(leftType);
        var right = normalizeTypeName(rightType);
        var signatures = ARITHMETIC_SIGNATURES[node.operator];
        var results = [];
        var index;
        var signature;
        var leftUnknown = left === 'unknown' || left === 'any' || left === 'null';
        var rightUnknown = right === 'unknown' || right === 'any' || right === 'null';

        for (index = 0; index < signatures.length; index += 1) {
            signature = signatures[index];
            if ((leftUnknown || left === signature[0]) && (rightUnknown || right === signature[1])) {
                results.push(signature[2]);
            }
        }

        if (!results.length) {
            state.diagnostics.push(createDiagnostic('QB104', 'warning', 'The ' + node.operator + ' operator does not accept ' + displayType(left) + ' and ' + displayType(right) + ' values.', node.start, node.end, state.lineStarts));
            return 'unknown';
        }

        if (left === 'null' || right === 'null') {
            return 'null';
        }

        return mergeTypes(results);
    }

    function validateIfCall(node, argTypes, state) {
        var index;
        var resultTypes = [];

        if (argTypes.length < 2) {
            state.diagnostics.push(createDiagnostic('QB103', 'warning', 'If() expects at least a condition and a result.', node.start, node.end, state.lineStarts));
            return 'unknown';
        }

        for (index = 0; index < argTypes.length - 1; index += 2) {
            if (normalizeTypeName(argTypes[index]) !== 'bool' && normalizeTypeName(argTypes[index]) !== 'unknown') {
                state.diagnostics.push(createDiagnostic('QB104', 'warning', 'If() condition arguments must be Boolean.', node.arguments[index].start, node.arguments[index].end, state.lineStarts));
            }
            if (index + 1 < argTypes.length) {
                resultTypes.push(argTypes[index + 1]);
            }
        }

        if (argTypes.length % 2 === 1) {
            resultTypes.push(argTypes[argTypes.length - 1]);
        }

        return mergeTypes(resultTypes);
    }

    function validateCaseCall(node, argTypes, state) {
        var selectorType;
        var index;
        var resultTypes = [];

        if (argTypes.length < 3) {
            state.diagnostics.push(createDiagnostic('QB103', 'warning', 'Case() expects a selector, one match value, and one result.', node.start, node.end, state.lineStarts));
            return 'unknown';
        }

        selectorType = normalizeTypeName(argTypes[0]);
        for (index = 1; index < argTypes.length - 1; index += 2) {
            if (selectorType !== 'unknown' && normalizeTypeName(argTypes[index]) !== selectorType && normalizeTypeName(argTypes[index]) !== 'unknown') {
                state.diagnostics.push(createDiagnostic('QB104', 'warning', 'Case() comparison values must match the selector type.', node.arguments[index].start, node.arguments[index].end, state.lineStarts));
            }
            if (index + 1 < argTypes.length) {
                resultTypes.push(argTypes[index + 1]);
            }
        }

        if (argTypes.length % 2 === 0) {
            resultTypes.push(argTypes[argTypes.length - 1]);
        }

        return mergeTypes(resultTypes);
    }

    function isTypeCompatible(expectedType, actualType, node) {
        var expected = normalizeTypeName(expectedType);
        var actual = normalizeTypeName(actualType);

        if (!expected || expected === 'any' || actual === 'any' || actual === 'unknown' || actual === 'null') {
            return true;
        }
        if (expected === actual) {
            return true;
        }
        if (expected === 'table' && actual === 'text') {
            return true;
        }
        if (expected === 'field' && node.type === 'BracketReference') {
            return true;
        }

        return false;
    }

    function validateEntrySpecificRules(node, entry, state) {
        var index;
        var argumentIndex;
        var argumentNode;
        var message;

        if (entry.queryArgumentIndexes && entry.queryArgumentIndexes.length) {
            for (index = 0; index < entry.queryArgumentIndexes.length; index += 1) {
                argumentIndex = entry.queryArgumentIndexes[index];
                if (argumentIndex >= node.arguments.length) {
                    continue;
                }
                validateQueryArgument(node.arguments[argumentIndex], state);
            }
        }

        if (entry.literalArgumentIndexes && entry.literalArgumentIndexes.length) {
            message = entry.literalArgumentMessage || 'This argument must be a string literal.';
            for (index = 0; index < entry.literalArgumentIndexes.length; index += 1) {
                argumentIndex = entry.literalArgumentIndexes[index];
                if (argumentIndex >= node.arguments.length) {
                    continue;
                }
                argumentNode = node.arguments[argumentIndex];
                if (argumentNode.type !== 'StringLiteral') {
                    state.diagnostics.push(createDiagnostic('QB111', 'warning', message, argumentNode.start, argumentNode.end, state.lineStarts));
                }
            }
        }
    }

    function validateGenericCall(node, entry, argTypes, state) {
        var arityMatches = [];
        var signatureIndex;
        var argIndex;
        var signature;
        var firstMismatch = null;
        var expectedType;
        var mismatch;
        var functionName = node.callee.toLowerCase();
        var aggregate = getOwn(RETURN_STRATEGIES, functionName) === 'aggregate';
        var firstArgType = argTypes.length ? normalizeTypeName(argTypes[0]) : 'unknown';
        var querySignature;
        var scalarType;

        validateEntrySpecificRules(node, entry, state);

        for (signatureIndex = 0; signatureIndex < entry.signatures.length; signatureIndex += 1) {
            signature = entry.signatures[signatureIndex];
            querySignature = signature.params.length && normalizeTypeName(signature.params[0].type) === 'recordlist';
            if (aggregate && firstArgType === 'recordlist' && !querySignature) {
                continue;
            }
            if (aggregate && firstArgType !== 'recordlist' && firstArgType !== 'unknown' && firstArgType !== 'any' && firstArgType !== 'null' && querySignature) {
                continue;
            }
            if (signatureAllowsCount(signature, node.arguments.length)) {
                arityMatches.push(signature);
            }
        }

        if (!arityMatches.length) {
            state.diagnostics.push(createDiagnostic('QB103', 'warning', 'No overload of ' + entry.name + ' accepts ' + node.arguments.length + ' argument(s).', node.start, node.end, state.lineStarts));
            return inferReturnType(functionName, argTypes, node);
        }

        for (signatureIndex = 0; signatureIndex < arityMatches.length; signatureIndex += 1) {
            signature = arityMatches[signatureIndex];
            mismatch = null;
            for (argIndex = 0; argIndex < node.arguments.length; argIndex += 1) {
                expectedType = getExpectedTypeForArgument(signature, argIndex);
                if (!isTypeCompatible(expectedType, argTypes[argIndex], node.arguments[argIndex])) {
                    mismatch = {
                        index: argIndex,
                        expectedType: expectedType,
                        actualType: argTypes[argIndex]
                    };
                    break;
                }
            }

            if (!mismatch) {
                querySignature = signature.params.length && normalizeTypeName(signature.params[0].type) === 'recordlist';
                if (aggregate && !querySignature) {
                    scalarType = 'unknown';
                    for (argIndex = 0; argIndex < argTypes.length; argIndex += 1) {
                        expectedType = normalizeTypeName(argTypes[argIndex]);
                        if (expectedType === 'unknown' || expectedType === 'any' || expectedType === 'null') {
                            continue;
                        }
                        if (expectedType === 'recordlist' || (scalarType !== 'unknown' && expectedType !== scalarType)) {
                            state.diagnostics.push(createDiagnostic('QB104', 'warning', entry.name + '() scalar arguments must have the same type.', node.arguments[argIndex].start, node.arguments[argIndex].end, state.lineStarts));
                            break;
                        }
                        scalarType = expectedType;
                    }
                }
                return inferReturnType(functionName, argTypes, node);
            }

            if (!firstMismatch) {
                firstMismatch = mismatch;
            }
        }

        if (firstMismatch) {
            state.diagnostics.push(createDiagnostic(
                'QB104',
                'warning',
                entry.name + '() argument ' + (firstMismatch.index + 1) + ' expects ' + displayType(firstMismatch.expectedType) + ' but received ' + displayType(firstMismatch.actualType) + '.',
                node.arguments[firstMismatch.index].start,
                node.arguments[firstMismatch.index].end,
                state.lineStarts
            ));
        }

        return inferReturnType(functionName, argTypes, node);
    }

    function inferExpressionType(node, state) {
        var leftType;
        var rightType;
        var entry;
        var argTypes;
        var normalizedType;

        if (!node) {
            return 'unknown';
        }

        switch (node.type) {
        case 'NumberLiteral':
            return 'number';
        case 'StringLiteral':
            return 'text';
        case 'BooleanLiteral':
            return 'bool';
        case 'NullLiteral':
            return 'null';
        case 'VariableReference':
            if (!hasOwn(state.symbols, node.name)) {
                state.diagnostics.push(createDiagnostic('QB101', 'error', 'Unknown variable $' + node.name + '.', node.start, node.end, state.lineStarts));
                return 'unknown';
            }
            return state.symbols[node.name].type;
        case 'BracketReference':
            return hasOwn(state.typeHints, node.name) ? state.typeHints[node.name].type : 'unknown';
        case 'Identifier':
            return 'unknown';
        case 'ParenthesizedExpression':
            return inferExpressionType(node.expression, state);
        case 'UnaryExpression':
            leftType = inferExpressionType(node.expression, state);
            if (node.operator === 'not') {
                normalizedType = normalizeTypeName(leftType);
                if (normalizedType !== 'bool' && normalizedType !== 'unknown') {
                    state.diagnostics.push(createDiagnostic('QB104', 'warning', 'The not operator expects a Boolean value.', node.expression.start, node.expression.end, state.lineStarts));
                }
                return 'bool';
            }
            if (node.operator === '-' || node.operator === '+') {
                if (!isNumberLike(leftType) && normalizeTypeName(leftType) !== 'unknown') {
                    state.diagnostics.push(createDiagnostic('QB104', 'warning', 'Unary ' + node.operator + ' expects a numeric value.', node.expression.start, node.expression.end, state.lineStarts));
                }
                return leftType;
            }
            return 'unknown';
        case 'BinaryExpression':
            leftType = inferExpressionType(node.left, state);
            rightType = inferExpressionType(node.right, state);
            if (node.operator === 'and' || node.operator === 'or') {
                if (normalizeTypeName(leftType) !== 'bool' && normalizeTypeName(leftType) !== 'unknown') {
                    state.diagnostics.push(createDiagnostic('QB104', 'warning', 'Logical operators expect Boolean operands.', node.left.start, node.left.end, state.lineStarts));
                }
                if (normalizeTypeName(rightType) !== 'bool' && normalizeTypeName(rightType) !== 'unknown') {
                    state.diagnostics.push(createDiagnostic('QB104', 'warning', 'Logical operators expect Boolean operands.', node.right.start, node.right.end, state.lineStarts));
                }
                return 'bool';
            }
            if (node.operator === '=' || node.operator === '!=' || node.operator === '<>' || node.operator === '>' || node.operator === '<' || node.operator === '>=' || node.operator === '<=') {
                return 'bool';
            }
            if (node.operator === '&') {
                return 'text';
            }
            if (node.operator === '+' || node.operator === '-' || node.operator === '*' || node.operator === '/' || node.operator === '^') {
                return inferArithmeticType(node, leftType, rightType, state);
            }
            return 'unknown';
        case 'CallExpression':
            entry = getOwn(state.functionCatalog, node.callee.toLowerCase());
            argTypes = getArgumentTypes(node.arguments, state);
            if (!entry) {
                state.diagnostics.push(createDiagnostic('QB105', 'warning', 'Unknown Quickbase function ' + node.callee + '().', node.start, node.end, state.lineStarts));
                return 'unknown';
            }
            if (entry.special === 'if') {
                return validateIfCall(node, argTypes, state);
            }
            if (entry.special === 'case') {
                return validateCaseCall(node, argTypes, state);
            }
            return validateGenericCall(node, entry, argTypes, state);
        case 'ErrorExpression':
            return 'unknown';
        default:
            return 'unknown';
        }
    }

    function validateStatements(statements, functionCatalog, lineStarts, typeHints) {
        var diagnostics = [];
        var symbols = createDictionary();
        var state = {
            diagnostics: diagnostics,
            functionCatalog: functionCatalog || {},
            lineStarts: lineStarts,
            symbols: symbols,
            typeHints: typeHints || createDictionary()
        };
        var index;
        var statement;
        var declaredType;
        var initializerType;
        var existingSymbol;
        var textTemplate;
        var queryTemplateValidated;

        for (index = 0; index < statements.length; index += 1) {
            statement = statements[index];

            if (statement.type === 'VariableDeclaration') {
                declaredType = normalizeTypeName(statement.declaredType);
                if (!isKnownVariableType(declaredType)) {
                    diagnostics.push(createDiagnostic('QB106', 'warning', 'Unknown Quickbase variable type ' + statement.declaredType + '.', statement.start, statement.nameEnd, lineStarts));
                    declaredType = 'unknown';
                }

                if (!isValidVariableName(statement.name)) {
                    diagnostics.push(createDiagnostic('QB109', 'error', 'Quickbase variable names must use letters only.', statement.nameStart, statement.nameEnd, lineStarts));
                }

                existingSymbol = getOwn(symbols, statement.name);
                if (existingSymbol) {
                    diagnostics.push(createDiagnostic('QB100', 'error', 'Duplicate variable declaration $' + statement.name + '.', statement.nameStart, statement.nameEnd, lineStarts));
                }

                initializerType = statement.initializer ? inferExpressionType(statement.initializer, state) : 'unknown';
                textTemplate = statement.initializer ? toTextTemplate(statement.initializer, state) : null;
                queryTemplateValidated = !!(textTemplate && looksLikeQueryText(textTemplate.text));
                if (queryTemplateValidated) {
                    validateQueryTemplate(textTemplate, state);
                }
                if (statement.initializer && !canAssignType(declaredType, initializerType)) {
                    diagnostics.push(createDiagnostic('QB102', 'warning', 'Declared type ' + displayType(declaredType) + ' does not match initializer type ' + displayType(initializerType) + '.', statement.initializer.start, statement.initializer.end, lineStarts));
                }

                symbols[statement.name] = {
                    type: declaredType,
                    declaration: statement,
                    textTemplate: textTemplate,
                    queryTemplateValidated: queryTemplateValidated
                };
                continue;
            }

            if (statement.type === 'ExpressionStatement') {
                inferExpressionType(statement.expression, state);
            }
        }

        return diagnostics;
    }

    function validateText(text, functionCatalog) {
        var sourceText = text || '';
        var lineStarts = createLineStarts(sourceText);
        var lexical;
        var parser;
        var parsed;
        var diagnostics = [];
        var semanticDiagnostics;
        var queryState;
        var hintData;

        if (isStandaloneQueryDocument(sourceText)) {
            queryState = {
                diagnostics: diagnostics,
                functionCatalog: functionCatalog || {},
                lineStarts: lineStarts,
                symbols: {},
                standaloneQuery: true
            };
            validateQueryTemplate(createTextTemplate(sourceText, 0, sourceText.length, false), queryState);
            return {
                diagnostics: diagnostics,
                statements: []
            };
        }

        lexical = tokenize(sourceText, lineStarts);
        hintData = parseTypeHints(lexical.comments, lineStarts);
        parser = new Parser(lexical.tokens, lineStarts);
        parsed = parser.parseDocument();
        semanticDiagnostics = validateStatements(parsed.statements, functionCatalog || {}, lineStarts, hintData.hints);

        collectDiagnostics(diagnostics, lexical.diagnostics);
        collectDiagnostics(diagnostics, parsed.diagnostics);
        collectDiagnostics(diagnostics, semanticDiagnostics);
        collectDiagnostics(diagnostics, hintData.diagnostics);

        return {
            diagnostics: diagnostics,
            statements: parsed.statements
        };
    }

    function getDeclarations(text) {
        var sourceText = text || '';
        var lineStarts;
        var lexical;
        var parsed;
        var declarations = [];
        var index;

        if (isStandaloneQueryDocument(sourceText)) {
            return declarations;
        }

        lineStarts = createLineStarts(sourceText);
        lexical = tokenize(sourceText, lineStarts);
        parsed = new Parser(lexical.tokens, lineStarts).parseDocument();
        for (index = 0; index < parsed.statements.length; index += 1) {
            if (parsed.statements[index].type === 'VariableDeclaration') {
                declarations.push(parsed.statements[index]);
            }
        }

        return declarations;
    }

    function getComments(text) {
        var sourceText = text || '';

        if (isStandaloneQueryDocument(sourceText)) {
            return [];
        }

        return tokenize(sourceText, createLineStarts(sourceText)).comments;
    }

    function parseTypeHints(comments, lineStarts) {
        var hints = createDictionary();
        var diagnostics = [];
        var pattern = /^\s*@qb-type\s+(\[[^\]\r\n]+\])\s*:\s*([A-Za-z][A-Za-z/ \t]*)\s*$/i;
        var index;
        var comment;
        var match;
        var type;
        var reference;

        for (index = 0; index < comments.length; index += 1) {
            comment = comments[index];
            if (!/^\s*@qb-type\b/i.test(comment.text)) {
                continue;
            }
            match = pattern.exec(comment.text);
            type = match ? normalizeTypeName(match[2]) : '';
            if (!match || !trim(match[1].slice(1, -1)) || !isKnownVariableType(type) || type === 'recordlist') {
                diagnostics.push(createDiagnostic('QB112', 'warning', 'Invalid type hint. Use // @qb-type [Field]: Type with a supported field type.', comment.start, comment.end, lineStarts));
                continue;
            }
            reference = match[1];
            if (hasOwn(hints, reference)) {
                if (hints[reference].conflicting) {
                    continue;
                }
                if (hints[reference].type !== type) {
                    diagnostics.push(createDiagnostic('QB113', 'warning', 'Conflicting type hints for ' + reference + '. This reference remains untyped.', comment.start, comment.end, lineStarts));
                    hints[reference].type = 'unknown';
                    hints[reference].conflicting = true;
                }
                continue;
            }
            hints[reference] = {
                reference: reference,
                type: type,
                start: comment.start,
                end: comment.end
            };
        }

        return { hints: hints, diagnostics: diagnostics };
    }

    function getTypeHints(text) {
        var sourceText = text || '';
        return parseTypeHints(getComments(sourceText), createLineStarts(sourceText));
    }

    return {
        buildFunctionCatalog: buildFunctionCatalog,
        getComments: getComments,
        getDeclarations: getDeclarations,
        getTypeHints: getTypeHints,
        validateText: validateText
    };
}));








