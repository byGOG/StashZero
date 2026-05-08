# 💎 StashZero - Proje Notları ve Yol Haritası

## 📌 Mevcut Durum ve Hedefler
- **Projenin Genel Amacı:** Windows bilgisayarları için sade, hızlı ve estetik bir uygulama yönetim merkezi (kurulum, güncelleme, kaldırma) oluşturmak. Tek tıklamayla ihtiyacınız olan her şeyi kurmanızı sağlamak.
- **Hedef Kitle:** Format sonrası hızlı kurulum yapmak isteyenler, geliştiriciler, oyuncular ve genel Windows 10/11 kullanıcıları.
- **Teknoloji Yığını:** React 19, Tauri 2.x, Vite, Framer Motion (Akıcı arayüz animasyonları için).

## 🚀 Proje Kapsamı ve Mevcut Özellikler
- **Toplu Uygulama Kurulumu:** 23'ten fazla kategoride yüzlerce uygulamayı (Tarayıcılar, Geliştirici Araçları, Güvenlik vb.) tek tıkla kurma.
- **Canlı Sistem Panosu:** CPU, RAM, Disk doluluğu, Ağ indirme/yükleme hızı takibi.
- **Hızlı Windows Ayarları:** Masaüstü simgeleri, güç planı, DNS değiştirme, Windows Defender ve UAC yönetimi.
- **Kişiselleştirme:** Karanlık (Obsidian) / Aydınlık (Minimalist) temalar, ölçeklenebilir fontlar, ses efektleri.
- **Pratik Kullanım:** `i.ps1` betiği ile PowerShell üzerinden indirme gerekmeden direkt kurulum ve çalıştırma.
- **Ekstralar:** Dahili KEINEMUSIK radyo oynatıcısı.

## 📝 Yapılacaklar (To-Do)
- [x] Uygulama indirme loglarının ve ilerleme çubuğunun (progress bar) React ile entegrasyonu. (Bireysel ve Global progress eklendi)
- [x] Tauri Rust backend tarafında sessiz kurulum (silent install) argümanlarının düzenlenmesi. (PowerShell ArgumentList dizisi olarak güncellendi)
- [x] Windows ayarlarını değiştiren (DNS, Güç planı, UAC) Rust komutlarının yazılması ve frontend ile bağlanması. (Hazır ve aktif)
- [x] Sistem performansı panelindeki anlık CPU, RAM ve Disk değerleri için Rust event listener'larının kurulması. (Fast-telemetry emitter eklendi, polling kaldırıldı)
- [x] **Paket İçe/Dışa Aktarma:** Seçili uygulamaları JSON olarak yedekleme ve geri yükleme.
- [x] **Sistem Yazılım Algılama (Deep Scan):** Kayıt defteri üzerinden kurulu tüm programları listeleme.
- [x] **Türkçe Dil Desteği:** Uygulama tamamen Türkçe arayüze sabitlendi (i18n kaldırıldı).
- [x] **Dinamik Uygulama Veritabanı:** Kütüphane verilerinin GitHub üzerinden anlık güncellenmesi sağlandı.
- [x] **Güncelleme Kontrolü (Update Support):** Kurulu uygulamaların yeni sürümlerini algılama ve görsel uyarı sistemi eklendi.
- [x] **Kategori Yönetimi (Favoriler):** Uygulamaları favorilere ekleme ve özel favoriler kategorisi desteği.
- [x] **Gelişmiş Log Analizi:** Logları türüne göre (Hata, Başarı, Süreç) filtreleme, arama ve dosyaya (.log) kaydetme desteği.
- [x] **Premium UI/UX Cilalama:** Glassmorphism efektleri, rim lighting, mikro-animasyonlar ve dinamik mesh gradient geçişleri ile görsel kalite artırıldı.

## Roadmap & Gelecek Planları 🚀
- **v0.4.0 (Tamamlandı):** Güncelleme Desteği, Favori Sistemi ve Performans Optimizasyonu.
- **v0.5.0 (Tamamlandı):** Topluluk Odaklı Paylaşım ve Gelişmiş Paket Yönetimi.
- **v0.6.0 (Yayına Hazır):** Gelişmiş Log Analizi, Profil yönetimi/i18n/sıralama temizliği, Premium UI/UX cilalama (glassmorphism + mesh gradient), kod kalitesi ve performans iyileştirmeleri. *Cloud Sync bu sürümden v0.7.0'a ertelendi.*
- **v0.7.0 (Planlanıyor):** Cloud Sync (Opsiyonel) ve aşağıdaki "Notlar ve Fikirler" bölümündeki maddeler.

