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

## 🧪 v0.6.0 Live Test Matrisi (2026-05-04)
*Refactor sonrası 27 işlem, 0 regresyon:*

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

## 📚 v0.6.0 Library Veri Düzeltmeleri
- [x] **Tor Browser**: `version` 15.0.10 → 15.0.11; `download_url` benzer şekilde (eski URL torproject.org'da 404).
- [x] **AIMP**: hardcoded `version: "5.40.2716"` → `"Son Sürüm"` sentinel; `download_url` zaten "latest stable" redirect'i.
- [x] **foobar2000**: `post_install_cmd` `Write-Host` ile Türkçe ilerleme satırları + Encoder Pack URL'i log'a düşürülüyor (kullanıcı görünürlüğü).
- [x] **ImageGlass Portable**: `imageglass-portable` entry'si kataloğdan çıkarıldı (kullanıcı talebi).

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
