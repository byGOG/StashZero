# StashZero One-Liner Installer
# Optimized for PowerShell execution (irm | iex)

$ErrorActionPreference = "Stop"

$repo = "byGOG/StashZero"
$appName = "StashZero"
$api = "https://api.github.com/repos/$repo/releases/latest"

Write-Host "`n[+] StashZero Kurulumu Başlatılıyor..." -ForegroundColor Cyan

try {
    # 1. En güncel sürüm bilgilerini al
    Write-Host "[*] En güncel sürüm bilgileri sorgulanıyor..." -ForegroundColor Gray
    try {
        $release = Invoke-RestMethod -Uri $api
        $version = $release.tag_name
        Write-Host "[✓] Bulunan Sürüm: $version" -ForegroundColor Green
    } catch {
        throw "GitHub üzerinde yayınlanmış (Release) bir sürüm bulunamadı. Lütfen önce GitHub deponuzda bir sürüm oluşturun veya release assetlerini ekleyin."
    }

    # 2. Uygun asset'i bul (MSI tercih edilir, yoksa EXE)
    $asset = $release.assets | Where-Object { $_.name -like "*.msi" -or $_.name -like "*x64-setup.exe" } | Select-Object -First 1

    if (-not $asset) {
        throw "Üzgünüz, bu sürüm için uygun bir Windows kurulum dosyası bulunamadı."
    }

    $downloadUrl = $asset.browser_download_url
    $fileName = $asset.name
    $tempPath = Join-Path $env:TEMP $fileName

    # 3. İndirme işlemi
    Write-Host "[*] İndiriliyor: $fileName" -ForegroundColor Gray
    Write-Host "[*] URL: $downloadUrl" -ForegroundColor DarkGray
    
    $progressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $downloadUrl -OutFile $tempPath -UseBasicParsing
    $progressPreference = 'Continue'

    # 4. Kurulumu başlat
    Write-Host "[+] Kurulum başlatılıyor, lütfen bekleyin..." -ForegroundColor Yellow
    
    if ($fileName.EndsWith(".msi")) {
        # MSI için sessiz kurulum (isteğe bağlı /quiet eklenebilir)
        Start-Process msiexec.exe -ArgumentList "/i `"$tempPath`"" -Wait
    } else {
        # EXE/Setup için
        Start-Process -FilePath $tempPath -Wait
    }

    # 5. Temizlik
    if (Test-Path $tempPath) {
        Remove-Item $tempPath -Force
    }

    Write-Host "`n[✓] StashZero başarıyla kuruldu! Keyifli kullanımlar.`n" -ForegroundColor Green

} catch {
    Write-Host "`n[!] Hata oluştu: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "[!] Lütfen internet bağlantınızı kontrol edin veya GitHub sayfasını ziyaret edin: https://github.com/$repo" -ForegroundColor Gray
}

# Son
