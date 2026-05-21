// ==========================================
// 1. INISIALISASI FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAuFYA8H2dU8j9tgfnvx4ZhO1eX0v1mfzg",
    authDomain: "kasku-85860.firebaseapp.com",
    projectId: "kasku-85860",
    storageBucket: "kasku-85860.firebasestorage.app",
    messagingSenderId: "1008219405611",
    appId: "1:1008219405611:web:13571ca9d66a2a6799d96e"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ==========================================
// 2. VARIABEL GLOBAL & STATE
// ==========================================
let unsubscribeKas = null;
let unsubscribeAnggota = null;
let unsubscribeWebmaster = null;
let unsubscribeArsip = null;
let chartInstance = null;
let pieChartInstance = null;
let currentEditAnggotaId = null;
let clockTimer = null;

const APP_TIME_ZONE = 'Asia/Jakarta';
const appDateFormatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: APP_TIME_ZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
});
const appTimeFormatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
});
const appInputDateFormatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

window.cachedArsipData = {};
window.cachedKasData = [];
window.cachedAnggotaData = {};
window.appConfig = { kopImg: "", footerImg: "", footerCetak: "", pimpinanNama: "", ttdImg: "", nomorSurat: "" };

// ==========================================
// 3. FUNGSI UTILITIES (ALAT BANTU)
// ==========================================
const compressImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const targetRatio = 3 / 4;
                let sourceWidth = img.width;
                let sourceHeight = img.height;
                let sourceRatio = sourceWidth / sourceHeight;
                
                let cropWidth, cropHeight, offsetX, offsetY;

                if (sourceRatio > targetRatio) {
                    cropHeight = sourceHeight;
                    cropWidth = sourceHeight * targetRatio;
                    offsetX = (sourceWidth - cropWidth) / 2;
                    offsetY = 0;
                } else {
                    cropWidth = sourceWidth;
                    cropHeight = sourceWidth / targetRatio;
                    offsetX = 0;
                    offsetY = (sourceHeight - cropHeight) / 2;
                }

                const finalWidth = 300;
                const finalHeight = 400;
                
                canvas.width = finalWidth;
                canvas.height = finalHeight;
                const ctx = canvas.getContext('2d');
                
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, finalWidth, finalHeight);
                ctx.drawImage(img, offsetX, offsetY, cropWidth, cropHeight, 0, 0, finalWidth, finalHeight);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

const compressWideImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1500;
                let width = img.width; let height = img.height;

                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

const formatRp = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

const escapeHtml = (value) => {
    if (value === undefined || value === null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const safeUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.startsWith('data:') || raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return '';
};

const getInputValue = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : '';
};

const setInputValue = (id, value) => {
    const el = document.getElementById(id);
    if(el) el.value = value ?? '';
};

const setText = (id, value) => {
    const el = document.getElementById(id);
    if(el) el.innerText = value;
};

const appViews = [
    'view-dashboard',
    'view-kelola-anggota',
    'view-tambah-anggota',
    'view-detail-anggota',
    'view-catat-transaksi',
    'view-catat-pengeluaran',
    'view-riwayat-transaksi',
    'view-lpj-kampus',
    'view-arsip-surat',
    'view-tambah-arsip',
    'view-buat-surat',
    'view-setting',
    'view-webmaster'
];

const getRouteView = () => {
    const hashView = window.location.hash ? window.location.hash.substring(1) : '';
    if(hashView && appViews.includes(hashView) && document.getElementById(hashView)) return hashView;

    const storedView = localStorage.getItem('eSistem:lastView');
    if(storedView && appViews.includes(storedView) && document.getElementById(storedView)) return storedView;

    return 'view-dashboard';
};

const rememberRouteView = (viewId) => {
    if(appViews.includes(viewId)) localStorage.setItem('eSistem:lastView', viewId);
};

const clearEarlyRouteStyle = () => {
    const earlyRouteStyle = document.getElementById('early-route-style');
    if(earlyRouteStyle) earlyRouteStyle.remove();
};

function getFormattedJakartaTime(now) {
    const parts = appTimeFormatter.formatToParts(now).reduce((result, part) => {
        result[part.type] = part.value;
        return result;
    }, {});
    return `${parts.hour}:${parts.minute}:${parts.second}`;
}

function getFormattedJakartaYear(now) {
    const yearPart = appDateFormatter.formatToParts(now).find((part) => part.type === 'year');
    return yearPart ? yearPart.value : now.getFullYear();
}

