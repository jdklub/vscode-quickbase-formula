Set-StrictMode -Version Latest

$grammarPath = Join-Path $PSScriptRoot '..\syntaxes\quickbase.tmLanguage.json'
$grammar = Get-Content $grammarPath -Raw | ConvertFrom-Json
$languageConfigurationPath = Join-Path $PSScriptRoot '..\language-configuration.json'
$languageConfigurationText = Get-Content $languageConfigurationPath -Raw

Describe 'Quickbase grammar' {
    It 'loads the TextMate grammar JSON' {
        $grammar.scopeName | Should Be 'source.quickbase'
    }

    It 'does not treat square-bracket references as editor bracket pairs' {
        $languageConfigurationText | Should Not Match '"brackets"\s*:\s*\[[^\]]*\["\["\s*,\s*"\]"\]'
        $languageConfigurationText | Should Match '"colorizedBracketPairs"'
    }

    Context 'API query field IDs and special values' {
        $queryBlockPattern = $grammar.repository.apiQuery.patterns[0]
        $fieldIdPattern = $queryBlockPattern.patterns[0]
        $specialQuotedValuePattern = $queryBlockPattern.patterns[3]
        $specialBareValuePattern = $queryBlockPattern.patterns[4]
        $queryJoinerPattern = $grammar.repository.apiQuery.patterns[3]

        It 'uses a visible block scope for query braces' {
            $queryBlockPattern.beginCaptures.'0'.name | Should Be 'keyword.control.block.quickbase.query'
            $queryBlockPattern.endCaptures.'0'.name | Should Be 'keyword.control.block.quickbase.query'
        }

        It 'uses the string-safe query grammar inside quoted strings' {
            $grammar.repository.strings.patterns[0].include | Should Be '#apiQueryString'
        }

        It 'uses a variable scope for quoted or bare field IDs' {
            $fieldIdPattern.name | Should Be 'variable.other.quickbase.query'
        }

        It 'matches the field ID before the query operator' {
            $sample = '{6.EX.today}'
            $match = [regex]::Match($sample, $fieldIdPattern.match)

            $match.Success | Should Be $true
            $match.Value | Should Be '6'
        }

        It 'matches quoted special query values like today' {
            $sample = "{'13'.EX.'today'}"
            $match = [regex]::Match($sample, $specialQuotedValuePattern.match)

            $specialQuotedValuePattern.name | Should Be 'constant.language.quickbase.query.special'
            $match.Success | Should Be $true
            $match.Value | Should Be "'today'"
        }

        It 'matches relative date inserts like -1 days ago' {
            $sample = "{'13'.EX.'-1 days ago'}"
            $match = [regex]::Match($sample, $specialQuotedValuePattern.match)

            $match.Success | Should Be $true
            $match.Value | Should Be "'-1 days ago'"
        }

        It 'matches bare special query values like today when unquoted' {
            $sample = "{'6'.EX.today}"
            $match = [regex]::Match($sample, $specialBareValuePattern.match)

            $specialBareValuePattern.name | Should Be 'constant.language.quickbase.query.special'
            $match.Success | Should Be $true
            $match.Value | Should Be 'today'
        }

        It 'matches logical joiners between query blocks' {
            $sample = "{'26'.EX.'1'}AND{'11'.EX.'1'}"
            $match = [regex]::Match($sample, $queryJoinerPattern.match)

            $queryJoinerPattern.name | Should Be 'keyword.control.quickbase.query'
            $match.Success | Should Be $true
            $match.Value | Should Be 'AND'
        }

        It 'matches documented quoted relative date ranges' {
            foreach ($value in @('tomorrow', 'yesterday', 'this wk', 'last mon', 'next q', 'this fq', 'last y', 'next fy', 'last 5 d', 'next 2 wk', 'last 3 mon', 'next 4 q', 'last 2 fq', 'next 3 y', 'last 2 fy')) {
                $sample = "{7.IR.'$value'}"
                $match = [regex]::Match($sample, $specialQuotedValuePattern.match)

                $match.Success | Should Be $true
                $match.Value | Should Be "'$value'"
            }
            [regex]::IsMatch("{7.EX.'next fy'}", $specialQuotedValuePattern.match) | Should Be $false
        }

        It 'keeps new relative date ranges quoted' {
            [regex]::IsMatch('{7.IR.tomorrow}', $specialBareValuePattern.match) | Should Be $false
        }

        It 'scopes bare numeric query values' {
            $numericPattern = $queryBlockPattern.patterns | Where-Object { $_.name -eq 'constant.numeric.quickbase.query' }
            foreach ($value in @('150', '-10', '+4', '0.5', '.5', '-.5')) {
                $sample = "{72.LT.$value}"
                $match = [regex]::Match($sample, $numericPattern.match)

                $match.Success | Should Be $true
                $match.Value | Should Be $value
            }
        }

        It 'defines nested query group scopes outside and inside formula strings' {
            $grammar.repository.apiQueryGroup.beginCaptures.'0'.name | Should Be 'punctuation.section.group.begin.quickbase.query'
            $grammar.repository.apiQueryGroup.endCaptures.'0'.name | Should Be 'punctuation.section.group.end.quickbase.query'
            $grammar.repository.apiQueryStringGroup.patterns[0].include | Should Be '#apiQueryString'
            [regex]::IsMatch("(({6.EX.'A'}OR{6.EX.'B'}))", $grammar.repository.apiQueryGroup.begin) | Should Be $true
        }
    }

    It 'recognizes the current documented function additions' {
        foreach ($name in @('Distance', 'Find', 'RemoveNewlineCharacters', 'StDev', 'URLDecode')) {
            $match = [regex]::Match("$name()", $grammar.repository.support.patterns[0].match)

            $match.Success | Should Be $true
            $match.Value | Should Be $name
        }
    }

    Context 'variable declarations' {
        $varKeywordPattern = $grammar.repository.storage.patterns[0]
        $bracketReferencePattern = $grammar.repository.variable.patterns[0]
        $variableDeclarationPattern = $grammar.repository.variable.patterns[1]

        It 'gives var a dedicated keyword scope' {
            $varKeywordPattern.name | Should Be 'keyword.control.declaration.quickbase'
            $variableDeclarationPattern.captures.'1'.name | Should Be 'keyword.control.declaration.quickbase'
        }

        It 'captures var, the declared type, and the variable name separately' {
            $sample = 'var Text queryCERS'
            $match = [regex]::Match($sample, $variableDeclarationPattern.match)

            $match.Success | Should Be $true
            $match.Groups[1].Value | Should Be 'var'
            $match.Groups[2].Value | Should Be 'Text'
            $match.Groups[3].Value | Should Be 'queryCERS'
        }

        It 'uses a type-oriented scope for the declared datatype' {
            $variableDeclarationPattern.captures.'2'.name | Should Be 'entity.name.type.quickbase'
            $variableDeclarationPattern.captures.'3'.name | Should Be 'variable.other.quickbase'
        }

        It 'scopes bracketed field and table references like variable names' {
            $sample = '[_DBID_RECERTIFICATIONS___RECERTS]'
            $match = [regex]::Match($sample, $bracketReferencePattern.match)

            $bracketReferencePattern.name | Should Be 'variable.other.quickbase'
            $match.Success | Should Be $true
            $match.Value | Should Be '[_DBID_RECERTIFICATIONS___RECERTS]'
        }
    }
}
