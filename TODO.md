# TODO - UX Scroll & Pull-to-Refresh

- [x] Kembalikan scroll vertikal halaman utama (hapus `overflow: hidden` di `html, body`) agar fitur pull-to-refresh dan gesture back browser kembali normal.
- [x] Pertahankan layout tetap rapi dengan `overflow-x: hidden` pada `body` dan tinggi minimum viewport (`100dvh`) pada shell aplikasi.
- [x] Pindahkan scroll utama ke dokumen/root supaya pull-to-refresh Chrome tidak tertahan oleh scroller internal `<main>`.
- [x] Jaga nuansa app native dengan sidebar desktop sticky, header sticky, safe-area padding, dan momentum scroll untuk area yang memang overflow.
- [ ] Uji di Chrome Android: tarik dari atas untuk memastikan pull-to-refresh tetap aktif, lalu uji gesture back/forward browser.
- [ ] Uji desktop: pastikan tidak ada horizontal scroll liar saat resize viewport.

## Keamanan (opsional hardening)

- [ ] Rencanakan migrasi CSP dari `unsafe-inline` ke nonce/hash untuk script/style setelah struktur inline script siap dipisah.
