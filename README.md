# e-Sistem LPM MAKHIBRA

Aplikasi Manajemen Terpadu untuk Lembaga Pers Mahasiswa MAKHIBRA

## ðŸš€ Fitur Utama

- **Manajemen Anggota**: Database lengkap anggota dengan foto dan biodata
- **Keuangan Kas**: Pencatatan pemasukan dan pengeluaran real-time
- **LPJ Generator**: Generate Laporan Pertanggungjawaban Dana Kampus otomatis
- **Arsip Surat**: Sistem pengarsipan surat menyurat digital
- **Dashboard Analytics**: Grafik dan statistik real-time
- **PWA Support**: Bisa diinstall sebagai aplikasi mobile

## ðŸ› ï¸ Teknologi

- **Frontend**: HTML5, Tailwind CSS, JavaScript (ES6+)
- **Backend**: Firebase (Firestore, Authentication)
- **Libraries**:
  - Chart.js untuk grafik
  - jsPDF untuk generate PDF
  - html2canvas untuk capture screenshot
  - JsBarcode untuk generate barcode

## ðŸ“¦ Instalasi

1. Clone repository ini
2. Upload semua file ke hosting/server
3. Konfigurasi Firebase di file `index.html`
4. Akses via browser

## ðŸ”§ Konfigurasi

### Firebase Setup
Edit bagian konfigurasi Firebase di `index.html`:

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

## ðŸ“± Progressive Web App (PWA)

Aplikasi ini mendukung PWA dengan fitur:
- Install sebagai aplikasi native
- Offline capability
- Push notifications (opsional)

## ðŸ”’ Keamanan

- Firebase Authentication untuk login
- HTTPS wajib
- Meta robots noindex untuk halaman internal
- Security headers di .htaccess

## ðŸ“Š Dashboard Features

- **Kartu Info**: Saldo kas, total anggota, dana kampus, dll
- **Grafik Arus Kas**: Chart bar pemasukan vs pengeluaran
- **Grafik Demografi**: Pie chart persentase gender anggota
- **Menu Navigasi**: Sidebar responsive dengan sub-menu

## ðŸ“„ Lisensi

Copyright Â© 2026 - Tim Developer LPM MAKHIBRA

## ðŸ“ž Kontak

Untuk pertanyaan atau dukungan, hubungi tim developer LPM MAKHIBRA.