function getJakartaDateInputValue(now = new Date()) {
    const parts = appInputDateFormatter.formatToParts(now).reduce((result, part) => {
        result[part.type] = part.value;
        return result;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day}`;
}

function setInputToJakartaToday(id) {
    const input = document.getElementById(id);
    if(input) input.value = getJakartaDateInputValue();
}

function updateClock() {
    if(window.paintJakartaClock) {
        window.paintJakartaClock();
        return;
    }

    const now = new Date();
    const dateEl = document.getElementById('currentDate');
    const timeEl = document.getElementById('currentTime');
    const yearEl = document.getElementById('footer-year');

    if(dateEl) dateEl.innerText = appDateFormatter.format(now);
    if(timeEl) timeEl.innerText = `${getFormattedJakartaTime(now)} WIB`;
    if(yearEl) yearEl.innerText = getFormattedJakartaYear(now);
}

function startClock() {
    if(window.startJakartaClock) {
        window.startJakartaClock();
        return;
    }

    if(clockTimer) clearTimeout(clockTimer);

    const tick = () => {
        updateClock();
        clockTimer = setTimeout(tick, 1000 - new Date().getMilliseconds());
    };

    tick();
}

function onReady(callback) {
    if(document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
        callback();
    }
}

// ==========================================
// 4. SISTEM UI & NOTIFIKASI
// ==========================================
window.showToast = (title, message, type='success') => {
    const t = document.getElementById('toast');
    const icon = document.getElementById('toast-icon');
    document.getElementById('toast-title').innerText = title;
    document.getElementById('toast-message').innerText = message;
    if(type === 'error') {
        t.style.borderLeftColor = '#e11d48';
        icon.innerHTML = '<div class="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600"><i class="ph-fill ph-warning-circle text-2xl"></i></div>';
    } else {
        t.style.borderLeftColor = '#10b981';
        icon.innerHTML = '<div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><i class="ph-fill ph-check-circle text-2xl"></i></div>';
    }
    t.classList.replace('translate-x-full', 'translate-x-0'); t.classList.replace('opacity-0', 'opacity-100');
    setTimeout(() => { t.classList.replace('translate-x-0', 'translate-x-full'); t.classList.replace('opacity-100', 'opacity-0'); }, 3500);
};

window.customConfirm = (msg, callback) => {
    const modal = document.getElementById('confirm-modal');
    if(!modal) return;
    document.getElementById('confirm-message').innerText = msg;
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); modal.children[0].classList.remove('scale-95'); }, 10);

    const btnYes = document.getElementById('confirm-btn-yes');
    const newBtnYes = btnYes.cloneNode(true);
    btnYes.parentNode.replaceChild(newBtnYes, btnYes);
    
    newBtnYes.onclick = () => {
        window.closeConfirmModal();
        callback();
    };
};

window.closeConfirmModal = () => {
    const modal = document.getElementById('confirm-modal');
    if(!modal) return;
    modal.classList.add('opacity-0'); modal.children[0].classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
};

// ==========================================
// 5. NAVIGASI (SIDEBAR & MENU)
// ==========================================
window.toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (!sidebar) return;

    // MOBILE
    if (window.innerWidth < 768) {
        sidebar.classList.toggle('-translate-x-full');

        if (overlay) {
            overlay.classList.toggle('hidden');
        }
    }

    // DESKTOP
    else {
        sidebar.classList.toggle('sidebar-close');
    }
};

window.toggleSubmenu = (id, iconId) => {
    const sub = document.getElementById(id);
    const icon = document.getElementById(iconId);
    if(sub && icon) {
        sub.classList.toggle('hidden');
        sub.classList.toggle('flex');
        icon.classList.toggle('-rotate-90');
    }
};

window.updateTabTitle = (viewId) => {
    const appName = document.getElementById('ui-navbar-title') ? document.getElementById('ui-navbar-title').innerText : "LPM MAKHIBRA";
    let pageName = "Beranda";
    
    const pageMap = {
        'view-kelola-anggota': "Data Anggota",
        'view-tambah-anggota': "Form Anggota",
        'view-detail-anggota': "E-Profil Anggota",
        'view-catat-transaksi': "Kas Masuk",
        'view-catat-pengeluaran': "Kas Keluar",
        'view-riwayat-transaksi': "Laporan Keuangan",
        'view-lpj-kampus': "LPJ Dana Kampus & Campuran",
        'view-arsip-surat': "Arsip Surat Menyurat",
        'view-tambah-arsip': "Upload E-Arsip",
        'view-buat-surat': "Buat Surat Otomatis",
        'view-setting': "Unduh Laporan",
        'view-webmaster': "Pengaturan Webmaster",
        'view-login': "Login Sistem"
    };

    if (pageMap[viewId]) pageName = pageMap[viewId];
    
    document.title = `${pageName} · ${appName}`;
    const uiDocTitle = document.getElementById('ui-doc-title');
    if(uiDocTitle) uiDocTitle.innerText = `${pageName} · ${appName}`;
};

window.switchMenu = (element, viewId, isSubmenu = false, pushState = true) => {
    // Sembunyikan semua section
    document.querySelectorAll('.view-section').forEach(el => {
        if(el.id !== 'view-login' && el.id !== 'view-public-verify') {
            el.classList.remove('block');
            el.classList.add('hidden');
        }
    });
    
    // Tampilkan target section
    const target = document.getElementById(viewId);
    if(target) {
        target.classList.remove('hidden');
        target.classList.add('block');
    }
    
    // Atur status aktif pada menu sidebar
    if(element) {
        document.querySelectorAll('.sidebar-menu').forEach(el => el.classList.remove('menu-active'));
        element.classList.add('menu-active');
        if(isSubmenu && element.parentElement && element.parentElement.previousElementSibling) {
            element.parentElement.previousElementSibling.classList.add('menu-active');
        }
    }
    
    // Tutup sidebar di versi mobile setelah klik
    if(window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        if(sidebar && !sidebar.classList.contains('-translate-x-full')) {
            window.toggleSidebar();
        }
    }
    
    if(viewId === 'view-dashboard') {
        if(chartInstance) chartInstance.update();
        if(pieChartInstance) pieChartInstance.update();
    }

    window.updateTabTitle(viewId);
    rememberRouteView(viewId);

    // Update URL Hash agar sistem "Back" browser berfungsi
    if (pushState && viewId !== 'view-login' && viewId !== 'view-public-verify') {
        try { history.pushState({ view: viewId }, "", "#" + viewId); } catch(e) {}
    }
};

window.switchView = (viewId, pushState = true) => {
    window.switchMenu(null, viewId, false, pushState);
};

// ==========================================
// 6. SISTEM OTENTIKASI & LOGIN FIREBASE
// ==========================================
window.handleLoginSubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;

    btn.disabled = true;
    btn.innerHTML = `<div class="loader w-5 h-5 border-2 border-white rounded-full mx-auto"></div>`;
    
    try {
        await auth.signInWithEmailAndPassword(email, pass);
        // Login berhasil, perubahan halaman akan ditangani oleh auth.onAuthStateChanged
    } catch (err) {
        window.showToast("LOGIN GAGAL", "Email atau Password yang dimasukkan salah!", "error");
        btn.disabled = false;
        btn.innerHTML = `<i class="ph-bold ph-key text-base"></i><span>Masuk</span>`;
        const form = document.getElementById('login-form');
        if(form) {
            form.classList.add('animate-shake'); // Butuh CSS keyframe 'shake' jika mau efek getar
            setTimeout(() => form.classList.remove('animate-shake'), 500);
        }
    }
};

window.handleLogout = async () => {
    try {
        await auth.signOut();
        window.showToast("LOGOUT", "Berhasil keluar dari sistem.", "success");
    } catch (err) {
        window.showToast("GAGAL", "Terjadi kesalahan saat logout.", "error");
    }
};

auth.onAuthStateChanged((user) => {
    const loginView = document.getElementById('view-login');
    const btnLogin = document.getElementById('btn-login');
    const loadingOverlay = document.getElementById('loading-overlay');
    const urlParams = new URLSearchParams(window.location.search);
    
    if(loadingOverlay) { loadingOverlay.classList.add('hidden'); loadingOverlay.classList.remove('flex'); }

    // Jika mode publik (Scan QR atau Print)
    if (urlParams.get('verify') || urlParams.get('print')) {
        if(!user) {
            auth.signInAnonymously().catch(err => {
                if(urlParams.get('verify')) window.renderPublicVerification(urlParams.get('verify'));
                if(urlParams.get('print')) window.renderPrintView(urlParams.get('print'), urlParams.get('id'));
            });
            return;
        }
        if(urlParams.get('verify')) window.renderPublicVerification(urlParams.get('verify'));
        if(urlParams.get('print')) window.renderPrintView(urlParams.get('print'), urlParams.get('id'));
        return;
    }

    const isEditMode = urlParams.get('edit') !== null;

    if (user) {
        // === USER SUDAH LOGIN ===
        if(!isEditMode && !user.isAnonymous) {
            window.showToast("KONEKSI BERHASIL", `Menyinkronkan data dengan Cloud...`, "success");
        }
        
        // Sembunyikan halaman login dengan mulus
        if(loginView) { 
            if(document.getElementById('early-route-style')) {
                loginView.classList.add('hidden'); 
                loginView.style.display = 'none'; 
            } else {
                loginView.classList.replace('opacity-100', 'opacity-0');
                setTimeout(() => {
                    loginView.classList.add('hidden');
                    loginView.style.display = 'none';
                }, 500);
            }
        }
        
        // Mulai Tarik Data dari Firebase
        syncUIWithDB(); 
        sinkronKasRealtime(); 
        sinkronAnggotaRealtime(); 
        sinkronArsipRealtime();
        
        const editId = urlParams.get('edit');

        if (editId) {
            window.editAnggota(editId);
            try { history.replaceState({ view: 'view-tambah-anggota' }, "", window.location.pathname + "#view-tambah-anggota"); } catch(e) {}
        } else if(!user.isAnonymous) {
            // Tentukan tampilan awal (Dashboard)
            let initialView = getRouteView();

            let menuEl = null; let isSub = false;
            document.querySelectorAll('.sidebar-menu').forEach(el => {
                if(el.getAttribute('onclick') && el.getAttribute('onclick').includes(initialView)) {
                    menuEl = el; 
                    if(el.parentElement && el.parentElement.id.includes('submenu-')) isSub = true;
                }
            });

            window.switchMenu(menuEl, initialView, isSub, false);
            try {
                if (window.location.hash.substring(1) !== initialView) {
                    history.replaceState({ view: initialView }, "", "#" + initialView);
                } else if (!history.state) {
                    history.replaceState({ view: initialView }, "", "#" + initialView);
                }
            } catch(e) {}
        }

        clearEarlyRouteStyle();

    } else {
        // === USER BELUM LOGIN ATAU LOGOUT ===
        if(isEditMode) {
            if(loadingOverlay) { loadingOverlay.classList.add('hidden'); loadingOverlay.classList.remove('flex'); }
        } else {
            clearEarlyRouteStyle();

            // Tampilkan halaman login kembali
            if(loginView) {
                loginView.style.display = 'flex';
                loginView.classList.remove('hidden');
                setTimeout(() => { loginView.classList.replace('opacity-0', 'opacity-100'); }, 50);
            }
            if(btnLogin) { btnLogin.disabled = false; btnLogin.innerHTML = `<i class="ph-bold ph-key text-base"></i><span>Masuk</span>`; }
            if(document.getElementById('login-pass')) document.getElementById('login-pass').value = '';
            
            // Hentikan Realtime Listener untuk menghemat kuota Firebase
            if(unsubscribeKas) unsubscribeKas();
            if(unsubscribeAnggota) unsubscribeAnggota();
            if(unsubscribeWebmaster) unsubscribeWebmaster();
            if(unsubscribeArsip) unsubscribeArsip();
            localStorage.removeItem('eSistem:lastView');
            
            // Sembunyikan konten lain
            document.querySelectorAll('.view-section').forEach(el => {
                if(el.id !== 'view-login') { el.classList.remove('block'); el.classList.add('hidden'); }
            });

            if (window.updateTabTitle) window.updateTabTitle('view-login');
            try { history.replaceState(null, "", window.location.pathname); } catch(e) {}
        }
    }
});

// ==========================================
// 7. FUNGSI APLIKASI (WEBMASTER, ANGGOTA, KAS, ARSIP)
// ==========================================
function syncUIWithDB() {
    if(unsubscribeWebmaster) unsubscribeWebmaster();
    unsubscribeWebmaster = db.collection("settings").doc("webmaster").onSnapshot((docSnap) => {
        if (docSnap.exists) {
            const data = docSnap.data();
            const nInstansi = data.namaInstansi || "LPM MAKHIBRA";
            const nJudul = data.judulWebsite || "Aplikasi Manajemen Terpadu";
            const nAdmin = data.namaAdmin || "Administrator";
            const nWallpaper = data.wallpaperLogin || "";
            
            window.appConfig.kopImg = data.kopImg || "";
            window.appConfig.footerImg = data.footerImg || "";
            window.appConfig.footerCetak = data.footerCetak || "";
            window.appConfig.pimpinanNama = data.pimpinanNama || "";
            window.appConfig.ttdImg = data.ttdImg || "";
            window.appConfig.nomorSurat = data.nomorSurat || "";

            const elSidebarTitle = document.getElementById('ui-sidebar-app-title'); if(elSidebarTitle) elSidebarTitle.innerText = nJudul;
            const elNavTitle = document.getElementById('ui-navbar-title'); if(elNavTitle) elNavTitle.innerText = nInstansi;
            
            const elLogInstansi = document.getElementById('login-instansi-name'); if(elLogInstansi) elLogInstansi.innerText = nInstansi;
            const elLogApp = document.getElementById('login-app-title'); if(elLogApp) elLogApp.innerText = nJudul;
            const elLogFoot = document.getElementById('login-footer-instansi'); if(elLogFoot) elLogFoot.innerText = nInstansi;
            
            const viewLogin = document.getElementById('view-login');
            if(viewLogin) {
                if(nWallpaper) {
                    viewLogin.style.backgroundImage = `url('${nWallpaper}')`;
                } else {
                    viewLogin.style.backgroundImage = `url('https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&q=80&w=2000')`;
                }
            }
            
            const dashInstansi = document.getElementById('dash-instansi-name'); if(dashInstansi) dashInstansi.innerText = nInstansi;
            const footerInstansi = document.getElementById('footer-instansi'); if(footerInstansi) footerInstansi.innerText = nInstansi;
            
            const wmInst = document.getElementById('wm-instansi'); if(wmInst) wmInst.value = nInstansi;
            const wmJudul = document.getElementById('wm-judul'); if(wmJudul) wmJudul.value = nJudul;
            const wmAdmin = document.getElementById('wm-admin'); if(wmAdmin) wmAdmin.value = nAdmin;
            const wmWall = document.getElementById('wm-wallpaper'); if(wmWall) wmWall.value = nWallpaper;
            
            const wmFootCetak = document.getElementById('wm-footer-cetak'); if(wmFootCetak) wmFootCetak.value = window.appConfig.footerCetak;
            const wmPim = document.getElementById('wm-pimpinan-nama'); if(wmPim) wmPim.value = window.appConfig.pimpinanNama;
            const wmNom = document.getElementById('wm-nomor-surat'); if(wmNom) wmNom.value = window.appConfig.nomorSurat;

            const hintKop = document.getElementById('hint-kop');
            if(hintKop) {
                if(window.appConfig.kopImg) hintKop.classList.remove('hidden');
                else hintKop.classList.add('hidden');
            }

            const hintFooterContainer = document.getElementById('hint-footer-container');
            if (hintFooterContainer) {
                if(window.appConfig.footerImg) {
                    hintFooterContainer.classList.remove('hidden');
                    hintFooterContainer.classList.add('flex');
                } else {
                    hintFooterContainer.classList.add('hidden');
                    hintFooterContainer.classList.remove('flex');
                }
            }

            const hintTtd = document.getElementById('hint-ttd');
            if(hintTtd) {
                if(window.appConfig.ttdImg) hintTtd.classList.remove('hidden');
                else hintTtd.classList.add('hidden');
            }
        }
    }, (err) => { console.error("Gagal sinkron webmaster:", err); });
}

window.saveWebmasterConfig = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-wm'); const original = btn.innerHTML; btn.disabled = true; btn.innerHTML = "Menyimpan...";
    try {
        let payload = {
            namaInstansi: document.getElementById('wm-instansi').value,
            judulWebsite: document.getElementById('wm-judul').value,
            namaAdmin: document.getElementById('wm-admin').value,
            wallpaperLogin: document.getElementById('wm-wallpaper').value,
            terakhirDiupdate: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection("settings").doc("webmaster").set(payload, { merge: true });
        window.showToast("SUKSES", "Konfigurasi sistem utama disimpan.", "success");
        syncUIWithDB();
    }
    catch (err) { window.showToast("GAGAL", err.message || "Gagal menyimpan konfigurasi.", "error"); }
    finally { btn.disabled = false; btn.innerHTML = original; }
};

window.hapusFooter = () => {
    window.appConfig.footerImg = "";
    const fileInput = document.getElementById('wm-footer-img');
    if (fileInput) fileInput.value = '';
    
    const hintFooterContainer = document.getElementById('hint-footer-container');
    if (hintFooterContainer) {
        hintFooterContainer.classList.add('hidden');
        hintFooterContainer.classList.remove('flex');
    }
    window.showToast("Dihapus", "Footer dihapus dari antrean. Silakan klik SIMPAN untuk mematenkan.", "success");
};

window.saveCetakConfig = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-cetak'); const original = btn.innerHTML; btn.disabled = true; btn.innerHTML = "Menyimpan...";
    try {
        let payload = {
            footerCetak: document.getElementById('wm-footer-cetak').value,
            pimpinanNama: document.getElementById('wm-pimpinan-nama').value,
            nomorSurat: document.getElementById('wm-nomor-surat').value,
            terakhirDiupdate: firebase.firestore.FieldValue.serverTimestamp()
        };

        const fileKop = document.getElementById('wm-kop-img').files[0];
        if(fileKop) {
            payload.kopImg = await compressWideImage(fileKop);
        } else if (window.appConfig.kopImg) {
            payload.kopImg = window.appConfig.kopImg;
        } else {
            payload.kopImg = "";
        }

        const fileFooter = document.getElementById('wm-footer-img').files[0];
        if(fileFooter) {
            payload.footerImg = await compressWideImage(fileFooter);
        } else if (window.appConfig.footerImg) {
            payload.footerImg = window.appConfig.footerImg;
        } else {
            payload.footerImg = "";
        }

        const fileTtd = document.getElementById('wm-ttd-img').files[0];
        if(fileTtd) {
            payload.ttdImg = await compressImageToBase64(fileTtd);
        } else if (window.appConfig.ttdImg) {
            payload.ttdImg = window.appConfig.ttdImg;
        } else {
            payload.ttdImg = "";
        }

        await db.collection("settings").doc("webmaster").set(payload, { merge: true });
        window.showToast("SUKSES", "Pengaturan Cetak Dokumen disimpan.", "success");
        
        document.getElementById('wm-kop-img').value = '';
        document.getElementById('wm-footer-img').value = '';
        document.getElementById('wm-ttd-img').value = '';
        syncUIWithDB();
    }
    catch (err) { window.showToast("GAGAL", err.message || "Gagal menyimpan konfigurasi.", "error"); }
    finally { btn.disabled = false; btn.innerHTML = original; }
};

// ... (KODE MANAJEMEN ANGGOTA)
window.gantiTabAnggota = (tabNum) => {
    const btn1 = document.getElementById('btn-tab-1');
    const btn2 = document.getElementById('btn-tab-2');
    const cont1 = document.getElementById('content-tab-1');
    const cont2 = document.getElementById('content-tab-2');

    if(!btn1 || !btn2 || !cont1 || !cont2) return;

    if (tabNum === 2) {
        const requiredIdsTab1 = ['anggota-nim', 'anggota-jk', 'anggota-nama', 'anggota-tempat-lahir', 'anggota-tgl-lahir', 'anggota-alamat'];
        let isValid = true;
        for (let id of requiredIdsTab1) {
            const el = document.getElementById(id);
            if (el && !el.value) isValid = false;
        }
        if (!isValid) {
            window.showToast("Perhatian", "Harap isi semua kolom wajib (*) di Identitas Pribadi terlebih dahulu!", "error");
            return;
        }
    }

    if(tabNum === 1) {
        cont1.classList.remove('hidden'); cont1.classList.add('block');
        cont2.classList.remove('block'); cont2.classList.add('hidden');
        
        btn1.className = "px-6 py-3 bg-white border-t-[3px] border-t-[#3498db] border-r border-r-slate-200 border-l border-l-slate-200 text-[#3498db] font-bold -mb-px cursor-pointer transition-all";
        btn2.className = "px-6 py-3 text-slate-500 font-medium hover:bg-slate-100 cursor-pointer border-r border-slate-200 transition-all";
    } else {
        cont1.classList.remove('block'); cont1.classList.add('hidden');
        cont2.classList.remove('hidden'); cont2.classList.add('block');
        
        btn2.className = "px-6 py-3 bg-white border-t-[3px] border-t-[#3498db] border-r border-r-slate-200 border-l border-l-slate-200 text-[#3498db] font-bold -mb-px cursor-pointer transition-all";
        btn1.className = "px-6 py-3 text-slate-500 font-medium hover:bg-slate-100 cursor-pointer border-l border-slate-200 transition-all";
    }
};

window.bukaFormTambah = (element = null, isSubmenu = false) => {
    currentEditAnggotaId = null;
    const formTitle = document.getElementById('form-title-anggota'); if(formTitle) formTitle.innerText = "TAMBAH DATA ANGGOTA";
    const form = document.getElementById('formTambahAnggota'); if(form) form.reset();
    const hint = document.getElementById('foto-hint'); if(hint) hint.classList.add('hidden');
    window.gantiTabAnggota(1);
    
    if(element && element instanceof HTMLElement) {
        window.switchMenu(element, 'view-tambah-anggota', isSubmenu);
    } else {
        window.switchView('view-tambah-anggota');
    }
};

window.batalAnggota = () => {
    const form = document.getElementById('formTambahAnggota'); if(form) form.reset();
    const hint = document.getElementById('foto-hint'); if(hint) hint.classList.add('hidden');
    currentEditAnggotaId = null;
    window.switchView('view-kelola-anggota');
};

window.simpanAnggota = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.innerHTML = 'Menyimpan...';
    btn.disabled = true;
    try {
        let payload = {
            nim: document.getElementById('anggota-nim').value,
            nama: document.getElementById('anggota-nama').value,
            tempat_lahir: document.getElementById('anggota-tempat-lahir').value,
            tgl_lahir: document.getElementById('anggota-tgl-lahir').value,
            jk: document.getElementById('anggota-jk').value,
            alamat: document.getElementById('anggota-alamat').value,
            prodi: document.getElementById('anggota-prodi').value,
            email: document.getElementById('anggota-email').value,
            wa: document.getElementById('anggota-wa').value,
            divisi: document.getElementById('anggota-divisi').value,
            angkatan: document.getElementById('anggota-angkatan').value,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        const fileInput = document.getElementById('anggota-foto');
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            if(file.size > 2 * 1024 * 1024) {
                window.showToast("Gagal", "Ukuran foto terlalu besar (Maks 2MB)", "error");
                btn.innerHTML = original; btn.disabled = false;
                return;
            }
            try {
                payload.foto = await compressImageToBase64(file);
            } catch(err) {}
        } else if (currentEditAnggotaId && window.cachedAnggotaData[currentEditAnggotaId] && window.cachedAnggotaData[currentEditAnggotaId].foto) {
            payload.foto = window.cachedAnggotaData[currentEditAnggotaId].foto;
        }

        if (currentEditAnggotaId) {
            await db.collection("anggota_organisasi").doc(currentEditAnggotaId).update(payload);
            window.showToast('Biodata Diperbarui', 'Perubahan data anggota berhasil disimpan.', 'success');
        } else {
            await db.collection("anggota_organisasi").add(payload);
            window.showToast('Biodata Tersimpan', 'Data anggota baru berhasil direkam.', 'success');
        }

        document.getElementById('formTambahAnggota').reset();
        const hint = document.getElementById('foto-hint'); if(hint) hint.classList.add('hidden');
        currentEditAnggotaId = null;
        window.switchView('view-kelola-anggota');
    }
    catch (error) {
        window.showToast('Gagal', 'Terjadi kesalahan pada server database.', 'error');
    }
    finally {
        btn.innerHTML = original;
        btn.disabled = false;
    }
};

window.editAnggota = async (id) => {
    let data = window.cachedAnggotaData[id];
    
    if(!data) {
        try {
            const doc = await db.collection("anggota_organisasi").doc(id).get();
            if(doc.exists) data = doc.data();
        } catch(e) {}
    }

    if(!data) {
        window.showToast("Gagal", "Data anggota tidak ditemukan di server.", "error");
        return;
    }

    currentEditAnggotaId = id;
    const formTitle = document.getElementById('form-title-anggota'); if(formTitle) formTitle.innerText = "EDIT BIODATA ANGGOTA";
    
    const setVal = (eid, val) => { const el = document.getElementById(eid); if(el) el.value = val || ''; };
    setVal('anggota-nim', data.nim);
    setVal('anggota-nama', data.nama);
    setVal('anggota-tempat-lahir', data.tempat_lahir);
    setVal('anggota-tgl-lahir', data.tgl_lahir);
    setVal('anggota-jk', data.jk);
    setVal('anggota-alamat', data.alamat);
    setVal('anggota-prodi', data.prodi);
    setVal('anggota-email', data.email);
    setVal('anggota-wa', data.wa);
    setVal('anggota-divisi', data.divisi);
    setVal('anggota-angkatan', data.angkatan);
    
    const hint = document.getElementById('foto-hint');
    if(hint) {
        if(data.foto) hint.classList.remove('hidden');
        else hint.classList.add('hidden');
    }
    
    window.gantiTabAnggota(1);
    window.switchView('view-tambah-anggota');
};

window.hapusAnggota = (id) => {
    const data = window.cachedAnggotaData[id];
    const nama = data ? data.nama : "anggota ini";
    window.customConfirm(`TINDAKAN PERMANEN:\nYakin ingin menghapus seluruh biodata ${nama}?`, async () => {
        try {
            await db.collection("anggota_organisasi").doc(id).delete();
            window.showToast('Terhapus', 'Biodata berhasil dihapus dari sistem.', 'success');
        } catch(err) {
            window.showToast('Gagal', 'Terjadi kesalahan saat menghapus.', 'error');
        }
    });
};

window.lihatDetailAnggota = (id) => {
    const data = window.cachedAnggotaData[id];
    if(!data) return;
    
    const photoEl = document.getElementById('detail-foto');
    if (photoEl) {
        if (data.foto) {
            photoEl.src = data.foto;
        } else {
            photoEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nama)}&size=400&background=005eb8&color=fff&bold=true`;
        }
    }
    
    const setTxt = (eid, val) => { const el = document.getElementById(eid); if(el) el.innerText = val; };
    
    setTxt('detail-nama', data.nama);
    setTxt('detail-nim-side', data.nim || '-');
    setTxt('detail-divisi-side', data.divisi);
    setTxt('detail-angkatan-side', data.angkatan || '-');
    
    const btnEdit = document.getElementById('btn-edit-detail'); if(btnEdit) btnEdit.onclick = () => window.open(window.location.pathname + `?edit=${id}`, '_blank');
    const btnHapus = document.getElementById('btn-hapus-detail');
    if(btnHapus) {
        btnHapus.onclick = () => {
            window.customConfirm(`TINDAKAN PERMANEN:\nYakin ingin menghapus seluruh biodata ${data.nama}?`, async () => {
                try {
                    await db.collection("anggota_organisasi").doc(id).delete();
                    window.showToast('Terhapus', 'Biodata berhasil dihapus dari sistem.', 'success');
                    window.switchView('view-kelola-anggota');
                } catch(err) {
                    window.showToast('Gagal', 'Terjadi kesalahan saat menghapus.', 'error');
                }
            });
        };
    }

    const btnPrintProfil = document.getElementById('btn-print-profil'); if(btnPrintProfil) btnPrintProfil.onclick = () => window.cetakDokumen('profil', id);
    const btnPrintSurat = document.getElementById('btn-print-surat'); if(btnPrintSurat) btnPrintSurat.onclick = () => window.cetakDokumen('surat', id);
    const btnEprofil = document.getElementById('btn-lihat-eprofil'); if(btnEprofil) btnEprofil.onclick = () => window.bukaEProfil(id);

    setTxt('detail-nim', data.nim || '-');
    setTxt('detail-nama-full', data.nama);
    setTxt('detail-jk', data.jk);
    setTxt('detail-alamat', data.alamat);
    
    let ttl = data.tempat_lahir || '';
    if(data.tgl_lahir) {
        const dateObj = new Date(data.tgl_lahir);
        ttl += `, ${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
    }
    setTxt('detail-ttl', ttl || '-');

    setTxt('detail-prodi', data.prodi || '-');
    setTxt('detail-wa', data.wa || '-');
    setTxt('detail-email', data.email || '-');
    setTxt('detail-divisi', data.divisi || '-');
    setTxt('detail-angkatan', data.angkatan || '-');

    if(typeof window.gantiTabDetailView === 'function') window.gantiTabDetailView(1);
    window.switchView('view-detail-anggota');
};

function sinkronAnggotaRealtime() {
    if(unsubscribeAnggota) unsubscribeAnggota();
    unsubscribeAnggota = db.collection("anggota_organisasi").orderBy("nama", "asc").onSnapshot((snapshot) => {
        let total = 0; let putra = 0; let putri = 0;

        window.cachedAnggotaData = {};

        snapshot.forEach((doc) => {
            const r = doc.data();
            window.cachedAnggotaData[doc.id] = r;

            total++;
            if(r.jk === 'Laki-laki') putra++;
            else if(r.jk === 'Perempuan') putri++;
        });
        
        window.renderTabelAnggota();
        
        const dashAnggota = document.getElementById('dash-total-anggota'); if(dashAnggota) dashAnggota.innerText = total;

        const cardLaki = document.getElementById('card-laki'); if(cardLaki) cardLaki.innerText = putra;
        const cardPerempuan = document.getElementById('card-perempuan'); if(cardPerempuan) cardPerempuan.innerText = putri;
        const cardTotal = document.getElementById('card-total'); if(cardTotal) cardTotal.innerText = total;

        if(pieChartInstance) {
            pieChartInstance.data.datasets[0].data = [putra, putri];
            if(total > 0) {
                const pctPutra = ((putra/total)*100).toFixed(1);
                const pctPutri = ((putri/total)*100).toFixed(1);
                pieChartInstance.data.labels = [`Laki-laki: ${pctPutra}%`, `Perempuan: ${pctPutri}%`];
            } else {
                pieChartInstance.data.labels = ['Laki-laki', 'Perempuan'];
            }
            pieChartInstance.update();
        }
    });
}

window.renderTabelAnggota = () => {
    const elKat = document.getElementById('filterKategori');
    const elVal = document.getElementById('filterNilai');
    const elCari = document.getElementById('pencarianTabel');
    
    const kat = elKat ? elKat.value : '';
    const val = elVal ? elVal.value : '';
    const search = elCari ? elCari.value.toLowerCase() : '';
    
    let tbody = document.getElementById('tableAnggotaBody');
    let htmlTable = '';
    let displayedCount = 0;
    let total = Object.keys(window.cachedAnggotaData).length;

    let dataArray = Object.keys(window.cachedAnggotaData).map(id => ({id, ...window.cachedAnggotaData[id]}));
    dataArray.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));

    dataArray.forEach(r => {
        let passFilter = true;
        
        if(kat === 'divisi' && val && r.divisi !== val) passFilter = false;
        if(kat === 'jk' && val && r.jk !== val) passFilter = false;
        if(kat === 'angkatan' && val && String(r.angkatan) !== val) passFilter = false;

        if(search) {
            let rowText = `${r.nim || ''} ${r.nama || ''} ${r.divisi || ''} ${r.angkatan || ''} ${r.alamat || ''}`.toLowerCase();
            if(!rowText.includes(search)) passFilter = false;
        }

        if(passFilter) {
            displayedCount++;
            const safeRNim = escapeHtml(r.nim || '-');
            const safeRName = escapeHtml(r.nama || '-');
            const safeRDivisi = escapeHtml(r.divisi || '-');
            const safeRAngkatan = escapeHtml(r.angkatan || '-');
            const safeRAlamat = escapeHtml(r.alamat || '-');
            const safeRId = JSON.stringify(String(r.id || ''));
            htmlTable += `<tr class="hover:bg-slate-50 transition-colors text-slate-700">
                <td class="p-2.5 border-b border-slate-200">${displayedCount}</td>
                <td class="p-2.5 border-b border-slate-200">${safeRNim}</td>
                <td class="p-2.5 border-b border-slate-200 text-[#3c8dbc] uppercase font-bold cursor-pointer hover:underline" onclick="window.lihatDetailAnggota(${safeRId})" title="Klik untuk lihat E-Profil">${safeRName}</td>
                <td class="p-2.5 border-b border-slate-200 uppercase">${safeRDivisi}</td>
                <td class="p-2.5 border-b border-slate-200">${safeRAngkatan}</td>
                <td class="p-2.5 border-b border-slate-200 uppercase">${safeRAlamat}</td>
                <td class="p-2.5 border-b border-slate-200 text-center">
                    <button onclick="window.open(window.location.pathname + '?edit=' + encodeURIComponent(${safeRId}), '_blank')" class="bg-[#00a65a] hover:bg-green-700 text-white w-6 h-6 rounded-sm shadow-sm inline-flex items-center justify-center mr-1 transition-colors" title="Edit di Tab Baru"><i class="ph-bold ph-pencil-simple"></i></button>
                    <button onclick="window.hapusAnggota(${safeRId})" class="bg-[#dd4b39] hover:bg-red-700 text-white w-6 h-6 rounded-sm shadow-sm inline-flex items-center justify-center transition-colors" title="Hapus"><i class="ph-bold ph-x"></i></button>
                </td>
            </tr>`;
        }
    });

    if(tbody) tbody.innerHTML = displayedCount === 0 ? `<tr><td colspan="7" class="text-center py-8 text-slate-400 font-medium">Tidak ada data yang sesuai dengan pencarian/filter.</td></tr>` : htmlTable;

    const tabelInfo = document.getElementById('tableInfo');
    if(tabelInfo) tabelInfo.innerText = `Menampilkan ${displayedCount > 0 ? 1 : 0} s/d ${displayedCount} dari ${total} Entri Data`;
    const tabelJumlah = document.getElementById('tabel-jumlah');
    if(tabelJumlah) tabelJumlah.innerText = displayedCount;
};

window.updatePilihanFilter = () => {
    const filterKategori = document.getElementById('filterKategori');
    const filterNilai = document.getElementById('filterNilai');
    if(!filterKategori || !filterNilai) return;

    const kategori = filterKategori.value;
    const labels = { divisi: 'Divisi', jk: 'Jenis Kelamin', angkatan: 'Angkatan' };
    const values = new Set();

    Object.values(window.cachedAnggotaData || {}).forEach((row) => {
        if(kategori && row[kategori]) values.add(String(row[kategori]));
    });

    filterNilai.innerHTML = `<option value="">- Semua ${labels[kategori] || 'Kategori'} -</option>` +
        Array.from(values).sort((a, b) => a.localeCompare(b)).map((value) => {
            const safeValue = escapeHtml(value);
            return `<option value="${safeValue}">${safeValue}</option>`;
        }).join('');

    window.renderTabelAnggota();
};

window.resetFilterTabel = () => {
    setInputValue('filterKategori', '');
    const filterNilai = document.getElementById('filterNilai');
    if(filterNilai) filterNilai.innerHTML = '<option value="">- Pilih Kategori Terlebih Dahulu -</option>';
    setInputValue('pencarianTabel', '');
    window.renderTabelAnggota();
};

// ... (KODE MANAJEMEN KAS & KEUANGAN)
window.updateKategoriPembayaran = () => {
    const sumber = getInputValue('sumberDanaPembayaran');
    setInputValue('kategoriPembayaran', sumber === 'kampus' ? 'Dana Kampus' : 'Kas Anggota');
};

window.updateKategoriPengeluaran = () => {
    const sumber = getInputValue('sumberDanaPengeluaran');
    const splitFields = document.getElementById('campuranSplitFields');
    if(splitFields) splitFields.classList.toggle('hidden', sumber !== 'campuran');
    setInputValue('kategoriPengeluaranForm', sumber === 'kampus' ? 'Program Kampus' : sumber === 'campuran' ? 'Event Dana Campuran' : 'Operasional');
    window.updateCampuranTotal();
};

window.updateCampuranTotal = () => {
    if(getInputValue('sumberDanaPengeluaran') !== 'campuran') return;
    const total = Number(getInputValue('nomCampuranKampus')) + Number(getInputValue('nomCampuranOrganisasi'));
    setInputValue('nomPengeluaran', total || '');
};

window.simpanPembayaran = async (e) => {
    e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const ori = btn.innerText; btn.innerText = 'Merekam...'; btn.disabled = true;
    try { 
        await db.collection("kas_organisasi").add({ 
            tanggal: document.getElementById('tglPembayaran').value, 
            jenis: 'Pemasukan', 
            sumberDana: document.getElementById('sumberDanaPembayaran').value, 
            kategori: document.getElementById('kategoriPembayaran').value, 
            keterangan: document.getElementById('ketPembayaran').value, 
            nominal: Number(document.getElementById('nomPembayaran').value), 
            timestamp: firebase.firestore.FieldValue.serverTimestamp() 
        }); 
        document.getElementById('formInputPembayaran').reset(); 
        setInputToJakartaToday('tglPembayaran');
        window.showToast('Sukses', 'Arus kas masuk dicatat.', 'success'); 
    } 
    catch (err) { window.showToast('Gagal', 'Sistem gagal menyimpan.', 'error'); } 
    finally { btn.innerText = ori; btn.disabled = false; }
};

window.simpanPengeluaran = async (e) => {
    e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const ori = btn.innerText; btn.innerText = 'Merekam...'; btn.disabled = true;
    try {
        const sumber = document.getElementById('sumberDanaPengeluaran').value;
        const totalNominal = Number(document.getElementById('nomPengeluaran').value);
        const nominalKampus = sumber === 'campuran' ? Number(document.getElementById('nomCampuranKampus').value) : 0;
        const nominalOrganisasi = sumber === 'campuran' ? Number(document.getElementById('nomCampuranOrganisasi').value) : 0;

        if (sumber === 'campuran' && (nominalKampus + nominalOrganisasi) !== totalNominal) {
            window.showToast('Gagal', 'Total nominal campuran harus sama dengan jumlah rincian kampus dan organisasi.', 'error');
            throw new Error('Total campuran tidak cocok');
        }

        await db.collection("kas_organisasi").add({
            tanggal: document.getElementById('tglPengeluaran').value,
            jenis: 'Pengeluaran',
            sumberDana: sumber,
            kategori: document.getElementById('kategoriPengeluaranForm').value,
            keterangan: document.getElementById('ketPengeluaran').value,
            nominal: totalNominal,
            nominalKampus,
            nominalOrganisasi,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('formInputPengeluaran').reset();
        setInputToJakartaToday('tglPengeluaran');
        const campuranSplit = document.getElementById('campuranSplitFields');
        if(campuranSplit) campuranSplit.classList.add('hidden');
        window.showToast('Sukses', 'Arus kas keluar dicatat.', 'success');
    } catch (err) {
        if (err.message !== 'Total campuran tidak cocok') {
            window.showToast('Gagal', 'Sistem gagal menyimpan.', 'error');
        }
    } finally { btn.innerText = ori; btn.disabled = false; }
};

window.hapusKas = (id, ket) => {
    window.customConfirm(`Tindakan Permanen:\nYakin hapus transaksi kas:\n"${ket}" ?`, async () => {
        try {
            await db.collection("kas_organisasi").doc(id).delete();
            window.showToast('Terhapus', 'Transaksi dihapus.', 'success');
        } catch(err) {
            window.showToast('Gagal', 'Terjadi kesalahan.', 'error');
        }
    });
};

function sinkronKasRealtime() {
    if(unsubscribeKas) unsubscribeKas();
    unsubscribeKas = db.collection("kas_organisasi").onSnapshot((snapshot) => {
        let tempData = [];
        snapshot.forEach((doc) => {
            let r = doc.data();
            r.id = doc.id;
            r.timeValue = r.timestamp ? r.timestamp.toMillis() : Date.now();
            tempData.push(r);
        });

        tempData.sort((a, b) => {
            if (a.tanggal !== b.tanggal) {
                return a.tanggal.localeCompare(b.tanggal);
            }
            return a.timeValue - b.timeValue;
        });

        let saldoCounter = 0; let tMasuk = 0; let tKeluar = 0;
        let danaKampusMasuk = 0; let danaKampusKeluar = 0; let danaOrganisasiMasuk = 0; let danaOrganisasiKeluar = 0; let eventCampuran = 0;
        window.cachedKasData = [];

        tempData.forEach((r) => {
            const nom = Number(r.nominal);
            const isMasuk = r.jenis === 'Pemasukan';
            
            if (isMasuk) {
                saldoCounter += nom;
                tMasuk += nom;
                if(r.sumberDana === 'kampus') danaKampusMasuk += nom;
                else danaOrganisasiMasuk += nom;
            } else {
                saldoCounter -= nom;
                tKeluar += nom;
                if(r.sumberDana === 'kampus') danaKampusKeluar += nom;
                else if(r.sumberDana === 'campuran') {
                    danaKampusKeluar += Number(r.nominalKampus || 0);
                    danaOrganisasiKeluar += Number(r.nominalOrganisasi || 0);
                    eventCampuran += nom;
                } else {
                    danaOrganisasiKeluar += nom;
                }
            }
            
            r.saldoCalc = saldoCounter;
            window.cachedKasData.push(r);
        });

        setText('card-pemasukan', formatRp(tMasuk));
        setText('card-pengeluaran', formatRp(tKeluar));
        setText('card-saldo', formatRp(saldoCounter));
        setText('card-dana-kampus', formatRp(danaKampusMasuk - danaKampusKeluar));
        setText('card-dana-organisasi', formatRp(danaOrganisasiMasuk - danaOrganisasiKeluar));
        setText('card-event-campuran', formatRp(eventCampuran));
        setText('totalDanaKampusMasuk', formatRp(danaKampusMasuk));
        setText('totalDanaKampusKeluar', formatRp(danaKampusKeluar));
        setText('sisaDanaKampus', formatRp(danaKampusMasuk - danaKampusKeluar));

        if(chartInstance) {
            chartInstance.data.datasets[0].data = [tMasuk];
            chartInstance.data.datasets[1].data = [tKeluar];
            chartInstance.update();
            window.updateDashboardChartState();
            
        }
        window.renderTabelKas();
        window.renderLPJKampus();
    }, (error) => {
        console.error("Error fetching kas data:", error);
    });
}

window.renderTabelKas = () => {
    const elBulan = document.getElementById('filterBulanKas');
    const elTahun = document.getElementById('filterTahunKas');
    const elCari = document.getElementById('cariKas');
    
    const fBulan = elBulan ? elBulan.value : '';
    const fTahun = elTahun ? elTahun.value : '';
    const cari = elCari ? elCari.value.toLowerCase() : '';
    const tbody = document.getElementById('tableBody');
    
    let htmlTable = ''; let count = 0;

    for (let i = window.cachedKasData.length - 1; i >= 0; i--) {
        const r = window.cachedKasData[i];
        const parts = (r.tanggal || '').split('-');
        if(fTahun && parts[0] !== fTahun) continue;
        if(fBulan && parts[1] !== fBulan) continue;
        if(cari && !(r.keterangan || '').toLowerCase().includes(cari) && !(r.kategori || '').toLowerCase().includes(cari)) continue;

        count++;
        const isMasuk = r.jenis === 'Pemasukan';
        const nom = Number(r.nominal);
        const safeRTanggal = escapeHtml(r.tanggal || '');
        const safeRKeterangan = escapeHtml(r.keterangan || '-');
        const safeRKategori = escapeHtml(r.kategori || '-');
        const safeRId = JSON.stringify(String(r.id || ''));
        
        htmlTable += `<tr class="hover:bg-slate-50 transition-colors border-b border-slate-100">
            <td class="px-4 py-3 text-slate-500 font-medium text-[11px] whitespace-nowrap">${safeRTanggal}</td>
            <td class="px-4 py-3">
                <p class="font-bold text-slate-700 text-xs">${safeRKeterangan}</p>
                <p class="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">${safeRKategori}</p>
            </td>
            <td class="px-4 py-3 text-right text-emerald-600 font-bold text-xs">${isMasuk ? formatRp(nom) : '-'}</td>
            <td class="px-4 py-3 text-right text-rose-600 font-bold text-xs">${!isMasuk ? formatRp(nom) : '-'}</td>
            <td class="px-4 py-3 text-right font-black text-slate-800 bg-slate-50/50 text-xs">${formatRp(r.saldoCalc)}</td>
            <td class="px-4 py-3 text-center">
                <div class="flex justify-center gap-1">
                    <button onclick="window.bukaEditTransaksi(${safeRId})" class="bg-amber-100 text-amber-600 hover:bg-amber-500 hover:text-white p-1.5 rounded transition-colors" title="Edit Transaksi"><i class="ph-bold ph-pencil-simple"></i></button>
                    <button onclick="window.hapusKas(${safeRId}, ${JSON.stringify(r.keterangan || '')})" class="bg-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white p-1.5 rounded transition-colors" title="Hapus Transaksi"><i class="ph-bold ph-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }

    if(tbody) tbody.innerHTML = count === 0 ? '<tr><td colspan="6" class="text-center py-12 text-slate-400 font-medium">Data transaksi tidak ditemukan / kosong.</td></tr>' : htmlTable;
    if(document.getElementById('infoTabelKas')) document.getElementById('infoTabelKas').innerText = `Menampilkan ${count} Transaksi`;
};

