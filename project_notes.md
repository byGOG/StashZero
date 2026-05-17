# StashZero - Proje Notları ve Yol Haritası

## Mevcut Durum

- Sürüm: `0.7.0`
- Platform: Windows 10/11
- Teknoloji: React 19, Vite 8, Tauri 2, Rust, Framer Motion
- Kütüphane: 23 kategori, 160'tan fazla uygulama/kaynak/betik
- Dağıtım: GitHub Releases üzerinden `i.ps1` tek satır kurulum betiği

StashZero, Windows kurulum sonrası hazırlık sürecini hızlandıran bir uygulama merkezi olarak konumlanıyor. Ana hedef; uygulama seçimi, kurulum, kaldırma, sistem kontrolü ve hızlı Windows ayarlarını tek arayüzde toplamak.

## Tamamlanan Ana Özellikler

- [x] Toplu uygulama kurulumu ve uygulama başına ilerleme takibi.
- [x] Global kurulum ilerlemesi ve canlı log paneli.
- [x] Registry ve dosya yolu tabanlı kurulu yazılım algılama.
- [x] Portable uygulama indirme, ayıklama, çalıştırma ve kaldırma akışları.
- [x] GitHub `latest` release çözümleme ve Windows asset fallback mantığı.
- [x] `.exe`, `.msi`, `.zip`, `.7z` ve script tabanlı kurulum desteği.
- [x] `post_install_cmd` çıktılarının satır satır UI loglarına aktarılması.
- [x] PowerShell/CMD destekli dahili terminal.
- [x] Log arama, filtreleme, kopyalama ve dosyaya kaydetme.
- [x] CPU, RAM, disk, ağ ve güvenlik bilgileri için canlı sistem panosu.
- [x] DNS, UAC, Defender, güç planı, tema ve masaüstü simgesi kontrolleri.
- [x] Tema, font, yazı boyutu, ses ve performans modu ayarları.
- [x] KEINEMUSIK SoundCloud oynatıcısı.
- [x] Türkçe arayüz odağı.

## v0.7.0 Durumu

### Backend

- [x] `download_form_post` alanı eklendi. TechPowerUp benzeri CSRF/cookie/form POST isteyen indirme akışları destekleniyor.
- [x] `install_path` alanı eklendi. Portable uygulamalar özel hedef klasörlere kurulabiliyor.
- [x] `create_desktop_shortcut` ve Başlat menüsü kısayol desteği güçlendirildi.
- [x] `launch_file` alanı ZIP/portable akışlarında hedef EXE seçimi için kullanılıyor.
- [x] `install_kill_targets` ile auto-launch yapan kurulum süreçleri bastırılabiliyor.
- [x] GitHub asset matcher, platform suffix'i olmayan ZIP release'leri yakalayacak şekilde genişletildi.
- [x] Portable kaldırma akışlarında ortam değişkeni genişletme iyileştirildi.
- [x] PE sürüm metinlerinde virgüllü sürüm formatı normalize edildi.

### Frontend

- [x] Script runner ile gerçek kurulum yapan girdiler ayrıştırıldı; uygun durumlarda Kuruldu/Kaldır akışı gösteriliyor.
- [x] Uygulama açıklamalarında okunabilirlik ve kontrast iyileştirildi.
- [x] `useInstallation` HMR bağımlılığı düzeltildi.
- [x] Log paneli terminal + analiz deneyimi olarak güncellendi.
- [x] Komut geçmişi ve terminal oturumu yönetimi iyileştirildi.

### Kütüphane

- [x] HWiNFO64, CPU-Z, GPU-Z, OCCT, DriverStore Explorer, BurnInTest, PerformanceTest ve FurMark 2 kurulum akışları güncellendi.
- [x] GOG Galaxy, JDownloader, Proton VPN, OpenVPN, GoodbyeDPI ve benzeri uygulamalarda auto-launch/cleanup davranışları iyileştirildi.
- [x] Hardcoded sürüm kullanan birçok girdide `Güncel` sentinel yaklaşımı benimsendi.
- [x] Logo ve ikon kaynakları güncellendi.

