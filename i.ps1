# StashZero One-Liner Installer
# Minimal & Silent Version

$repo = "byGOG/StashZero"
$releasesApi = "https://api.github.com/repos/$repo/releases"

Write-Host "Checking for the latest StashZero release..." -ForegroundColor Cyan

try {
    $allReleases = Invoke-RestMethod -Uri $releasesApi -UseBasicParsing
    $asset = $null
    $version = $null
    
    foreach ($release in $allReleases) {
        $foundAsset = $release.assets | Where-Object { $_.name -like "*.msi" -or $_.name -like "*x64-setup.exe" } | Select-Object -First 1
        if ($foundAsset) {
            $asset = $foundAsset
            $version = $release.tag_name
            break
        }
    }

    if ($asset) {
        Write-Host "Found version: $version" -ForegroundColor Green
        $downloadUrl = $asset.browser_download_url
        $fileName = $asset.name
        $tempPath = Join-Path $env:TEMP $fileName

        Write-Host "Downloading $fileName..." -ForegroundColor Gray
        $progressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $downloadUrl -OutFile $tempPath -UseBasicParsing
        
        Write-Host "Installing StashZero..." -ForegroundColor Cyan
        if ($fileName.EndsWith(".msi")) {
            Start-Process msiexec.exe -ArgumentList "/i `"$tempPath`" /quiet /norestart" -Wait
        } else {
            Start-Process -FilePath $tempPath -ArgumentList "/S" -Wait
        }

        if (Test-Path $tempPath) { Remove-Item $tempPath -Force }
        Write-Host "Installation completed successfully." -ForegroundColor Green
    } else {
        Write-Host "Error: No suitable release assets found." -ForegroundColor Red
    }
} catch {
    Write-Host "Error: Could not fetch releases. Check your internet connection." -ForegroundColor Red
    $PSItem.Exception.Message
}