window.renderLPJKampus = () => {
    const tbody = document.getElementById('tableBodyLPJ');
    if(!tbody) return;

    const rows = (window.cachedKasData || []).filter((r) => r.sumberDana === 'kampus' || r.sumberDana === 'campuran');
    let count = 0;
    const html = rows.slice().reverse().map((r) => {
        count++;
        const keluar = r.jenis === 'Pengeluaran' ? Number(r.nominal || 0) : 0;
        return `<tr class="hover:bg-slate-50">
            <td class="px-4 py-3 text-slate-500">${escapeHtml(r.tanggal || '-')}</td>
            <td class="px-4 py-3 font-bold text-slate-700">${escapeHtml(r.kategori || '-')}</td>
            <td class="px-4 py-3 text-slate-600">${escapeHtml(r.keterangan || '-')}</td>
            <td class="px-4 py-3 text-right font-bold text-rose-600">${keluar ? formatRp(keluar) : '-'}</td>
        </tr>`;
    }).join('');

    tbody.innerHTML = count ? html : '<tr><td colspan="4" class="text-center py-10 text-slate-400 font-medium">Belum ada transaksi dana kampus atau campuran.</td></tr>';
};

window.updateDashboardChartState = () => {
    const empty = document.getElementById('dashboard-chart-empty');
    if(!empty || !chartInstance) return;
    const total = chartInstance.data.datasets.reduce((sum, ds) => sum + Number(ds.data[0] || 0), 0);
    empty.classList.toggle('hidden', total > 0);
};

