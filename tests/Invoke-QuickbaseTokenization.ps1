param(
    [ValidateSet('verify', 'update')]
    [string]$Mode = 'verify'
)

Set-StrictMode -Version Latest

$fixturesDirectory = Join-Path $PSScriptRoot 'fixtures'
$snapshotsDirectory = Join-Path $PSScriptRoot 'snapshots'
$grammarPath = Join-Path $PSScriptRoot '..\syntaxes\quickbase.tmLanguage.json'
$grammar = Get-Content $grammarPath -Raw | ConvertFrom-Json
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function New-Range {
    param(
        [int]$Start,
        [int]$End
    )

    [PSCustomObject]@{
        Start = $Start
        End = $End
    }
}

function New-Token {
    param(
        [int]$Start,
        [int]$End,
        [string]$Text,
        [string]$Scope
    )

    [PSCustomObject]@{
        Start = $Start
        End = $End
        Text = $Text
        Scope = $Scope
    }
}

function ConvertTo-SnapshotToken {
    param(
        [Parameter(Mandatory = $true)]
        $Token
    )

    [ordered]@{
        start = $Token.Start
        end = $Token.End
        text = $Token.Text
        scope = $Token.Scope
    }
}

function Normalize-SnapshotText {
    param(
        [string]$Text
    )

    (($Text -replace "`r`n", "`n").TrimEnd("`r", "`n")) + "`n"
}

function Test-InRanges {
    param(
        [int]$Start,
        [int]$End,
        [object[]]$Ranges
    )

    foreach ($range in $Ranges) {
        if ($Start -ge $range.Start -and $End -le $range.End) {
            return $true
        }
    }

    return $false
}

function Get-RegexTokens {
    param(
        [string]$Text,
        [string]$Pattern,
        [string]$Scope,
        [int]$Offset = 0
    )

    $tokens = @()
    foreach ($match in [regex]::Matches($Text, $Pattern)) {
        if ($match.Length -eq 0) {
            continue
        }

        $tokens += New-Token -Start ($Offset + $match.Index) -End ($Offset + $match.Index + $match.Length) -Text $match.Value -Scope $Scope
    }

    return $tokens
}

function Get-DeclarationTokens {
    param(
        [string]$Text,
        [string]$Pattern
    )

    $tokens = @()
    foreach ($match in [regex]::Matches($Text, $Pattern)) {
        if (-not $match.Success) {
            continue
        }

        foreach ($captureInfo in @(
            @{ Group = 1; Scope = 'keyword.control.declaration.quickbase' },
            @{ Group = 2; Scope = 'entity.name.type.quickbase' },
            @{ Group = 3; Scope = 'variable.other.quickbase' }
        )) {
            $group = $match.Groups[$captureInfo.Group]
            if ($group.Success -and $group.Length -gt 0) {
                $tokens += New-Token -Start $group.Index -End ($group.Index + $group.Length) -Text $group.Value -Scope $captureInfo.Scope
            }
        }
    }

    return $tokens
}

