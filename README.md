# e-Sistem LPM MAKHIBRA

Aplikasi Manajemen Terpadu untuk Lembaga Pers Mahasiswa MAKHIBRA.

## Fitur Utama

- **Manajemen Anggota**: Database lengkap anggota dengan foto dan biodata.
- **Keuangan Kas**: Pencatatan pemasukan dan pengeluaran real-time.
- **LPJ Generator**: Generate Laporan Pertanggungjawaban Dana Kampus otomatis.
- **Arsip Surat**: Sistem pengarsipan surat menyurat digital.
- **Dashboard Analytics**: Grafik dan statistik real-time.
- **PWA Support**: Bisa di-install sebagai aplikasi mobile.

## Teknologi

- **Frontend**: HTML5, Tailwind CSS, JavaScript (ES6+).
- **Backend**: Firebase (Firestore, Authentication).
- **Libraries**:
  - Chart.js untuk grafik.
  - jsPDF untuk generate PDF.
  - html2canvas untuk capture screenshot.
  - JsBarcode untuk generate barcode.

## Instalasi

1. Clone repository ini.
2. Upload semua file ke hosting/server.
3. Konfigurasi Firebase di file `app.js`.
4. Akses via browser.

## Konfigurasi

### Firebase Setup

Edit bagian konfigurasi Firebase di `app.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ... konfigurasi lainnya
};
```

### SEO & Search Console

- Canonical URL: `https://esistemlpmmakhibra.com/`
- Meta robots: `index, follow`
- Sitemap: `sitemap.xml`
- Robots.txt: `robots.txt`

## Progressive Web App (PWA)

Aplikasi ini mendukung metadata PWA melalui `manifest.json` dengan fitur:

- Install sebagai aplikasi native.
- Ikon aplikasi dan identitas aplikasi.
- Offline capability dan push notifications bisa ditambahkan kemudian melalui service worker.

## Keamanan

- Firebase Authentication untuk login.
- HTTPS wajib.
- Halaman utama mengizinkan index Google; data internal tetap dilindungi oleh login Firebase dan Firestore Rules.
- Security headers di `.htaccess`.
- Firestore rules tersedia di `firestore.rules`.
- **Hardening CSP**: inline event/script/style runtime sudah dipindahkan ke handler dan CSS lokal; Tailwind dibuild lokal melalui `npm run build:css`.

### Deploy Firestore Rules

Via Firebase Console:

1. Buka Firebase Console.
2. Pilih project `kasku-85860`.
3. Masuk ke Firestore Database > Rules.
4. Salin isi `firestore.rules`.
5. Klik Publish.

Via Firebase CLI:

```powershell
firebase login
firebase use kasku-85860
firebase deploy --only firestore:rules
```

## Dashboard Features

- **Kartu Info**: Saldo kas, total anggota, dana kampus, dll.
- **Grafik Arus Kas**: Chart bar pemasukan vs pengeluaran.
- **Grafik Demografi**: Pie chart persentase gender anggota.
- **Menu Navigasi**: Sidebar responsive dengan sub-menu.

## Lisensi

Copyright © 2026 - Tim Developer LPM MAKHIBRA.

## Kontak

Untuk pertanyaan atau dukungan, hubungi tim developer LPM MAKHIBRA.