window.bukaEditTransaksi = (id) => {
    const data = (window.cachedKasData || []).find((row) => row.id === id);
    if(!data) {
        window.showToast('Gagal', 'Data transaksi tidak ditemukan.', 'error');
        return;
    }

    setInputValue('edit-transaksi-id', id);
    setInputValue('edit-jenis', data.jenis || 'Pemasukan');
    setInputValue('edit-sumber-dana', data.sumberDana || 'organisasi');
    setInputValue('edit-tanggal', data.tanggal || '');
    setInputValue('edit-kategori', data.kategori || '');
    setInputValue('edit-keterangan', data.keterangan || '');
    setInputValue('edit-nominal', Number(data.nominal || 0));
    setInputValue('edit-nominal-kampus', Number(data.nominalKampus || 0) || '');
    setInputValue('edit-nominal-organisasi', Number(data.nominalOrganisasi || 0) || '');
    window.updateEditKategori(false);

    const modal = document.getElementById('edit-transaksi-modal');
    if(modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            if(modal.children[0]) modal.children[0].classList.remove('scale-95');
        }, 10);
    }
};

window.closeEditModal = () => {
    const modal = document.getElementById('edit-transaksi-modal');
    if(!modal) return;
    modal.classList.add('opacity-0');
    if(modal.children[0]) modal.children[0].classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 250);
};

