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
- Meta robots: `noindex, nofollow` (karena aplikasi login)
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
- Meta robots noindex untuk halaman internal.
- Security headers di `.htaccess`.
- **Catatan hardening CSP**: saat siap, migrasikan inline script/style ke nonce/hash agar `Content-Security-Policy` tidak perlu `unsafe-inline`.

## Dashboard Features

- **Kartu Info**: Saldo kas, total anggota, dana kampus, dll.
- **Grafik Arus Kas**: Chart bar pemasukan vs pengeluaran.
- **Grafik Demografi**: Pie chart persentase gender anggota.
- **Menu Navigasi**: Sidebar responsive dengan sub-menu.

## Lisensi

Copyright © 2026 - Tim Developer LPM MAKHIBRA.

## Kontak

Untuk pertanyaan atau dukungan, hubungi tim developer LPM MAKHIBRA.
