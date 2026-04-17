# StashZero One-Liner Installer
# Minimal & Silent Version

$ErrorActionPreference = "SilentlyContinue"

$repo = "byGOG/StashZero"
$releasesApi = "https://api.github.com/repos/$repo/releases"

try {
    $allReleases = Invoke-RestMethod -Uri $releasesApi -UseBasicParsing
    $asset = $null
    
    foreach ($release in $allReleases) {
        $foundAsset = $release.assets | Where-Object { $_.name -like "*.msi" -or $_.name -like "*x64-setup.exe" } | Select-Object -First 1
        if ($foundAsset) {
            $asset = $foundAsset
            break
        }
    }

    if ($asset) {
        $downloadUrl = $asset.browser_download_url
        $fileName = $asset.name
        $tempPath = Join-Path $env:TEMP $fileName

        $progressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $downloadUrl -OutFile $tempPath -UseBasicParsing
        
        if ($fileName.EndsWith(".msi")) {
            Start-Process msiexec.exe -ArgumentList "/i `"$tempPath`" /quiet /norestart" -Wait
        } else {
            Start-Process -FilePath $tempPath -ArgumentList "/S" -Wait
        }

        if (Test-Path $tempPath) { Remove-Item $tempPath -Force }
    }
} catch {
    # Silent fail
}
