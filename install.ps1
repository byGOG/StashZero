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

Write-Host (Get-T "`n[+] StashZero Kurulumu Bas*lat i* l i* yor...") -ForegroundColor Cyan

try {
    # 1. En güncel sürüm bilgilerini al
    Write-Host (Get-T "[*] En gu*ncel su*ru*m bilgileri sorgulani*yor...") -ForegroundColor Gray
    try {
        $release = Invoke-RestMethod -Uri $api
        $version = $release.tag_name
        Write-Host (Get-T "[v] Bulunan su*ru*m: $version") -ForegroundColor Green
    } catch {
        throw (Get-T "GitHub üzerinde yayinlanmis* (Release) bir su*ru*m bulunamadi.")
    }

    # 2. Uygun asset'i bul
    $asset = $release.assets | Where-Object { $_.name -like "*.msi" -or $_.name -like "*x64-setup.exe" } | Select-Object -First 1

    if (-not $asset) {
        throw (Get-T "Uygun bir kurulum dosyasi bulunamadi.")
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
