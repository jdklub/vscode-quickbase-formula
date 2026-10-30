# Quickbase Documentation Notes

Updated: 2026-10-30

Purpose: record the official sources for syntax, validation, snippets, and hover documentation in this extension.

The October audit compared the current function reference with the extension and checked released notes from March 19 through October 30, 2026. The reference contained 135 function names and 190 overload entries, excluding operators. The extension also supports the documented `Avg()` alias.

## Official sources reviewed

- Formula components: https://help.quickbase.com/docs/formula-components
- Formula variables: https://help.quickbase.com/docs/formula-variables
- Creating and using application variables: https://help.quickbase.com/docs/creating-and-using-application-variables
- What are formula queries?: https://help.quickbase.com/docs/what-are-formula-queries
- Build queries for your formulas: https://help.quickbase.com/docs/build-queries-for-your-formulas
- Formula queries: field types, type conversions, and variables: https://help.quickbase.com/docs/formula-queries-field-types-type-conversions-and-variables
- Formula queries and performance: https://help.quickbase.com/docs/formula-queries-and-performance
- Find field, record IDs, and table aliases: https://help.quickbase.com/docs/find-field-record-ids-and-table-aliases
- API_DoQuery: https://help.quickbase.com/docs/api-doquery
- [Components of a query](https://help.quickbase.com/v1/docs/components-of-a-query)
- Regex in formulas: https://help.quickbase.com/docs/regex-in-formulas
- Quickbase December 2022 release notes: https://help.quickbase.com/docs/quickbase-december-2022-release-notes
- Quickbase January 2025 release notes: https://help.quickbase.com/docs/quickbase-january-2025-release-notes
- Quickbase April 2025 release notes: https://help.quickbase.com/docs/quickbase-april-2025-release-notes
- Quickbase May 2025 release notes: https://help.quickbase.com/docs/quickbase-may-2025-release-notes
- Secure links: https://help.quickbase.com/docs/secure-links
- [Current formula function reference](https://login.quickbase.com/nav/app/9kaw8phg/table/6ewwzuuj/action/q?qid=6)
- [Distance function](https://help.quickbase.com/docs/distance-formula)
- [Relative date ranges](https://help.quickbase.com/v1/docs/understanding-relative-date-ranges)
- [Release note index](https://help.quickbase.com/docs/release-notes)
- [Distance release, July 9, 2026](https://resources.quickbase.com/nav/app/bu9ax9c5r/table/bu9a2h65e/action/dr?rid=766&ifv=1)

## Local seed files reviewed

- `reference/QuickBase Formula Documentation.csv`
- `reference/QuickBase Formula Examples.csv`

These files preserve older function documentation and examples. Current official documentation takes precedence when the sources differ.

## Stable syntax rules to support

### Formula variables

- Declaration format: `var <type> <name> = <formula snippet>;`
- Official declared types currently documented:
  - `bool`
  - `number`
  - `text`
  - `textlist`
  - `date`
  - `datetime`
  - `duration`
  - `timeofday`
  - `workdate`
  - `user`
  - `recordlist`
- Variables are referenced with `$name`.
- Variable names must contain letters only. No numbers, spaces, or special characters are documented.
- `var recordlist` is specifically called out for formula queries.

### Field references and application variables

- Field references use square brackets, for example `[Manager]`.
- Application variables also use bracket syntax, for example `[Project Start Date]`.
- Application variables are always treated as text unless they are converted with a formula function such as `ToDate()`.

### Formula queries

- Official formula-query functions:
  - `GetRecord()`
  - `GetRecordByUniqueField()`
  - `GetRecords()`
  - `GetFieldValues()`
  - `SumValues()`
  - `Size()`
- Query strings in formula-query functions should be enclosed in double quotes.
- A query block uses `{field.operator.value}` structure.
- Single quotes around the field ID are optional in formula queries.
- Comparison operators must be uppercase.
- Multiple query blocks can be combined with `AND` or `OR`.
- Parentheses group conditions, including nested groups.
- Numeric matching values can omit quotes, as in `{72.LT.150}`.
- Decimal matching values need quotes to preserve the fractional part. Quickbase truncates `{12.EX.5.6}` to `{12.EX.5}`. The extension reports warning `QB114` for unquoted decimals.
- To inject a field value into a query string, concatenate with `&`, for example:
  - `"{'5'.EX.'" & [Manager name] & "'}"`
- For user-field queries, prefer `TV` and wrap the field reference in `UserToID()` or `UserToEmail()`.
- When querying another table, Quickbase recommends using the table alias instead of the raw DBID.

## Query operators confirmed from API_DoQuery

- `CT`: contains
- `XCT`: does not contain
- `WC`: wildcard search with `*` and `?`
- `HAS`: contains values in List - User or Multi-select Text fields
- `XHAS`: does not contain values in List - User or Multi-select Text fields
- `EX`: equals
- `TV`: true value comparison, including user fields and relationship keys
- `XTV`: not equal using true-value comparison
- `XEX`: not equal
- `SW`: starts with
- `XSW`: does not start with
- `BF`: before
- `OBF`: on or before
- `AF`: after
- `OAF`: on or after
- `IR`: is during a relative date range
- `XIR`: is not during a relative date range
- `LT`: less than
- `LTE`: less than or equal
- `GT`: greater than
- `GTE`: greater than or equal

## Type and structure guidance from the docs

- `GetFieldValues()` can be used directly in Formula - Multi-select text fields.
- `SumValues()` and `Size()` can be used directly in Formula - Numeric fields.
- To use formula-query results in other field types, Quickbase expects either:
  - a conversion function such as `ToText()`, or
  - additional formula logic around the query result.
- `recordlist` values are intermediate values. They are normally consumed by `GetFieldValues()`, `SumValues()`, `Size()`, or converted to text.
- Regex support is documented as:
  - `RegexExtract()`
  - `RegexReplace()`
  - `RegexMatch()`
- Regex patterns must be written directly in the formula call and cannot come from a field or variable.

## Performance guidance worth validating against later

- Prefer table relationships when a simple relationship or summary field already solves the problem.
- Avoid filtering, sorting, or grouping reports on formula-query fields when possible.
- Avoid making formula-query fields searchable unless needed.
- Start queries with the most selective comparison when possible.
- Prefer exact matches over broader operators like contains or wildcard matching when performance matters.

## October 2026 coverage update

The audit found five function names absent from the extension:

| Function | Result | Evidence |
| --- | --- | --- |
| `Distance()` | Number | Released July 9, 2026. Four Number coordinates and an optional Text unit (`"miles"` or `"km"`). |
| `Find()` | Number | Text search function documented since April 2021. |
| `RemoveNewlineCharacters()` | Text | Documented since May 2024. |
| `URLDecode()` | Text | Documented since August 2024. |
| `StDev()` | Number | Current reference documents a RecordList and field ID. Its introduction date remains unverified. |

The update adds these names to snippets, highlighting, hover documentation, and validation. It also adds or corrects these signatures and return rules:

- `Average(RecordList, Number)` returns Number.
- `Median()` accepts Number or Duration arguments, as well as a RecordList and field ID.
- Query aggregates through `Min()` and `Max()` return Number rather than RecordList.
- `ToDate()` accepts Number and `(Text, Text)` forms.
- `ToUnixTime()` accepts Date as well as DateTime.
- `ToFormattedText()` accepts `(Number, Text, Number)`.
- `NameOfMonth()` accepts the documented optional Text argument.
- `GetFieldProperty()` uses established literal property names to infer Boolean, Text, or Number. Unestablished or dynamic property names remain unknown.
- `UserListToEmails()`, `UserListToIDs()`, and `UserListToNames()` return Text rather than TextList.

The parser accepts unary plus, numeric query values without quotes, and nested query groups. Relative date range hovers cover documented day, week, month, quarter, fiscal quarter, year, and fiscal year forms. The secure-links article explicitly documents `GetAccessKey()` as the function that extracts an access key from a URL.

## Verification limits

Function-name coverage does not establish every runtime rule or every possible return type. The reference contains inconsistent examples and result labels, so signature changes need individual review.

Field hints are local assertions. The extension cannot compare them with application metadata or execute formulas. It does not reproduce server-side save checks or API execution limits.