function Get-TopLevelTokens {
    param(
        [string]$LineText,
        $Grammar
    )

    $commentPattern = $Grammar.repository.comment.patterns[0].match
    $stringPattern = '"(?:[^"\\]|\\.)*"'
    $declarationPattern = $Grammar.repository.variable.patterns[1].match

    $commentTokens = Get-RegexTokens -Text $LineText -Pattern $commentPattern -Scope 'comment.line.quickbase'
    $stringTokens = Get-RegexTokens -Text $LineText -Pattern $stringPattern -Scope 'string.quoted.double.quickbase'

    $commentRanges = @($commentTokens | ForEach-Object { New-Range -Start $_.Start -End $_.End })
    $stringRanges = @($stringTokens | ForEach-Object { New-Range -Start $_.Start -End $_.End })

    $candidates = @()
    $candidates += $commentTokens
    $candidates += $stringTokens
    $candidates += Get-DeclarationTokens -Text $LineText -Pattern $declarationPattern
    $candidates += Get-RegexTokens -Text $LineText -Pattern $Grammar.repository.variable.patterns[0].match -Scope $Grammar.repository.variable.patterns[0].name
    $candidates += Get-RegexTokens -Text $LineText -Pattern $Grammar.repository.variable.patterns[2].match -Scope 'variable.other.quickbase'
    $candidates += Get-RegexTokens -Text $LineText -Pattern $Grammar.repository.keyword.patterns[0].match -Scope 'keyword.control.quickbase'
    $candidates += Get-RegexTokens -Text $LineText -Pattern $Grammar.repository.constant.patterns[0].match -Scope 'constant.language.quickbase'
    $candidates += Get-RegexTokens -Text $LineText -Pattern $Grammar.repository.numeric.patterns[0].match -Scope 'constant.numeric.quickbase'
    $candidates += Get-RegexTokens -Text $LineText -Pattern $Grammar.repository.operator.patterns[0].match -Scope 'keyword.operator.quickbase'
    $candidates += Get-RegexTokens -Text $LineText -Pattern $Grammar.repository.support.patterns[0].match -Scope 'support.function.quickbase'
    $candidates += Get-RegexTokens -Text $LineText -Pattern $Grammar.repository.storage.patterns[0].match -Scope $Grammar.repository.storage.patterns[0].name
    $candidates += Get-RegexTokens -Text $LineText -Pattern $Grammar.repository.storage.patterns[1].match -Scope $Grammar.repository.storage.patterns[1].name

    $filtered = foreach ($token in $candidates) {
        if ($token.Scope -ne 'comment.line.quickbase' -and (Test-InRanges -Start $token.Start -End $token.End -Ranges $commentRanges)) {
            continue
        }

        if ($token.Scope -ne 'string.quoted.double.quickbase' -and (Test-InRanges -Start $token.Start -End $token.End -Ranges $stringRanges)) {
            continue
        }

        $token
    }

    return @(
        $filtered |
            Sort-Object Start, End, Scope |
            Select-Object -Unique Start, End, Text, Scope |
            ForEach-Object { ConvertTo-SnapshotToken -Token $_ }
    )
}

function Get-QueryBlocks {
    param(
        [string]$LineText
    )

    $blocks = @()

    for ($index = 0; $index -lt $LineText.Length; $index += 1) {
        if ($LineText[$index] -ne '{') {
            continue
        }

        $remaining = $LineText.Substring($index)
        if (-not [regex]::IsMatch($remaining, '^\{(?=\s*(?:''[^'']+''|\d+)\s*\.)')) {
            continue
        }

        $cursor = $index + 1
        while ($cursor -lt $LineText.Length) {
            if ($LineText[$cursor] -eq '"') {
                break
            }

            if (($cursor + 1) -lt $LineText.Length -and $LineText.Substring($cursor, 2) -eq '{{') {
                $placeholderEnd = $LineText.IndexOf('}}', $cursor + 2)
                if ($placeholderEnd -lt 0) {
                    $cursor = $LineText.Length
                    break
                }

                $cursor = $placeholderEnd + 2
                continue
            }

            if ($LineText[$cursor] -eq '}') {
                $blockEnd = $cursor + 1
                $blocks += [ordered]@{
                    Start = $index
                    End = $blockEnd
                    Text = $LineText.Substring($index, $blockEnd - $index)
                }
                $index = $cursor
                break
            }

            $cursor += 1
        }
    }

    return $blocks
}

