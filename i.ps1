# StashZero One-Liner Installer
# Optimized for PowerShell execution (irm | iex)

# Türkçe Karakter Desteği (Encoding ve Karakter Kodları)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Karakter dönüşüm fonksiyonu (Bozulmayı önlemek için - Final Precision)
function Get-T($text) {
    $text = $text -replace 's\*', "$([char]0x015F)" # ş
    $text = $text -replace 'S\*', "$([char]0x015E)" # Ş
    $text = $text -replace 'i\*', "$([char]0x0131)" # ı
    $text = $text -replace 'I\*', "$([char]0x0130)" # İ
    $text = $text -replace 'g\*', "$([char]0x011F)" # ğ
    $text = $text -replace 'G\*', "$([char]0x011E)" # Ğ
    $text = $text -replace 'u\*', "$([char]0x00FC)" # ü
    $text = $text -replace 'U\*', "$([char]0x00DC)" # Ü
    $text = $text -replace 'o\*', "$([char]0x00F6)" # ö
    $text = $text -replace 'O\*', "$([char]0x00D6)" # Ö
    $text = $text -replace 'c\*', "$([char]0x00E7)" # ç
    $text = $text -replace 'C\*', "$([char]0x00C7)" # Ç
    return $text
}

$ErrorActionPreference = "Stop"

$repo = "byGOG/StashZero"
$appName = "StashZero"
$api = "https://api.github.com/repos/$repo" + "/releases/latest"

Write-Host (Get-T "`n[+] StashZero Kurulumu Bas*lati*li*yor...") -ForegroundColor Cyan

try {
    # 1. En güncel sürüm bilgilerini al (Asset içeren en son sürümü bul)
    Write-Host (Get-T "[*] Uygun kurulum paketi sorgulanıyor...") -ForegroundColor Gray
    
    $releasesApi = "https://api.github.com/repos/$repo/releases"
    try {
        $allReleases = Invoke-RestMethod -Uri $releasesApi
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

        if (-not $asset) {
            throw (Get-T "GitHub üzerinde uygun bir kurulum dosyası içeren sürüm bulunamadı.")
        }
        
        Write-Host (Get-T "[v] Kullanılabilir en güncel sürüm: $version") -ForegroundColor Green
    } catch {
        throw (Get-T "GitHub üzerinden sürüm bilgileri alınamadı: $($_.Exception.Message)")
    }

    $downloadUrl = $asset.browser_download_url
    $fileName = $asset.name
    $tempPath = Join-Path $env:TEMP $fileName

    # 3. İndirme
    Write-Host (Get-T "[*] Indiriliyor: $fileName") -ForegroundColor Gray
    
    $progressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $downloadUrl -OutFile $tempPath -UseBasicParsing
    $progressPreference = 'Continue'

    # 4. Kurulum
    Write-Host (Get-T "[+] Kurulum bas*lati*li*yor, lu*tfen bekleyin...") -ForegroundColor Yellow
    
    if ($fileName.EndsWith(".msi")) {
        Start-Process msiexec.exe -ArgumentList "/i `"$tempPath`" /quiet /norestart" -Wait
    } else {
        Start-Process -FilePath $tempPath -ArgumentList "/S" -Wait
    }

    # 5. Temizlik
    if (Test-Path $tempPath) { Remove-Item $tempPath -Force }

    Write-Host (Get-T "`n[v] StashZero bas*ari*yla kuruldu! Keyifli kullani*mlar.`n") -ForegroundColor Green

} catch {
    Write-Host (Get-T "`n[!] Hata olus*tu: $($_.Exception.Message)") -ForegroundColor Red
}
