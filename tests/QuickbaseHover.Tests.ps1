Set-StrictMode -Version Latest

function Invoke-QuickbaseHover {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FixtureName,

        [Parameter(Mandatory = $true)]
        [int]$Line,

        [Parameter(Mandatory = $true)]
        [int]$Character
    )

    $runner = Join-Path $PSScriptRoot 'RunQuickbaseHover.js'
    $fixture = Join-Path (Join-Path $PSScriptRoot 'fixtures') $FixtureName
    $output = @(& node $runner $fixture $Line $Character)
    if ($LASTEXITCODE -ne 0) {
        throw ($output -join "`n")
    }
    $output
}

Describe 'Quickbase hover documentation' {
    It 'describes query operators' {
        $output = Invoke-QuickbaseHover -FixtureName 'hover-reference.quickbase' -Line 1 -Character 22
        $joined = $output -join "`n"

        $joined | Should Match '^KIND\|queryOperator'
        $joined | Should Match 'LABEL\|EX'
        $joined | Should Match 'SUMMARY\|Matches records where the field is equal to the target value\.'
    }

    It 'describes variable types' {
        $output = Invoke-QuickbaseHover -FixtureName 'hover-reference.quickbase' -Line 2 -Character 5
        $joined = $output -join "`n"

        $joined | Should Match '^KIND\|variableType'
        $joined | Should Match 'LABEL\|RecordList'
        $joined | Should Match 'SUMMARY\|Intermediate list of records, typically consumed by formula-query functions\.'
    }

    It 'describes variable references using the declared type' {
        $output = Invoke-QuickbaseHover -FixtureName 'hover-reference.quickbase' -Line 2 -Character 35
        $joined = $output -join "`n"

        $joined | Should Match '^KIND\|variableReference'
        $joined | Should Match 'LABEL\|\$query'
        $joined | Should Match 'SUMMARY\|Declared as Text\.'
    }

    It 'describes formula-query functions' {
        $output = Invoke-QuickbaseHover -FixtureName 'hover-reference.quickbase' -Line 2 -Character 23
        $joined = $output -join "`n"

        $joined | Should Match '^KIND\|function'
        $joined | Should Match 'LABEL\|GetRecords'
        $joined | Should Match 'SIGNATURE\|GetRecords\(Text\)'
        $joined | Should Match 'SIGNATURE\|GetRecords\(Text, Table\)'
        $joined | Should Match 'SUMMARY\|Returns a RecordList of records that match a Quickbase query string\.'
    }

    It 'describes quoted today query inserts' {
        $output = Invoke-QuickbaseHover -FixtureName 'hover-reference.quickbase' -Line 5 -Character 35
        $joined = $output -join "`n"

        $joined | Should Match '^KIND\|querySpecialValue'
        $joined | Should Match "LABEL\|'today'"
        $joined | Should Match "SUMMARY\|Special date query value that resolves to today's date for Date and Date/Time filters\."
    }

    It 'describes relative date query inserts' {
        $output = Invoke-QuickbaseHover -FixtureName 'hover-reference.quickbase' -Line 6 -Character 40
        $joined = $output -join "`n"

        $joined | Should Match '^KIND\|querySpecialValue'
        $joined | Should Match "LABEL\|'-1 days ago'"
        $joined | Should Match "SUMMARY\|Relative date query value such as '2 days ago' or '-1 days ago'\."
    }

    It 'describes current-user query inserts' {
        $output = Invoke-QuickbaseHover -FixtureName 'hover-reference.quickbase' -Line 7 -Character 36
        $joined = $output -join "`n"

        $joined | Should Match '^KIND\|querySpecialValue'
        $joined | Should Match "LABEL\|'_curuser_'"
        $joined | Should Match 'SUMMARY\|Special user query value that resolves to the current user\.'
    }
}
