# Change Log
All notable changes to the "quick-base-formula" extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2017-06-23
- Initial release

## [0.1.0] - 2026-03-18
- Added highlighting for Quickbase formula-query functions such as `GetRecord()`, `GetRecords()`, `GetFieldValues()`, `Size()`, and `SumValues()`
- Added support for Quickbase API query-string operators including `EX`, `GT`, `HAS`, `WC`, and related operators
- Expanded formula syntax coverage for modern variable types and common operators like `=`, `!=`, `<>`, and `&`
- Updated README and extension metadata to reflect formula and query-string support

## [1.0.0] - 2026-10-30
- Added syntax, snippets, validation, and hover coverage for `Distance()`, `Find()`, `RemoveNewlineCharacters()`, `StDev()`, and `URLDecode()`
- Added documented overloads for aggregates, date conversions, text formatting, and month names
- Corrected aggregate, field-property, and user-list conversion return types
- Added unary plus, numeric query values without quotes, and nested query groups
- Expanded relative date range highlighting and hovers and updated `GetAccessKey()` documentation
- Added a warning for decimal query values without quotes, which Quickbase truncates
- Added regression checks with the installed VS Code TextMate and Oniguruma engines
- Refreshed source notes against the official function reference and release records through October 30, 2026
- Fixed inherited-property lookups that crashed validation and hover or reported false duplicate variables
- Corrected date, time, and duration arithmetic checks and several function return types
- Added diagnostics for query blocks without an `AND` or `OR` separator
- Fixed variable hovers that read declarations from comments or string literals
- Canceled pending validation when documents close or the extension disposes
- Raised the minimum VS Code version to 1.18 for the hover APIs
- Added optional `// @qb-type [Field]: Type` comments for field diagnostics and hovers
- Added Node regression tests for language services, fixture runners, and extension events
- Replaced Windows Script Host fixture runners with Node runners
- Added live Quickbase diagnostics for duplicate variables, invalid variable names, malformed query strings, regex-pattern literal rules, structural expression errors, and baseline type/function validation
- Query field IDs such as `'6'` or `6` inside API query blocks now use a variable-style scope instead of a field-name scope
- Variable declarations now scope `var`, the declared data type, and the variable name independently for more consistent coloring, with `var` using a dedicated keyword scope
- Bracketed field and table references such as `[_DBID_PROJECTS]` now use the same scope as variable names
- Added PowerShell/Pester grammar regression tests for query field IDs and variable declarations
- Added sample-based grammar snapshot tests that run against representative `.quickbase` fixtures
- Added hover documentation for formula-query functions, query operators, variable declarations, variable types, and bracketed references
- Added grammar and validation support for bare query values such as `today` and `_curuser_`