## v0.6.0'dan Taşınan Güvenilirlik Düzeltmeleri

- [x] Elevated PowerShell kurulumlarında `-PassThru` ile gerçek exit code yakalama.
- [x] GitHub API URL transform hatasının giderilmesi.
- [x] ZIP-only GitHub release fallback desteği.
- [x] Bilinen dosya uzantılarını koruyan indirme adı türetme.
- [x] Windows native `Expand-Archive` kullanımı.
- [x] Ortam değişkeni genişletmede büyük/küçük harf duyarsızlığı.
- [x] Portable EXE aramada `Select-Object -ExpandProperty` düzeltmesi.
- [x] Backend ve frontend hata metinlerinin Türkçeleştirilmesi.

## Bilinen Riskler ve Açık İşler

- [ ] `uninstall_portable` için yol validasyonu sertleştirilmeli. Kaldırma yolları izinli kök dizinlerle sınırlandırılmalı.
- [ ] `app_name` için traversal guard eklenmeli. `\\`, `/`, `:`, `..` gibi değerler reddedilmeli.
- [ ] `launch_portable` içinde PowerShell string escaping daha güvenli hale getirilmeli.
- [ ] `uninstall_software` içinde yükseltilmiş PowerShell'e aktarılan path escaping pattern'i standartlaştırılmalı.
- [ ] `remove_dir_all` öncesi junction/symlink guard eklenmeli.
- [ ] `scripts.rs` geçici `.ps1` dosyaları için tahmin edilebilir timestamp yerine random/UUID suffix kullanılmalı.

## v0.8.0 Adayları

- [ ] Cloud Sync: tema, font, favoriler ve paket profillerini Gist/WebDAV gibi opsiyonel bir uç noktayla eşitleme.
- [ ] Hazır profiller: Geliştirici, Oyuncu, Yeni format gibi tek tık kurulum setleri.
- [ ] Kurulum geçmişi ve geri alma: son kurulan uygulamaları timestamp ile izleyip toplu kaldırma.
- [ ] Sürükle-bırak özel paket içe aktarma.
- [ ] Klavye-only kart navigasyonu.
- [ ] Release notes/diff paneli.
- [ ] Visibility-aware telemetri: pencere arka plandayken Rust telemetry emitter'ını yavaşlatma veya durdurma.
- [ ] Defender ve sistem komutu cache'i: pahalı PowerShell fallback çağrılarına TTL ekleme.

## Geliştirme Komutları

```powershell
npm install
npm run tauri dev
npm run build
npm run test:run
npm run lint
```

## Dosya Haritası

- `src/data/library.js`: uygulama kataloğu, kategoriler, indirme ve kurulum metadatası.
- `src/hooks/useInstallation.js`: kurulum kuyruğu, ilerleme, log ve durum yönetimi.
- `src/hooks/useLibrary.js`: katalog hazırlama, kategori ve arama akışı.
- `src/hooks/useTelemetry.js`: sistem panosu verileri.
- `src/components/modals/LogPanel.jsx`: log analizi ve terminal arayüzü.
- `src/components/dashboard/AppGrid.jsx`: uygulama kartları ve aksiyonlar.
- `src-tauri/src/installer.rs`: indirme, kurulum, kaldırma, portable ve sürüm kontrol komutları.
- `src-tauri/src/scripts.rs`: PowerShell/CMD oturumları ve Windows ayar komutları.
- `src-tauri/src/sysinfo.rs`: hızlı/yavaş telemetri ve sistem bilgisi.
- `src-tauri/src/network.rs`: DNS yönetimi.
- `src-tauri/src/updater.rs`: GitHub release güncelleme kontrolü.

## Not

Kütüphane girdileri sistem komutları, URL'ler ve kaldırma yolları içerdiği için her yeni entry küçük bir güvenlik incelemesinden geçirilmelidir. Özellikle path silme, admin elevation, PowerShell escaping ve auto-launch bastırma akışları test edilmeden release'e alınmamalıdır.
