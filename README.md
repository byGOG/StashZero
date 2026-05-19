<p align="center">
  <img src="public/stashzero_logo_branded.png" alt="StashZero" width="140" />
</p>

<h1 align="center">StashZero</h1>

<p align="center">
  Windows 10/11 için hızlı, sade ve kapsamlı uygulama yönetim merkezi.
</p>

<p align="center">
  <a href="https://github.com/byGOG/StashZero/releases">
    <img alt="Sürüm" src="https://img.shields.io/badge/version-0.7.1-6366f1?style=for-the-badge">
  </a>
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-0078D6?style=for-the-badge&logo=windows&logoColor=white">
  <img alt="Tauri" src="https://img.shields.io/badge/Tauri-2.x-24C8DB?style=for-the-badge&logo=tauri&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111">
</p>

<p align="center">
  <a href="#hızlı-kurulum">Kurulum</a>
  ·
  <a href="#özellikler">Özellikler</a>
  ·
  <a href="#kütüphane">Kütüphane</a>
  ·
  <a href="#geliştirme">Geliştirme</a>
</p>

---

StashZero, yeni kurulan veya yeniden düzenlenen Windows sistemlerde uygulama seçme, kurma, kaldırma, çalıştırma ve sistem durumunu izleme işlerini tek arayüzde toplar. Amaç basit: format sonrası dakikalarca link aramak yerine ihtiyacın olanları seç, sıraya al, bırak StashZero halletsin.

## Hızlı Kurulum

PowerShell:

```powershell
irm bygog.github.io/StashZero/i.ps1 | iex
```

CMD:

```cmd
powershell -ExecutionPolicy Bypass -Command "irm bygog.github.io/StashZero/i.ps1 | iex"
```

Kurulum betiği GitHub Releases üzerinden en güncel MSI veya x64 kurulum paketini bulur, indirir ve sessiz kurulumla çalıştırır.

## Özellikler

| Alan | Neler Var |
| --- | --- |
| Toplu kurulum | Seçili uygulamaları sırayla indirir, kurar ve canlı ilerleme gösterir. |
| Kaldırma & çalıştırma | Kurulu uygulama algılama, portable çalıştırma ve kaldırma akışları. |
| Canlı log paneli | Backend logları, filtreleme, arama, kopyalama, `.log` olarak kaydetme. |
| Dahili terminal | PowerShell/CMD oturumu, komut geçmişi ve canlı çıktı akışı. |
| Sistem panosu | CPU, RAM, disk, ağ, güvenlik, DNS ve Windows durum bilgileri. |
| Hızlı Windows kontrolleri | DNS, UAC, Defender, güç ayarları, tema ve masaüstü simgeleri. |
| Kişiselleştirme | Tema, font, yazı boyutu, ses efektleri ve performans modu. |
| Medya | KEINEMUSIK SoundCloud oynatıcısı. |

## Kütüphane

`src/data/library.js` içinde 23 kategoride 160'tan fazla uygulama, web kaynağı ve otomasyon betiği bulunur.

| Kategori | Örnekler |
| --- | --- |
| Web Tarayıcıları | Chrome, Firefox, Brave, Zen, Tor, Mullvad |
| İletişim & Sosyal | Discord, Telegram, WhatsApp, Thunderbird |
| Üretkenlik | Google Drive, Dropbox, CopyQ, Flow Launcher |
| Multimedya | VLC, OBS, HandBrake, ImageGlass, Spotify, foobar2000 |
| Geliştirme | VS Code, Git, Node.js, Python, Docker, Postman |
| Yapay Zeka | Claude, Cursor, Antigravity ve ilgili araçlar |
| Donanım & Test | HWiNFO64, CPU-Z, GPU-Z, OCCT, FurMark, PassMark |
| Sistem Araçları | PowerToys, Rufus, Ventoy, BleachBit, UniGetUI |
| Güvenlik | Malwarebytes, Bitwarden, ESET, Sandboxie Plus |
| Gizlilik & Ağ | Proton VPN, OpenVPN, GoodbyeDPI, DNS Jumper |
| Oyun & Platformlar | Steam, Epic Games, Battle.net, GOG Galaxy |
| Dosya Yönetimi | 7-Zip, WinRAR, WizTree, TeraCopy, OneCommander |
| Sanallaştırma | VirtualBox, Extension Pack, VMware Workstation Pro |
| Betikler & Otomasyon | MAS, Office Tool Plus, CTT WinUtil, SpotX |