## 🧹 v0.6.0 İç Temizlik (Code Review)
- [x] `useInstallation` hook'undaki ikinci sürüm karşılaştırma kopyası kaldırıldı; merkezi `compareVersions` (utils/updateChecker) kullanılıyor.
- [x] Kurulum döngüsündeki her uygulama sonrası tekrarlanan `refreshInstalledStatus` çağrısı tek seferlik son tarama + iyimser inline güncelleme ile değiştirildi (1.5s gecikme registry write lag için).
- [x] `script_cmd` dalı için de iyimser `setInstalledApps` eklendi; toplu kurulumda anlık geri bildirim sağlanıyor.
- [x] `InstalledAppsModal` içinde her render'da O(N×M) çalışan installer adı eşleme mantığı `useMemo` ile indekslenip satır başına tek çağrıya indirildi.
- [x] `InstalledAppsModal` artık parent tarafından koşullu mount ediliyor; tekrar açılışta bayat veri akışı çözüldü.
- [x] `AboutModal` versiyon etiketi sabit string yerine Vite tarafından enjekte edilen `__APP_VERSION__`'dan okunuyor.
- [x] `SettingsModal` performans modu segmented kontrolü artık yerel `PERF_MODES` sabitini kullanıyor.
- [x] `AppGrid` kart sınıfı imperative `if (...) cardClass +=` zinciri yerine `filter+join` ile yazıldı.
- [x] `useInstallation` içindeki gereksiz `useState` + senkron `useEffect` (HMR yorumlu) `useMemo`'ya dönüştürüldü.

## 🐞 v0.6.0 Live Test Bulguları & Düzeltmeler
- [x] **Pre-existing seçim bug'ı:** `useLibrary` `LEGENDARY_APPS`'i `path: a.id` map'lemeden döndürüyordu. `selected.has(app.path)` her kart için `undefined` veriyor, tek tıkla tüm kartlar seçili görünüyordu. v0.4.0'dan beri latentmiş; canlı testte yakalandı. `useLibrary` şimdi `withPath()` helper ile her giriş için `path` alanını garanti ediyor.
- [x] **post_install_cmd streaming:** [src-tauri/src/installer.rs](src-tauri/src/installer.rs) — eski "fire-and-forget" `std::process::Command::status()` çağrıları yerine `tokio::process::Command` + `BufReader::lines()` ile satır satır stdout yakalama. Her satır `[post_install]` etiketiyle log'a + `backend-log` event'iyle UI panele yansıtılıyor. "Kurulum başarıyla tamamlandı" mesajı artık post_install **sonra** atılıyor (sıra düzeltildi).

