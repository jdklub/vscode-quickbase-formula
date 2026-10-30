Set-StrictMode -Version Latest

function Invoke-QuickbaseDiagnostics {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FixtureName
    )

    $runner = Join-Path $PSScriptRoot 'RunQuickbaseDiagnostics.js'
    $fixture = Join-Path (Join-Path $PSScriptRoot 'fixtures') $FixtureName
    $output = @(& node $runner $fixture)
    if ($LASTEXITCODE -ne 0) {
        throw ($output -join "`n")
    }
    $output
}

Describe 'Quickbase diagnostics' {
    It 'accepts a valid Quickbase formula without diagnostics' {
        $output = Invoke-QuickbaseDiagnostics -FixtureName 'diagnostics-valid.quickbase'

        ($output -join "`n") | Should Be 'OK'
    }

    It 'accepts a standalone Quickbase query expression without diagnostics' {
        $output = Invoke-QuickbaseDiagnostics -FixtureName 'diagnostics-standalone-query.quickbase'

        ($output -join "`n") | Should Be 'OK'
    }

    It 'accepts newline-separated statements without an explicit semicolon' {
        $output = Invoke-QuickbaseDiagnostics -FixtureName 'diagnostics-newline-separated.quickbase'

        ($output -join "`n") | Should Be 'OK'
    }

    It 'flags semantic and type issues' {
        $output = Invoke-QuickbaseDiagnostics -FixtureName 'diagnostics-semantic-errors.quickbase'
        $joined = $output -join "`n"

        $joined | Should Match 'QB104\|warning\|1:30\|Join\(\) argument 1 expects TextList but received Text\.'
        $joined | Should Match 'QB102\|warning\|2:25\|Declared type Number does not match initializer type Text\.'
        $joined | Should Match 'QB104\|warning\|2:30\|Join\(\) argument 1 expects TextList but received Text\.'
        $joined | Should Match 'QB107\|error\|3:24\|Invalid Quickbase query operator "BAD"\.'
        $joined | Should Match 'QB100\|error\|4:12\|Duplicate variable declaration \$query\.'
        $joined | Should Match 'QB101\|error\|5:22\|Unknown variable \$missingOwner\.'
        $joined | Should Match 'QB109\|error\|6:10\|Quickbase variable names must use letters only\.'
        $joined | Should Match 'QB110\|error\|6:23\|Quickbase query operators must be uppercase\.'
        $joined | Should Match 'QB111\|warning\|8:43\|Regex pattern arguments must be string literals in Quickbase formulas\.'
    }

    It 'flags structural validation issues' {
        $output = Invoke-QuickbaseDiagnostics -FixtureName 'diagnostics-structural-errors.quickbase'
        $joined = $output -join "`n"

        $joined | Should Match 'QB108\|error\|1:25\|Unclosed Quickbase query block\.'
        $joined | Should Match 'QB104\|warning\|2:28\|Join\(\) argument 1 expects TextList but received Text\.'
        $joined | Should Match 'QB001\|error\|2:54\|Expected \) to close the function call\.'
        $joined | Should Match 'QB104\|warning\|3:25\|The not operator expects a Boolean value\.'
    }
}
