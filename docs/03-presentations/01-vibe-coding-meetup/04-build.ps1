param()
$ErrorActionPreference = 'Stop'
$deckDir = $PSScriptRoot
$sourcePath = Join-Path $deckDir '01-slides.md'
$outputPath = Join-Path $deckDir '02-slides.html'
$inputPath = Join-Path $deckDir '.marp-input.md'
$utf8 = [System.Text.UTF8Encoding]::new($false)
$markdown = [System.IO.File]::ReadAllText($sourcePath, $utf8)
$markdown = [regex]::Replace($markdown, 'src="(assets/[^"\r\n]+\.png)"', {
    param($match)
    $imagePath = Join-Path $deckDir $match.Groups[1].Value
    $encoded = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($imagePath))
    return 'src="data:image/png;base64,' + $encoded + '"'
})
try {
    [System.IO.File]::WriteAllText($inputPath, $markdown, $utf8)
    & marp $inputPath --no-config-file --html --template bespoke --bespoke.progress --no-bespoke.transition -o $outputPath
    if ($LASTEXITCODE -ne 0) { throw "Marp failed with exit code $LASTEXITCODE" }
    if ((Get-Item -LiteralPath $outputPath).Length -eq 0) { throw 'Generated HTML is empty.' }
    Write-Output "Created: $outputPath"
} finally {
    if (Test-Path -LiteralPath $inputPath) { Remove-Item -LiteralPath $inputPath }
}
