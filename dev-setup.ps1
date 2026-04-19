# StashZero One-Click Developer Environment Setup
# This script installs Node.js, Rust, and C++ Build Tools required for Tauri development.

$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "[SUCCESS] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }

Write-Info "StashZero Gelistirme Ortami Hazirlaniyor..."

# 1. Check for Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Warn "Node.js bulunamadi. Kuruluyor..."
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Start-Process winget -ArgumentList "install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements" -Wait
    } else {
        Write-Info "winget bulunamadi, dogrudan MSI indiriliyor..."
        $nodeMsi = "$env:TEMP\node-lts.msi"
        Invoke-WebRequest -Uri "https://nodejs.org/dist/v22.12.0/node-v22.12.0-x64.msi" -OutFile $nodeMsi
        Start-Process msiexec.exe -ArgumentList "/i `"$nodeMsi`" /quiet /norestart" -Wait
    }
    Write-Success "Node.js kuruldu. (Lutfen kurulum sonrasi terminali kapatip acin)"
} else {
    Write-Info "Node.js zaten yuklu: $(node -v)"
}

# 2. Check for Rust
if (!(Get-Command rustc -ErrorAction SilentlyContinue)) {
    Write-Warn "Rust (rustup) bulunamadi. Yukleniyor..."
    $rustupInstaller = "$env:TEMP\rustup-init.exe"
    Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile $rustupInstaller
    Start-Process $rustupInstaller -ArgumentList "-y --default-toolchain stable" -Wait
    Write-Success "Rust kuruldu."
} else {
    Write-Info "Rust zaten yuklu: $(rustc --version)"
}

# 3. Check for C++ Build Tools (Tauri requirement)
$vsFound = Get-Command cl.exe -ErrorAction SilentlyContinue
if (!$vsFound) {
    Write-Warn "C++ Build Tools (Visual Studio) bulunamadi. Yukleniyor..."
    Write-Info "Bu islem biraz zaman alabilir (yaklasik 2GB indirme)..."
    Start-Process winget -ArgumentList "install Microsoft.VisualStudio.2022.BuildTools --override '--wait --add Microsoft.VisualStudio.Component.VC.Tools.x86.x64 --add Microsoft.VisualStudio.Component.Windows10SDK.19041' --silent" -Wait
    Write-Success "C++ Build Tools kuruldu."
} else {
    Write-Info "C++ Build Tools zaten yuklu."
}

# 4. Install NPM Dependencies
Write-Info "Proje bagimliliklari yukleniyor (npm install)..."
npm install

Write-Success "------------------------------------------------"
Write-Success "Gelistirme ortami hazir!"
Write-Success "Uygulamayi baslatmak icin: npm run tauri dev"
Write-Success "------------------------------------------------"

# Optional: Prompt to start
$choice = Read-Host "Uygulamayi simdi baslatmak ister misiniz? (E/H)"
if ($choice -eq 'E' -or $choice -eq 'e') {
    npm run tauri dev
}