Web kaynakları doğrudan resmi sayfayı açar; kurulum girdileri ise sessiz kurulum argümanları, kontrol yolları, kaldırma komutları ve isteğe bağlı post-install adımlarıyla tanımlanır.

## Kurulum Motoru

StashZero'nun Tauri/Rust backend'i farklı dağıtım tiplerini tek bir kurulum yüzeyinde toplar:

```text
library.js
   |
   |  app metadata, URLs, args, checks
   v
React UI  <---- events/logs/progress ---->  Tauri commands
   |                                      installer.rs
   |                                      scripts.rs
   v                                      sysinfo.rs
User actions                             network.rs
```

Desteklenen akışlar:

- Direkt `.exe`, `.msi`, `.zip`, `.7z` ve portable kurulumlar.
- GitHub `latest` release çözümleme ve Windows asset seçimi.
- Form POST/cookie isteyen indirme sayfaları için `download_form_post`.
- `post_install_cmd` çıktılarının satır satır UI loglarına aktarılması.
- Auto-launch yapan kurulumlarda `install_kill_targets` ile süreç kapatma.
- `install_path`, `launch_file`, masaüstü ve Başlat menüsü kısayolları.
- Registry tabanlı kurulu yazılım taraması ve toplu dosya sürüm sorgusu.

## Klavye Kısayolları

| Kısayol | İşlev |
| --- | --- |
| `Ctrl + F` | Uygulama arama alanına odaklanır |
| `Ctrl + A` | Arama alanında değilken görünen uygulamaları seçer |
| `F6` | Seçili uygulamalar için kurulumu başlatır |
| `Esc` | Aramayı temizler veya açık menüleri kapatır |

## Geliştirme

Gereksinimler:

- Node.js ve npm
- Rust toolchain
- Tauri 2.x sistem gereksinimleri

Kurulum:

```powershell
npm install
```

Tauri geliştirme ortamı:

```powershell
npm run tauri dev
```

Web build:

```powershell
npm run build
```

Test ve lint:

```powershell
npm run test:run
npm run lint
```

Sürüm senkronizasyonu:

```powershell
npm run version:sync
```

## Proje Yapısı

```text
src/
  components/          React arayüz bileşenleri
  hooks/               Kurulum, telemetri, terminal ve kütüphane akışları
  data/library.js      Uygulama kataloğu
  utils/               Ayarlar, update checker ve Tauri yardımcıları

src-tauri/src/
  installer.rs         İndirme, kurulum, kaldırma ve portable akışlar
  scripts.rs           PowerShell/CMD ve Windows ayar komutları
  sysinfo.rs           Sistem bilgisi ve telemetri
  network.rs           DNS yönetimi
  updater.rs           GitHub release güncelleme kontrolü
```

## Güvenlik

StashZero uygulamaları mümkün olduğunca resmi üretici bağlantılarından veya bilinen release kanallarından indirir. Yönetici izni gereken işlemler Windows UAC üzerinden çalışır.

`src/data/library.js` sistem komutları, indirme bağlantıları ve kaldırma yolları içerdiği için yeni kütüphane girdileri özellikle şu başlıklarda incelenmelidir:

- Path traversal ve beklenmeyen silme yolları.
- PowerShell string escaping.
- Yönetici izniyle çalışan komutlar.
- Auto-launch bastırma ve post-install cleanup adımları.
- Resmi indirme URL'si ve sessiz kurulum argümanları.

## Durum

| Başlık | Durum |
| --- | --- |
| Güncel sürüm | `0.7.0` |
| Hedef platform | Windows 10/11 |
| UI | React 19 + Vite 8 |
| Desktop runtime | Tauri 2 |
| Backend | Rust |
| Test | Vitest |
| Paketleme | Tauri NSIS |

## Bağlantılar

- Site: https://bygog.github.io/
- Releases: https://github.com/byGOG/StashZero/releases
- Topluluk: https://www.sordum.net/

---

<p align="center">
  StashZero, byGOG Software tarafından Windows kullanıcıları için ücretsiz olarak geliştirilmektedir.
</p>
