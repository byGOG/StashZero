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
- [x] **Çoklu Dil Desteği (i18n):** Türkçe ve İngilizce dil seçenekleri entegre edildi.
- [x] **Dinamik Uygulama Veritabanı:** Kütüphane verilerinin GitHub üzerinden anlık güncellenmesi sağlandı.
- [x] **Güncelleme Kontrolü (Update Support):** Kurulu uygulamaların yeni sürümlerini algılama ve görsel uyarı sistemi eklendi.
- [x] **Kategori Yönetimi (Favoriler):** Uygulamaları favorilere ekleme ve özel favoriler kategorisi desteği.
- [x] **Gelişmiş Filtreleme:** Boyut, sürüm ve kategoriye göre gelişmiş arama ve sıralama seçenekleri. (Gelişmiş sıralama eklendi)
- [x] **Kullanıcı Profilleri:** Farklı kurulum paketlerini farklı profil isimleri altında saklama. (Profil Modal'ı eklendi)
- [x] **Topluluk Paylaşımı (Community Sync):** Profil paketlerini URL üzerinden (Gist, GitHub vb.) içe aktarma ve panoya kopyalama desteği.
- [x] **Gelişmiş Paket Editörü:** Mevcut profilleri düzenleme, isim değiştirme ve içerik güncelleme seçenekleri.
- [x] **Gelişmiş Log Analizi:** Logları türüne göre (Hata, Başarı, Süreç) filtreleme, arama ve dosyaya (.log) kaydetme desteği.
- [x] **Premium UI/UX Cilalama:** Glassmorphism efektleri, rim lighting, mikro-animasyonlar ve dinamik mesh gradient geçişleri ile görsel kalite artırıldı.

## Roadmap & Gelecek Planları 🚀
- **v0.4.0 (Tamamlandı):** Güncelleme Desteği, Favori Sistemi ve Performans Optimizasyonu.
- **v0.5.0 (Tamamlandı):** Topluluk Odaklı Paylaşım ve Gelişmiş Paket Yönetimi.
- **v0.6.0 (Geliştiriliyor):** Gelişmiş Log Analizi ve Cloud Sync (Opsiyonel).

## 🐛 Bilinen Hatalar (Bugs)
- [ ] *Henüz bilinen bir hata raporlanmadı. Test aşamasında tespit edildikçe buraya eklenecek.*

## 💡 Notlar ve Fikirler
- **Dinamik Uygulama Veritabanı:** Uygulama indirme linklerini uygulama içerisine gömmek yerine, GitHub üzerinden çekilen dinamik bir JSON dosyasıyla beslemek linkler güncellendiğinde uygulamanın tekrar derlenmesini önleyecektir.
- **Optimizasyon:** [x] Performans modu devreye girdiğinde Framer Motion animasyonlarını tamamen kapatarak düşük donanımlı sistemlerde CPU yükünü azaltmak sağlandı (MotionConfig & Global CSS override).