function Get-QuerySnapshots {
    param(
        [string]$LineText,
        $Grammar
    )

    $fieldPattern = $Grammar.repository.apiQuery.patterns[0].patterns[0].match
    $operatorPattern = $Grammar.repository.apiQuery.patterns[0].patterns[1].match
    $placeholderPattern = $Grammar.repository.apiQuery.patterns[0].patterns[2].match
    $specialQuotedValuePattern = $Grammar.repository.apiQuery.patterns[0].patterns[3].match
    $specialBareValuePattern = $Grammar.repository.apiQuery.patterns[0].patterns[4].match
    $bareValuePattern = $Grammar.repository.apiQuery.patterns[0].patterns[5].match
    $numericValueRule = $Grammar.repository.apiQuery.patterns[0].patterns |
        Where-Object { $_.PSObject.Properties['name'] -and $_.name -eq 'constant.numeric.quickbase.query' } |
        Select-Object -First 1
    $numericValuePattern = $numericValueRule.match
    $doubleQuotedPattern = '"(?:[^"\\]|\\.)*"'
    $singleQuotedPattern = '''(?:[^''\\]|\\.)*'''
    $dotPattern = '\.'

    $snapshots = @()

    foreach ($queryBlock in (Get-QueryBlocks -LineText $LineText)) {
        $queryText = $queryBlock.Text
        $queryStart = $queryBlock.Start
        $queryEnd = $queryBlock.End

        $fieldTokens = Get-RegexTokens -Text $queryText -Pattern $fieldPattern -Scope 'variable.other.quickbase.query' -Offset $queryStart
        $specialQuotedTokens = Get-RegexTokens -Text $queryText -Pattern $specialQuotedValuePattern -Scope 'constant.language.quickbase.query.special' -Offset $queryStart
        $specialBareTokens = Get-RegexTokens -Text $queryText -Pattern $specialBareValuePattern -Scope 'constant.language.quickbase.query.special' -Offset $queryStart
        $numericTokens = @(Get-RegexTokens -Text $queryText -Pattern $numericValuePattern -Scope 'constant.numeric.quickbase.query' -Offset $queryStart)
        $numericRanges = @($numericTokens | ForEach-Object { New-Range -Start $_.Start -End $_.End })
        $fieldRanges = @($fieldTokens | ForEach-Object { New-Range -Start $_.Start -End $_.End })
        $specialRanges = @((@($specialQuotedTokens) + @($specialBareTokens)) | ForEach-Object { New-Range -Start $_.Start -End $_.End })

        $tokens = @()
        $tokens += New-Token -Start $queryStart -End ($queryStart + 1) -Text '{' -Scope 'keyword.control.block.quickbase.query'
        $tokens += $fieldTokens
        $tokens += Get-RegexTokens -Text $queryText -Pattern $operatorPattern -Scope 'keyword.operator.comparison.quickbase.query' -Offset $queryStart
        $tokens += Get-RegexTokens -Text $queryText -Pattern $placeholderPattern -Scope 'variable.other.quickbase.query' -Offset $queryStart
        $tokens += $specialQuotedTokens
        $tokens += $specialBareTokens
        $tokens += $numericTokens

        foreach ($bareToken in (Get-RegexTokens -Text $queryText -Pattern $bareValuePattern -Scope 'constant.language.quickbase.query' -Offset $queryStart)) {
            if (Test-InRanges -Start $bareToken.Start -End $bareToken.End -Ranges $specialRanges) {
                continue
            }

            $tokens += $bareToken
        }

        $tokens += Get-RegexTokens -Text $queryText -Pattern $doubleQuotedPattern -Scope 'string.quoted.double.quickbase.query' -Offset $queryStart

        foreach ($singleToken in (Get-RegexTokens -Text $queryText -Pattern $singleQuotedPattern -Scope 'string.quoted.single.quickbase.query' -Offset $queryStart)) {
            if (Test-InRanges -Start $singleToken.Start -End $singleToken.End -Ranges $fieldRanges) {
                continue
            }

            if (Test-InRanges -Start $singleToken.Start -End $singleToken.End -Ranges $specialRanges) {
                continue
            }

            $tokens += $singleToken
        }

        foreach ($dotToken in (Get-RegexTokens -Text $queryText -Pattern $dotPattern -Scope 'punctuation.separator.dot.quickbase.query' -Offset $queryStart)) {
            if (-not (Test-InRanges -Start $dotToken.Start -End $dotToken.End -Ranges $numericRanges)) {
                $tokens += $dotToken
            }
        }
        $tokens += New-Token -Start ($queryEnd - 1) -End $queryEnd -Text '}' -Scope 'keyword.control.block.quickbase.query'

        $orderedTokens = @(
            $tokens |
                Sort-Object Start, End, Scope |
                Select-Object -Unique Start, End, Text, Scope |
                ForEach-Object { ConvertTo-SnapshotToken -Token $_ }
        )

        $snapshots += [ordered]@{
            start = $queryStart
            end = $queryEnd
            text = $queryText
            tokens = $orderedTokens
        }
    }

    return $snapshots
}