## 🛠️ v0.6.0 Backend Reliability (Live Test Bug Chain — 2026-05-06)
*Canlı test sırasında ortaya çıkan ve yakalanan zincirleme Rust hataları. Her biri sessizce çalışan ya da başka bir hatayı maskeleyen bug'lardı; `-PassThru` fix'i ile silent-fail davranışı görünür hale geldi ve sonraki bug'lar art arda yakalandı.*
- [x] **Silent-fail bug** ([installer.rs](src-tauri/src/installer.rs)): `Start-Process -Wait -Verb RunAs` (PowerShell) `-PassThru` olmadan elevated process'in exit code'unu döndürmüyordu → Rust her zaman `success=true` görüyordu. BleachBit `/S` flag'i `666660` (insufficient privileges) verdiği halde "kuruldu" raporlanıyordu. `$p = Start-Process ... -PassThru; exit $p.ExitCode` ile gerçek exit code propagate ediliyor. Hem `install_exe_from_url` hem `uninstall_software` aynı pattern.
- [x] **GitHub API URL transform**: `url.replace("/releases/latest", "/releases/latest")` no-op idi; `/download/<file>.exe` suffix'i strip edilmiyordu → API `404` → "kurulum dosyası bulunamadı" (Rufus). Şimdi `.find("/releases/latest")` ile prefix kesilip transformasyon yapılıyor.
- [x] **GitHub asset matcher Windows ZIP fallback**: Sadece `.exe` aranıyordu; Ventoy gibi ZIP-only release'leri reddediliyordu. Fallback olarak `.zip` + (`windows`/`win64`/`-win`) içeren asset'lere düşüyor.
- [x] **Known extensions preserve**: `file_name` derivasyonu `.zip`/`.msi`/`.7z` URL'leri sessizce `<package_id>.exe`'ye düşürüyordu → indirilen dosya yanlış uzantıyla kaydediliyor → Expand-Archive reddediyor. Şimdi bilinen archive uzantıları korunuyor; sadece direkt `.exe`'ler `<id>.exe` olarak normalize ediliyor.
- [x] **`tar` → `Expand-Archive`**: Windows'ta `tar` çağrısı POSIX tar'ı (Git Bash bundled) çağırıyordu, `C:\` yolunu remote host olarak yorumluyor ve `Cannot connect to C: resolve failed` hatası veriyordu. Native PowerShell `Expand-Archive -Force` ile değiştirildi.
- [x] **`expand_env_vars` case-insensitive**: Map sadece `$env:LocalAppData` (camelCase) tanıyor, library'deki `$env:LOCALAPPDATA` (büyük harf) sessizce expand olmadan geçiyordu → `check_path` hep `false` → kurulu uygulamalar tespit edilmiyor. Loop case-insensitive find/replace ile yazıldı; tüm büyük/küçük varyantlar artık çalışıyor.
- [x] **`Expand-Property` typo**: [installer.rs:136](src-tauri/src/installer.rs) `launch_portable` recursive .exe arama PowerShell komutunda `Expand-Property` yanlış cmdlet adıydı (doğrusu `Select-Object -ExpandProperty`). O&O AppBuster gibi nested klasör install'larında "Uygulama bulunamadı" hatasına yol açıyordu.
- [x] **İngilizce error string'leri Türkçeleştirildi**: `curl.exe error/process error` → `curl.exe hatası/süreç hatası`, `Kurulum process error` → `Kurulum süreç hatası`, `Exit code` → `Çıkış kodu`. Frontend'de de `running.../launching.../Error:` → `çalıştırıldı./başlatıldı./Hata:`.

## 🎨 v0.6.0 UI Modernization (2026-05-06)
- [x] **LogPanel header düzeni**:
  - PS/CMD shell switcher üst header'dan alt prompt çubuğuna taşındı (compact varyant — terminal ile bağlam içinde)
  - 2 vertical divider kaldırıldı, sağ taraf nefes aldı
  - "ONLINE" pill (separat element) → header başlığı altında inline `AKTİF` badge
  - Action butonları (kopyala / kaydet / temizle) tek bir grup container'ında; close butonu ayrı durdu
  - Filter tab'lar: kategori-renkli noktalar (Hepsi=beyaz, Hatalar=kırmızı, Başarı=yeşil, Süreç=sarı) + active state'te glow + hafif arka plan
  - Title block: 36×36 yumuşak yeşil glow icon chip + tabular-nums count badge
- [x] **Sidebar footer** items: `justify-content: space-between` → `flex-start` + 12px gap (icon + label sola yaslı, doğal okuma sırası)
- [x] **AboutModal i18n**: "Inspired by the simple..." paragrafı + "© 2026 Software Environment" Türkçeleştirildi.
- [x] **Tüm Türkçeleştirme**: AppGrid log mesajları (`running...`/`launching...` → `çalıştırıldı./başlatıldı.`), `Error:` → `Hata:`, Rust process error string'leri.

## 🧪 v0.6.0 Live Test Matrisi (2026-05-04 / 2026-05-06)
*Refactor + reliability sonrası 32+ işlem, 0 regresyon:*

| Uygulama | Kur | Kaldır | Not |
|---|---|---|---|
| Mullvad Browser | — | ✅ | |
| Firefox | — | ✅ | |
| Tor Browser 15.0.11 | ✅ ×2 | ✅ ×2 | URL 15.0.10→15.0.11 güncellendi (404 fix) |
| Thunderbird | ✅ | ✅ | |
| VLC Player | ✅ | ✅ | |
| Subtitle Edit 4.0.15 | ✅ | ✅ | |
| OBS Studio 32.1.2 | ✅ | ✅ | 154 MB, 13 sn |
| HandBrake 1.11.1 | ✅ | ✅ | |
| AIMP | ✅ ×3 | ✅ ×3 | `version: "Son Sürüm"` sentinel'a çevrildi (auto-latest URL) |
| foobar2000 + Free Encoder Pack | ✅ ×4 | ✅ ×4 | Encoder Pack streaming akışıyla doğrulandı |
| Resource Hacker | ✅ | ✅ | |
| BleachBit 4.6.0 | ✅ ×2 | ✅ ×2 | `/S /allusers` flag eklendi; `-PassThru` fix sayesinde silent-fail tespit edildi |
| Sysinternals Suite | — | — | Kataloğdan kaldırıldı (kullanıcı talebi) |
| O&O AppBuster (portable) | ✅ | ✅ | URL `OOAppBuster.exe` → `OOAPB.exe` güncellendi |
| Rufus 4.14 (portable) | ✅ | ✅ | GitHub API URL transform fix (auto-latest çözünürlük) |
| Ventoy 1.1.12 (portable) | ✅ | ✅ | ZIP fallback + Expand-Archive + extension preserve zinciri |
| Balena Etcher 2.1.4 | ✅ | ✅ | Squirrel.Windows pattern: `check_path` + post_install kill loop + `Update.exe --uninstall -s` |

## 📚 v0.6.0 Library Veri Düzeltmeleri
- [x] **Tor Browser**: `version` 15.0.10 → 15.0.11; `download_url` benzer şekilde (eski URL torproject.org'da 404).
- [x] **AIMP**: hardcoded `version: "5.40.2716"` → `"Son Sürüm"` sentinel; `download_url` zaten "latest stable" redirect'i.
- [x] **O&O AppBuster**: `download_url` `OOAppBuster.exe` → `OOAPB.exe` (resmi sunucuda yeniden isimlendirilmiş, eski URL 404).
- [x] **BleachBit**: `install_args` `/S` → `/S /allusers` (NSIS sadece `/S` ile insufficient-privileges silent-fail veriyor); `uninstall_path` eklendi.
- [x] **Balena Etcher**: `check_path` + `post_install_cmd` (6 saniyelik kill loop ile auto-launch'ı kapat) + `uninstall_script` (Squirrel.Windows `Update.exe --uninstall -s` pattern + kalıntı klasör temizliği) eklendi.
- [x] **foobar2000**: `post_install_cmd` `Write-Host` ile Türkçe ilerleme satırları + Encoder Pack URL'i log'a düşürülüyor (kullanıcı görünürlüğü).
- [x] **Sysinternals Suite**: Kataloğdan ve README'den kaldırıldı (kullanıcı talebi).
- [x] **ImageGlass Portable**: `imageglass-portable` entry'si kataloğdan çıkarıldı (kullanıcı talebi).

## 🆕 v0.7.0 Yeni Özellikler (2026-05-08)

### Backend (installer.rs)
- [x] **`download_form_post`** field — TechPowerUp gibi 3-aşamalı CSRF/cookie POST akışı içeren mirror seçici siteler için. Library entry'de `{ id_regex, server_regex }` config; Rust internal'de curl + cookie jar + regex extract + Location header parse. Reusable (FOSSHUB-gated, MajorGeeks vb. için).
- [x] **`install_path`** field — Portable mode için custom hedef klasör (default `C:\StashZero\<app>` yerine örn. `C:\Program Files\<app>`). Single-file portable uygulamaları "kalıcı" konuma indirmek için.
- [x] **`create_desktop_shortcut`** field — Kurulum sonrası WScript.Shell ile masaüstü `.lnk` oluştur. Portable EXE → target path'a; ZIP extract → `launch_file` veya extracted klasördeki ilk `.exe`'ye.
- [x] **`launch_file`** field — install_exe_from_url'e eklendi (önceden yalnız launch_portable'daydı). ZIP extract sonrası shortcut'ın hedef exe'sini belirler.
- [x] **`install_kill_targets`** field — Inno [Run] section'da hardcoded auto-launch yapan installer'lar için (HWiNFO64 örneği). Elevated PS-of-PS (base64) ile install + 500ms aralıklı poll-kill aynı admin context'te → tek UAC, post-install pencere kalmıyor.
- [x] **GitHub asset matcher 3. fallback** — Önceki: `.exe` non-portable veya `.zip + windows/win64/-win` keyword. Yeni: any `.zip` (linux/macos/arm/source/symbols hariç). DriverStoreExplorer-v1.0.26.zip gibi platform-suffix'i olmayan tek asset'ları yakalar.
- [x] **`uninstall_portable` env expand** — `uninstall_paths` içindeki `$env:USERPROFILE\Desktop\App.lnk` benzeri girdiler artık expand_env_vars ile genişletiliyor.
- [x] **`clean_version` PE comma normalization** — CPU-Z'nin `ProductVersion="2, 19, 0, 0"` formatı doğru "2.19" olarak gösterilir (önceden "2," çıkıyordu).

### UI (AppGrid.jsx + App.css + useInstallation.js)
- [x] **`isInstalled` hybrid logic** — Önceden `script_cmd` varsa otomatik suppress oluyordu. Yeni: `script_cmd && (uninstall_script || uninstall_path)` → real-install say (Kuruldu rozeti + Kaldır butonu görünür). Çalıştır butonu yalnız runner-style (uninstall_* yok) script_cmd entry'lerinde gösterilir.
- [x] **`.app-description` görünürlük** — `font-size: 11px → 12.5px`, `color: --text-muted → --text-secondary` (kontrast iyileştirmesi).
- [x] **`useInstallation` HMR fix** — `useMemo([], )` → `useMemo([LEGENDARY_APPS], )`; library.js HMR güncellemesi installers state'ine yansır (önceden F5 gerekiyordu).

### Library Veri Düzeltmeleri (v0.7.0)
- [x] **HWiNFO64**: `hwi_latest.exe` (404) → `hwi64_846.exe`; `install_kill_targets` ile auto-launch suppress.
- [x] **CPU-Z**: `www.cpuid.com/downloads/...` (interstitial HTML) → `download.cpuid.com/...` (real 4.6MB EXE); Inno args.
- [x] **GPU-Z**: TechPowerUp form-post download (3-step CSRF) + `-installSilent` (gerçek silent flag).
- [x] **OCCT**: ocbase.com `edition:Personal/os:Windows` URL; portable + `create_desktop_shortcut`.
- [x] **DriverStore Explorer**: GitHub fallback ZIP matcher; `launch_file: "Rapr.exe"` + `create_desktop_shortcut`.
- [x] **BurnInTest, PerformanceTest**: `bit_setup.exe`/`petst.exe` 404 → `BurnInTest_Windows_x86-64.exe`/aynı isim ama doğru install_args; PassMark Inno pattern.
- [x] **FurMark 2**: `dl/show/600` (HTML, ROG 0.8.1) → `dl/get/831` (302→34MB FurMark 2.10.2 setup).
- [x] **Win11 MCT**: hardcoded `version: "v24H2"` → `"Son Sürüm"` (fwlink dinamik).
- [x] **17 entry'de hardcoded version**: tek seferde `"Son Sürüm"`'e çevrildi (Tor, CopyQ, Subtitle Edit, HandBrake, ImageGlass, Spotify Downloader, PowerShell 7, Cursor AI, Antigravity AI, PowerToys, Flow Launcher, VMware, Defender Control/Remover, WUB, OpenVPN, DNS Jumper).
- [x] **UniGetUI logo**: favicon.ico → resmi `Devolutions/UniGetUI/media/icon.svg` (jsdelivr CDN).
- [x] **HWiNFO logo**: 1KB `logo-sm.png` → 4KB `hwi_logo_flat_square_192.png`.

## 🐛 Bilinen Hatalar (Bugs)
- [ ] *Yeni hata raporlanmadı.*

## 💡 Notlar ve Fikirler
- **Dinamik Uygulama Veritabanı:** Uygulama indirme linklerini uygulama içerisine gömmek yerine, GitHub üzerinden çekilen dinamik bir JSON dosyasıyla beslemek linkler güncellendiğinde uygulamanın tekrar derlenmesini önleyecektir.
- **Optimizasyon:** [x] Performans modu devreye girdiğinde Framer Motion animasyonlarını tamamen kapatarak düşük donanımlı sistemlerde CPU yükünü azaltmak sağlandı (MotionConfig & Global CSS override).

### 🔒 v0.7.0 Güvenlik Sertleştirme (Audit Bulguları)
*Aşağıdaki maddeler bir kod incelemesi sırasında tespit edilen ve kütüphane JSON'una tam güven varsayımına dayanan zayıflıklardır. Şu anki `library.js` içerikleri güvenli, fakat şema kötüye kullanıma açık.*
- [ ] **`uninstall_portable` path validasyonu** ([src-tauri/src/installer.rs](src-tauri/src/installer.rs)): `uninstall_paths` içindeki yolları izinli kök dizinler altına (`%LOCALAPPDATA%`, `%APPDATA%`, `%ProgramFiles%`, `%ProgramData%`, `C:\StashZero`) sınırla. `..` içeren ya da kanonik yolu çok kısa olan girdileri reddet.
- [ ] **`app_name` traversal guard** (installer.rs fallback `C:\StashZero\<app_name>`): `app_name` içinde `\\`, `/`, `:`, `..` varsa reddet — aksi halde JSON girdisi `..\\..\\Windows\\System32` ile çıkış yapabilir.
- [ ] **`launch_portable` PowerShell escaping** (installer.rs): `app_name`, `launch_file`, `found_exe` apostrof escaping'siz tek-tırnaklı PS string'lere enterpolasyon ediliyor. `path.replace('\\'', "''")` ile escape et veya `-ArgumentList` ile geçir.
- [ ] **`uninstall_software` PS escaping** (installer.rs): Yükseltilmiş PowerShell'e `path` enterpolasyonu — `batch_get_versions`'taki escaping pattern'ini kullan.
- [ ] **Junction/symlink guard** (installer.rs `remove_dir_all` öncesi): Windows'ta directory junction'lar takip edilir; silmeden önce `symlink_metadata` ile kontrol et ve `is_symlink()` ise reddet.
- [ ] **TOCTOU `.ps1` temp dosyası** ([src-tauri/src/scripts.rs:48-57](src-tauri/src/scripts.rs)): Tahmin edilebilir `unix_ms` isimlendirme + admin elevation. UUID/random suffix kullan ve dosyayı yazıp izin verdikten sonra elevate et (yarış penceresini kapat).

### v0.7.0 için Aday Fikirler
- **Cloud Sync (opsiyonel):** Tema, font, favoriler ve seçili paketleri (JSON) GitHub Gist veya kullanıcı tarafından sağlanan WebDAV uç noktası üzerinden eşitleme. Tek cihaz → çoklu cihaz aynı kurulum profili.
- **Tek tıkla profilden kurulum:** "Geliştirici", "Oyuncu", "Yeni format" gibi hazır şablonlar ile preset paket setleri.
- **Stringly-typed dispatcher refaktörü:** `App.handleMenuAction("show-settings")` gibi raw string switch kullanımı yerine alt bileşenlere doğrudan `onShowSettings`, `onChangeTheme(id)` callback prop'ları geçmek (Sidebar/SettingsModal arayüzünü sıkılaştırır).
- **Sidebar footer bileşen ayrıştırması:** 4 adet kopya-yapıştır `<div className="sidebar-item">` bloğu için tek `<SidebarFooterItem>` bileşeni + dizi tabanlı render.
- **Telemetri kapısı (visibility-aware):** Pencere arkaplandayken Rust `fast-telemetry` emitter'ı tamamen sustur (şu an front'ta filtreleniyor ama IPC + serileştirme yine çalışıyor).
- **Defender / sistem komutu önbelleği:** `get_dynamic_defender_status` içindeki PowerShell fallback'ı 60 saniyelik TTL ile önbelleğe al; cold start'taki ~1-3s'lik takılmayı önler.
- **Kurulum geçmişi & geri al:** Her başarılı kurulumun timestamp + uninstall path'i ile loglanması, "son 24 saatteki kurulumları geri al" işlemine zemin hazırlar.
- **Sürükle-bırak özel paket içe aktarma:** Kullanıcının kendi `.json` paket tanımını (komut + indirme linki + sessiz argümanlar) sürükle-bırak ile geçici olarak ekleyebilmesi.
- **Klavye-only navigasyon iyileştirmesi:** Tab/arrow ile kart seçimi, `Enter` ile kurulum kuyruğuna alma — tamamen mouse-free akış.
- **Dahili çıktı diff'i:** Bir uygulamanın güncellemeden önce/sonra release notes farkını yan panelde gösterme (GitHub Releases body parse).
