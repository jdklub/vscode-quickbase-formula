Set-StrictMode -Version Latest

Describe 'Quickbase grammar snapshots' {
    It 'matches committed snapshots for representative .quickbase fixtures' {
        $runner = Join-Path $PSScriptRoot 'Invoke-QuickbaseTokenization.ps1'

        & $runner verify
    }
}