function Get-LineSnapshot {
    param(
        [int]$LineNumber,
        [string]$LineText,
        $Grammar
    )

    [ordered]@{
        line = $LineNumber
        text = $LineText
        topLevel = @(Get-TopLevelTokens -LineText $LineText -Grammar $Grammar)
        queries = @(Get-QuerySnapshots -LineText $LineText -Grammar $Grammar)
    }
}

function Get-FixtureSnapshot {
    param(
        [string]$FixturePath,
        $Grammar
    )

    $content = Get-Content $FixturePath -Raw
    $lines = $content -replace "`r`n", "`n" -split "`n"
    if ($lines.Count -gt 0 -and $lines[-1] -eq '') {
        $lines = $lines[0..($lines.Count - 2)]
    }

    $snapshot = @()
    for ($index = 0; $index -lt $lines.Count; $index += 1) {
        $snapshot += Get-LineSnapshot -LineNumber ($index + 1) -LineText $lines[$index] -Grammar $Grammar
    }

    return $snapshot
}

if (-not (Test-Path $snapshotsDirectory)) {
    New-Item -ItemType Directory -Force $snapshotsDirectory | Out-Null
}

$fixturePaths = Get-ChildItem $fixturesDirectory -Filter *.quickbase | Where-Object { $_.BaseName -notlike 'diagnostics-*' } | Sort-Object Name | Select-Object -ExpandProperty FullName
if ($fixturePaths.Count -eq 0) {
    throw 'No .quickbase fixtures were found for snapshot testing.'
}

$hasMismatch = $false

foreach ($fixturePath in $fixturePaths) {
    $snapshot = Get-FixtureSnapshot -FixturePath $fixturePath -Grammar $grammar
    $snapshotPath = Join-Path $snapshotsDirectory (([System.IO.Path]::GetFileNameWithoutExtension($fixturePath)) + '.snapshot.json')
    $snapshotText = Normalize-SnapshotText -Text ($snapshot | ConvertTo-Json -Depth 10)

    if ($Mode -eq 'update') {
        [System.IO.File]::WriteAllText($snapshotPath, $snapshotText, $utf8NoBom)
        Write-Host "Updated $(Split-Path $snapshotPath -Leaf)"
        continue
    }

    if (-not (Test-Path $snapshotPath)) {
        Write-Host "Missing snapshot $(Split-Path $snapshotPath -Leaf)"
        $hasMismatch = $true
        continue
    }

    $expectedSnapshotText = Normalize-SnapshotText -Text (Get-Content $snapshotPath -Raw)
    if ($expectedSnapshotText -ne $snapshotText) {
        Write-Host "Snapshot mismatch $(Split-Path $snapshotPath -Leaf)"
        $hasMismatch = $true
        continue
    }

    Write-Host "Verified $(Split-Path $snapshotPath -Leaf)"
}

if ($hasMismatch) {
    throw 'Grammar snapshots are out of date. Run the snapshot runner in update mode to refresh them.'
}