window.updateEditKategori = (overwrite = true) => {
    const jenis = getInputValue('edit-jenis');
    const sumber = getInputValue('edit-sumber-dana');
    const split = document.getElementById('editCampuranSplitFields');
    if(split) split.classList.toggle('hidden', !(jenis === 'Pengeluaran' && sumber === 'campuran'));

    if(overwrite) {
        setInputValue('edit-kategori', jenis === 'Pemasukan' ? (sumber === 'kampus' ? 'Dana Kampus' : 'Kas Anggota') : (sumber === 'campuran' ? 'Event Dana Campuran' : sumber === 'kampus' ? 'Program Kampus' : 'Operasional'));
    }
};

window.updateEditCampuranTotal = () => {
    if(getInputValue('edit-sumber-dana') !== 'campuran') return;
    const total = Number(getInputValue('edit-nominal-kampus')) + Number(getInputValue('edit-nominal-organisasi'));
    setInputValue('edit-nominal', total || '');
};

window.simpanEditTransaksi = async (e) => {
    e.preventDefault();
    const id = getInputValue('edit-transaksi-id');
    if(!id) return;

    const jenis = getInputValue('edit-jenis');
    const sumberDana = getInputValue('edit-sumber-dana');
    const nominal = Number(getInputValue('edit-nominal'));
    const nominalKampus = sumberDana === 'campuran' ? Number(getInputValue('edit-nominal-kampus')) : 0;
    const nominalOrganisasi = sumberDana === 'campuran' ? Number(getInputValue('edit-nominal-organisasi')) : 0;

    if(jenis === 'Pengeluaran' && sumberDana === 'campuran' && nominalKampus + nominalOrganisasi !== nominal) {
        window.showToast('Gagal', 'Total dana campuran harus sama dengan nominal transaksi.', 'error');
        return;
    }

    try {
        await db.collection('kas_organisasi').doc(id).update({
            jenis,
            sumberDana,
            tanggal: getInputValue('edit-tanggal'),
            kategori: getInputValue('edit-kategori'),
            keterangan: getInputValue('edit-keterangan'),
            nominal,
            nominalKampus,
            nominalOrganisasi,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        window.closeEditModal();
        window.showToast('Sukses', 'Transaksi berhasil diperbarui.', 'success');
    } catch(err) {
        window.showToast('Gagal', 'Transaksi gagal diperbarui.', 'error');
    }
};

const downloadTextFile = (filename, content, mime = 'text/csv;charset=utf-8;') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const makeCsv = (headers, rows) => {
    const lines = [headers.map(csvCell).join(';')];
    rows.forEach((row) => lines.push(row.map(csvCell).join(';')));
    return `\ufeff${lines.join('\n')}`;
};

window.downloadCSVData = (type) => {
    let filename = `${type || 'export'}-${getJakartaDateInputValue()}.csv`;
    let headers = [];
    let rows = [];

    if(type === 'Buku_Kas') {
        headers = ['Tanggal', 'Jenis', 'Sumber Dana', 'Kategori', 'Keterangan', 'Masuk', 'Keluar', 'Saldo'];
        rows = (window.cachedKasData || []).map((r) => {
            const isMasuk = r.jenis === 'Pemasukan';
            return [r.tanggal, r.jenis, r.sumberDana, r.kategori, r.keterangan, isMasuk ? r.nominal : '', isMasuk ? '' : r.nominal, r.saldoCalc];
        });
    } else {
        headers = ['NIM', 'Nama', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'Alamat', 'Prodi', 'Email', 'WA', 'Divisi', 'Angkatan'];
        let data = Object.values(window.cachedAnggotaData || {});
        if(type === 'Data_Laki') data = data.filter((r) => r.jk === 'Laki-laki');
        if(type === 'Data_Perempuan') data = data.filter((r) => r.jk === 'Perempuan');
        if(type === 'Tabel_Anggota') {
            const search = getInputValue('pencarianTabel').toLowerCase();
            const kategori = getInputValue('filterKategori');
            const nilai = getInputValue('filterNilai');
            data = data.filter((r) => {
                if(kategori && nilai && String(r[kategori] || '') !== nilai) return false;
                return !search || `${r.nim || ''} ${r.nama || ''} ${r.divisi || ''} ${r.angkatan || ''} ${r.alamat || ''}`.toLowerCase().includes(search);
            });
        }
        rows = data.map((r) => [r.nim, r.nama, r.jk, r.tempat_lahir, r.tgl_lahir, r.alamat, r.prodi, r.email, r.wa, r.divisi, r.angkatan]);
    }

    downloadTextFile(filename, makeCsv(headers, rows));
    window.showToast('Export Berhasil', `${rows.length} baris data diunduh.`, 'success');
};

window.handleSimulatedDownload = (name, format) => {
    window.showToast('Siap Cetak', `${name} akan dibuka melalui dialog cetak ${format}.`, 'success');
    setTimeout(() => window.print(), 250);
};

const openPrintableDocument = (title, bodyHtml) => {
    const win = window.open('', '_blank');
    if(!win) {
        window.showToast('Gagal', 'Popup diblokir browser. Izinkan popup untuk mencetak dokumen.', 'error');
        return;
    }

    win.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title>
        <style>
            body{font-family:Arial,sans-serif;color:#0f172a;margin:32px;line-height:1.55}
            .kop{text-align:center;border-bottom:3px double #0f172a;padding-bottom:12px;margin-bottom:24px}
            .kop img{max-width:100%;max-height:120px;object-fit:contain}
            table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
            th,td{border:1px solid #cbd5e1;padding:8px;text-align:left;vertical-align:top}
            th{background:#f1f5f9}
            .right{text-align:right}.center{text-align:center}.ttd{margin-top:48px;display:flex;justify-content:space-between;gap:32px}.ttd>div{width:32%;text-align:center}.name{font-weight:bold;text-decoration:underline;margin-top:56px}
            @media print{body{margin:18mm}.no-print{display:none}}
        </style></head><body>${bodyHtml}<script>setTimeout(() => window.print(), 300);<\/script></body></html>`);
    win.document.close();
};

window.generateLPJ = () => {
    const rows = (window.cachedKasData || []).filter((r) => r.sumberDana === 'kampus' || r.sumberDana === 'campuran');
    const tableRows = rows.map((r, index) => `<tr>
        <td>${index + 1}</td><td>${escapeHtml(r.tanggal || '-')}</td><td>${escapeHtml(r.jenis || '-')}</td>
        <td>${escapeHtml(r.kategori || '-')}</td><td>${escapeHtml(r.keterangan || '-')}</td>
        <td class="right">${r.jenis === 'Pengeluaran' ? formatRp(Number(r.nominal || 0)) : '-'}</td>
    </tr>`).join('');

    const body = `<div class="kop">${window.appConfig.kopImg ? `<img src="${safeUrl(window.appConfig.kopImg)}">` : '<h2>LPM MAKHIBRA</h2><p>Laporan Pertanggungjawaban Dana Kampus</p>'}</div>
        <h3 class="center">LAPORAN PERTANGGUNGJAWABAN DANA KAMPUS</h3>
        <table><thead><tr><th>No</th><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Keterangan</th><th>Pengeluaran</th></tr></thead><tbody>${tableRows || '<tr><td colspan="6" class="center">Belum ada data.</td></tr>'}</tbody></table>
        <p class="right"><strong>Sisa Dana Kampus:</strong> ${escapeHtml(document.getElementById('sisaDanaKampus')?.innerText || 'Rp 0')}</p>`;
    openPrintableDocument('LPJ Dana Kampus', body);
};

window.generateSuratOtomatis = async (e) => {
    e.preventDefault();
    const readFile = async (id) => {
        const input = document.getElementById(id);
        return input && input.files && input.files[0] ? compressWideImage(input.files[0]) : '';
    };

    const [ttd1, ttd2, ttd3, stempel] = await Promise.all(['gs-ttd-1', 'gs-ttd-2', 'gs-ttd-3', 'gs-stempel'].map(readFile));
    const paragraphs = escapeHtml(getInputValue('gs-isi')).split('\n').filter(Boolean).map((p) => `<p>${p}</p>`).join('');
    const sign = (jabatan, nama, img) => `<div><p>${escapeHtml(jabatan || '')}</p>${img ? `<img src="${img}" style="height:64px;object-fit:contain">` : '<div style="height:64px"></div>'}<p class="name">${escapeHtml(nama || '')}</p></div>`;

    const body = `<div class="kop">${window.appConfig.kopImg ? `<img src="${safeUrl(window.appConfig.kopImg)}">` : '<h2>LPM MAKHIBRA</h2>'}</div>
        <p>Nomor: ${escapeHtml(getInputValue('gs-nomor'))}<br>Lampiran: ${escapeHtml(getInputValue('gs-lampiran') || '-')}<br>Perihal: <strong>${escapeHtml(getInputValue('gs-perihal'))}</strong></p>
        <p>Kepada Yth.<br>${escapeHtml(getInputValue('gs-tujuan'))}<br>di ${escapeHtml(getInputValue('gs-alamat'))}</p>
        ${paragraphs}
        <p class="right">${escapeHtml(getInputValue('gs-tempat'))}, ${escapeHtml(getInputValue('gs-tanggal'))}</p>
        <div class="ttd">${sign(getInputValue('gs-jabatan-1'), getInputValue('gs-nama-1'), ttd1)}${sign(getInputValue('gs-jabatan-2'), getInputValue('gs-nama-2'), ttd2)}${sign(getInputValue('gs-jabatan-3'), getInputValue('gs-nama-3'), ttd3 || stempel)}</div>`;
    openPrintableDocument('Surat Otomatis', body);
};

window.cetakDokumen = (type, id) => {
    window.open(`${window.location.pathname}?print=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`, '_blank');
};

window.bukaEProfil = (id) => {
    window.open(`${window.location.pathname}?verify=${encodeURIComponent(id)}`, '_blank');
};

window.renderPublicVerification = async (id) => {
    const view = document.getElementById('view-public-verify');
    const content = document.getElementById('public-verify-content');
    if(view) {
        view.classList.remove('hidden');
        view.classList.add('flex');
    }
    if(!content) return;

    try {
        const doc = await db.collection('anggota_organisasi').doc(id).get();
        if(!doc.exists) throw new Error('not-found');
        const data = doc.data();
        content.innerHTML = `<div class="text-center">
            <img src="${safeUrl(data.foto) || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nama || 'Anggota')}&size=160&background=10b981&color=fff`}" class="w-28 h-28 rounded-full object-cover mx-auto mb-4 border-4 border-emerald-100">
            <h3 class="text-xl font-black text-slate-800">${escapeHtml(data.nama || '-')}</h3>
            <p class="text-sm text-slate-500 font-bold">${escapeHtml(data.nim || '-')}</p>
            <div class="mt-5 text-left text-sm space-y-2">
                <p><strong>Divisi:</strong> ${escapeHtml(data.divisi || '-')}</p>
                <p><strong>Angkatan:</strong> ${escapeHtml(data.angkatan || '-')}</p>
                <p><strong>Program Studi:</strong> ${escapeHtml(data.prodi || '-')}</p>
            </div>
        </div>`;
    } catch(err) {
        content.innerHTML = '<p class="text-center text-rose-600 font-bold">Data anggota tidak ditemukan.</p>';
    }
};

window.renderPrintView = async (type, id) => {
    try {
        const doc = await db.collection('anggota_organisasi').doc(id).get();
        if(!doc.exists) throw new Error('not-found');
        const data = doc.data();
        const body = `<div class="kop">${window.appConfig.kopImg ? `<img src="${safeUrl(window.appConfig.kopImg)}">` : '<h2>LPM MAKHIBRA</h2>'}</div>
            <h3 class="center">${type === 'surat' ? 'SURAT KETERANGAN ANGGOTA' : 'PROFIL ANGGOTA'}</h3>
            <table><tbody>
                <tr><th>NIM</th><td>${escapeHtml(data.nim || '-')}</td></tr>
                <tr><th>Nama</th><td>${escapeHtml(data.nama || '-')}</td></tr>
                <tr><th>Jenis Kelamin</th><td>${escapeHtml(data.jk || '-')}</td></tr>
                <tr><th>Divisi</th><td>${escapeHtml(data.divisi || '-')}</td></tr>
                <tr><th>Angkatan</th><td>${escapeHtml(data.angkatan || '-')}</td></tr>
                <tr><th>Alamat</th><td>${escapeHtml(data.alamat || '-')}</td></tr>
            </tbody></table>`;
        document.open();
        document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>${type === 'surat' ? 'Surat Anggota' : 'Profil Anggota'}</title>
            <style>
                body{font-family:Arial,sans-serif;color:#0f172a;margin:32px;line-height:1.55}
                .kop{text-align:center;border-bottom:3px double #0f172a;padding-bottom:12px;margin-bottom:24px}
                .kop img{max-width:100%;max-height:120px;object-fit:contain}
                table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
                th,td{border:1px solid #cbd5e1;padding:8px;text-align:left;vertical-align:top}
                th{background:#f1f5f9;width:180px}.center{text-align:center}
                @media print{body{margin:18mm}}
            </style></head><body>${body}<script>setTimeout(() => window.print(), 300);<\/script></body></html>`);
        document.close();
    } catch(err) {
        window.showToast('Gagal', 'Data cetak tidak ditemukan.', 'error');
    }
};


// ... (KODE MANAJEMEN E-ARSIP SURAT)
window.simpanArsip = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]'); const ori = btn.innerHTML;
    btn.innerHTML = 'MENGUPLOD...'; btn.disabled = true;
    
    const fileInput = document.getElementById('arsipFile');
    if (!fileInput.files || !fileInput.files[0]) {
        window.showToast("Gagal", "Harap pilih file dokumen!", "error"); btn.innerHTML = ori; btn.disabled = false; return;
    }
    const file = fileInput.files[0];
    if (file.size > 1048576) {
        window.showToast("File Kebesaran", "Ukuran maksimal file adalah 1 MB!", "error"); btn.innerHTML = ori; btn.disabled = false; return;
    }

    try {
        const fileData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
        
        await db.collection("arsip_surat").add({ 
            jenis: document.getElementById('arsipJenis').value,
            tanggal: document.getElementById('arsipTanggal').value,
            nomor: document.getElementById('arsipNomor').value,
            pihak: document.getElementById('arsipPihak').value,
            perihal: document.getElementById('arsipPerihal').value,
            fileData: fileData,
            fileType: file.type,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        document.getElementById('formInputArsip').reset();
        window.showToast('Sukses', 'Dokumen Arsip berhasil di-upload ke Cloud.', 'success');
        window.switchView('view-arsip-surat');
    } catch (err) { window.showToast('Gagal', 'Terjadi kesalahan sistem upload.', 'error'); }
    finally { btn.innerHTML = ori; btn.disabled = false; }
};

window.hapusArsip = (id) => {
    window.customConfirm(`Yakin ingin menghapus arsip dokumen ini selamanya?`, async () => {
        try {
            await db.collection("arsip_surat").doc(id).delete();
            window.showToast('Terhapus', 'Arsip surat dihapus.', 'success');
        } catch(err) {
            window.showToast('Gagal', 'Gagal menghapus arsip.', 'error');
        }
    });
};

function sinkronArsipRealtime() {
    if(unsubscribeArsip) unsubscribeArsip();
    unsubscribeArsip = db.collection("arsip_surat").onSnapshot((snapshot) => {
        window.cachedArsipData = {};
        snapshot.forEach((doc) => { window.cachedArsipData[doc.id] = doc.data(); });
        window.renderTabelArsip();
    });
}

window.renderTabelArsip = () => {
    const elJenis = document.getElementById('filterJenisArsip');
    const elCari = document.getElementById('cariArsip');
    
    const filterJenis = elJenis ? elJenis.value : '';
    const search = elCari ? elCari.value.toLowerCase() : '';
    const tbody = document.getElementById('tabelBodyArsip');
    if(!tbody) return;

    let htmlTable = ''; let count = 0;
    let dataArray = Object.keys(window.cachedArsipData).map(id => ({id, ...window.cachedArsipData[id]}));
    dataArray.sort((a,b) => new Date(b.tanggal || 0) - new Date(a.tanggal || 0));

    dataArray.forEach(r => {
        let pass = true;
        if(filterJenis && r.jenis !== filterJenis) pass = false;
        if(search && !`${r.nomor || ''} ${r.perihal || ''} ${r.pihak || ''}`.toLowerCase().includes(search)) pass = false;

        if(pass) {
            count++;
            const badgeColor = r.jenis === 'Surat Masuk' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700';
            const iconColor = r.jenis === 'Surat Masuk' ? 'ph-download-simple' : 'ph-upload-simple';
            
            const safeRJenis = escapeHtml(r.jenis || '');
            const safeRNomor = escapeHtml(r.nomor || '');
            const safeRTanggal = escapeHtml(r.tanggal || '');
            const safeRPihak = escapeHtml(r.pihak || '');
            const safeRPerihal = escapeHtml(r.perihal || '');
            const safeRId = JSON.stringify(String(r.id || ''));
            htmlTable += `<tr class="hover:bg-slate-50 border-b border-slate-100">
                <td class="px-5 py-4 text-slate-500">${count}</td>
                <td class="px-5 py-4"><span class="px-2.5 py-1 rounded text-[11px] font-bold ${badgeColor} uppercase tracking-wider flex items-center gap-1 w-max"><i class="ph-bold ${iconColor}"></i> ${safeRJenis}</span></td>
                <td class="px-5 py-4">
                    <p class="font-bold text-slate-800">${safeRNomor}</p>
                    <p class="text-xs text-slate-500 mt-0.5">${safeRTanggal}</p>
                </td>
                <td class="px-5 py-4 font-medium text-slate-700 uppercase">${safeRPihak}</td>
                <td class="px-5 py-4 text-slate-600 truncate max-w-[200px]">${safeRPerihal}</td>
                <td class="px-5 py-4 text-center">
                    <div class="flex justify-center gap-1">
                        <button onclick="window.hapusArsip(${safeRId})" class="bg-rose-100 hover:bg-rose-200 text-rose-600 p-1.5 rounded shadow-sm transition-colors"><i class="ph-bold ph-trash"></i></button>
                    </div>
                </td>
            </tr>`;
        }
    });

    tbody.innerHTML = count === 0 ? `<tr><td colspan="6" class="text-center py-10 text-slate-400 font-medium">Arsip surat tidak ditemukan.</td></tr>` : htmlTable;
};


// ==========================================
// 8. FUNGSI INISIALISASI (saat halaman dimuat)
// ==========================================
function initCharts() {
    const ctxBar = document.getElementById('keuanganChart');
    if(ctxBar && !chartInstance) {
        chartInstance = new Chart(ctxBar, {
            type: 'bar',
            data: { labels: ['Bulan Ini'], datasets: [{ label: 'Pemasukan', data: [0], backgroundColor: '#3498db' }, { label: 'Pengeluaran', data: [0], backgroundColor: '#e74c3c' }] },
            options: { 
                responsive: true, maintainAspectRatio: false, 
                plugins: { legend: { display: false } }, 
                scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false }, barPercentage: 0.4 } } 
            }
        });
    }

    const ctxPie = document.getElementById('divisiChart');
    if(ctxPie && !pieChartInstance) {
        pieChartInstance = new Chart(ctxPie, {
            type: 'pie',
            data: {
                labels: ['Laki-laki', 'Perempuan'],
                datasets: [{ 
                    data: [0, 0], 
                    backgroundColor: ['#3498db', '#2c3e50'],
                    borderWidth: 2, borderColor: '#ffffff', hoverOffset: 4
                }]
            },
            options: { 
                responsive: true, maintainAspectRatio: false, 
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15, font: {size: 11, weight: 'bold'} } } } 
            }
        });
    }
}

onReady(() => {
    const footerYear = document.getElementById('login-year');
    if(footerYear) footerYear.innerText = getFormattedJakartaYear(new Date());
    
    const urlParamsInitial = new URLSearchParams(window.location.search);
    
    if (urlParamsInitial.get('edit') || urlParamsInitial.get('verify') || urlParamsInitial.get('print')) {
        const loginView = document.getElementById('view-login');
        const loadingOverlay = document.getElementById('loading-overlay');
        if(loginView) {
            loginView.classList.add('hidden');
            loginView.style.display = 'none';
        }
        if(loadingOverlay) { loadingOverlay.classList.add('hidden'); loadingOverlay.classList.remove('flex'); }
    }

    setInputToJakartaToday('tglPembayaran');
    setInputToJakartaToday('tglPengeluaran');
    
    startClock();
    initCharts();
});

document.addEventListener('visibilitychange', () => {
    if(!document.hidden) startClock();
});
