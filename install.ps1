# StashZero One-Liner Installer
# Optimized for PowerShell execution (irm | iex)

# Türkçe Karakter Desteği (Encoding ve Karakter Kodları)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Karakter dönüşüm fonksiyonu (Bozulmayı önlemek için)
function Get-T($text) {
    return $text.Replace('s*', [char]0x015F).Replace('S*', [char]0x015E).Replace('i*', [char]0x0131).Replace('I*', [char]0x0130).Replace('g*', [char]0x011F).Replace('G*', [char]0x011E)
}

$ErrorActionPreference = "Stop"

$repo = "byGOG/StashZero"
$appName = "StashZero"
$api = "https://api.github.com/repos/$repo/releases/latest"

Write-Host (Get-T "`n[+] StashZero Kurulumu Bas*latili*yor...") -ForegroundColor Cyan

try {
    # 1. En güncel sürüm bilgilerini al
    Write-Host (Get-T "[*] En g*uncel s*ur*um bilgileri sorgulani*yor...") -ForegroundColor Gray
    try {
        $release = Invoke-RestMethod -Uri $api
        $version = $release.tag_name
        Write-Host (Get-T "[v] Bulunan S*ur*um: $version") -ForegroundColor Green
    } catch {
        throw (Get-T "GitHub üzerinde yayinlanmis* (Release) bir s*ur*um bulunamadi. L*utfen *once GitHub deponuzda bir s*ur*um olus*turun.")
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
    Write-Host (Get-T "[+] Kurulum bas*latili*yor, l*utfen bekleyin...") -ForegroundColor Yellow
    
    if ($fileName.EndsWith(".msi")) {
        Start-Process msiexec.exe -ArgumentList "/i `"$tempPath`" /quiet /norestart" -Wait
    } else {
        Start-Process -FilePath $tempPath -ArgumentList "/S" -Wait
    }

    # 5. Temizlik
    if (Test-Path $tempPath) { Remove-Item $tempPath -Force }

    Write-Host (Get-T "`n[v] StashZero bas*ariyla kuruldu! Keyifli kullanimlar.`n") -ForegroundColor Green

} catch {
    Write-Host (Get-T "`n[!] Hata olus*tu: $($_.Exception.Message)") -ForegroundColor Red
}
