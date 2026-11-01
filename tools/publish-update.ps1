param([string]$Message)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)

function Invoke-Git {
    param([string[]]$GitArgs)
    & git @GitArgs
    if ($LASTEXITCODE -ne 0) { throw ('Git failed: ' + ($GitArgs -join ' ')) }
}

try {
    $branch = (& git branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or $branch -ne 'main') {
        throw 'Open the main branch before publishing.'
    }
    Invoke-Git -GitArgs @('add', '-A')
    & git diff --cached --quiet
    $diffExit = $LASTEXITCODE
    if ($diffExit -gt 1) { throw 'Could not inspect staged changes.' }
    if ($diffExit -eq 1) {
        if ([string]::IsNullOrWhiteSpace($Message)) { $Message = Read-Host 'What changed? (Enter for automatic description)' }
        if ([string]::IsNullOrWhiteSpace($Message)) { $Message = 'Game update ' + (Get-Date -Format 'yyyy-MM-dd HH:mm') }
        Invoke-Git -GitArgs @('commit', '-m', $Message)
    }
    Invoke-Git -GitArgs @('push', 'origin', 'main')
    Write-Host ''
    Write-Host 'Sent to GitHub. Deployment progress:'
    Write-Host 'https://github.com/nocarry070800/frontline-moba/actions'
    exit 0
} catch {
    Write-Host ('UPDATE FAILED: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
