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
let unsubscribeAudit = null;
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
window.cachedAuditLogs = [];
window.currentUserRole = 'viewer';
window.currentUserRoleLabel = 'Viewer';
window.appConfig = { kopImg: "", footerImg: "", footerCetak: "", pimpinanNama: "", ttdImg: "", nomorSurat: "", roles: {} };

const ROLE_LABELS = {
    webmaster: 'Webmaster',
    ketua: 'Ketua / Sekretaris',
    sekretaris: 'Ketua / Sekretaris',
    bendahara: 'Bendahara',
    admin_divisi: 'Admin Divisi',
    viewer: 'Viewer'
};

const ROLE_PERMISSIONS = {
    webmaster: ['manage_settings', 'manage_roles', 'manage_members', 'delete_members', 'manage_finance', 'delete_finance', 'manage_archive', 'delete_archive', 'backup_restore', 'view_reports'],
    ketua: ['manage_members', 'manage_archive', 'delete_archive', 'view_reports', 'backup_export'],
    sekretaris: ['manage_members', 'manage_archive', 'delete_archive', 'view_reports', 'backup_export'],
    bendahara: ['manage_finance', 'delete_finance', 'view_reports', 'backup_export'],
    admin_divisi: ['manage_members', 'manage_archive', 'view_reports'],
    viewer: ['view_reports']
};

const SAFE_ARCHIVE_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

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

const parseCurrencyNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : NaN;
};

const isValidDateInput = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

const getRoleLabel = (role) => ROLE_LABELS[role] || ROLE_LABELS.viewer;

const hasPermission = (permission) => {
    const permissions = ROLE_PERMISSIONS[window.currentUserRole] || ROLE_PERMISSIONS.viewer;
    return permissions.includes(permission);
};

const requirePermission = (permission, message = 'Akses Anda tidak diizinkan untuk tindakan ini.') => {
    if(hasPermission(permission)) return true;
    window.showToast('Akses Ditolak', message, 'error');
    return false;
};

const setActionVisibility = (selector, allowed) => {
    document.querySelectorAll(selector).forEach((el) => {
        el.classList.toggle('hidden', !allowed);
        if('disabled' in el) el.disabled = !allowed;
    });
};

function applyRoleAccess() {
    setText('currentUserRoleLabel', window.currentUserRoleLabel || getRoleLabel(window.currentUserRole));
    setActionVisibility('[data-permission="manage_members"]', hasPermission('manage_members'));
    setActionVisibility('[data-permission="delete_members"]', hasPermission('delete_members'));
    setActionVisibility('[data-permission="manage_finance"]', hasPermission('manage_finance'));
    setActionVisibility('[data-permission="delete_finance"]', hasPermission('delete_finance'));
    setActionVisibility('[data-permission="manage_archive"]', hasPermission('manage_archive'));
    setActionVisibility('[data-permission="delete_archive"]', hasPermission('delete_archive'));
    setActionVisibility('[data-permission="manage_settings"]', hasPermission('manage_settings'));
    setActionVisibility('[data-permission="manage_roles"]', hasPermission('manage_roles'));
    setActionVisibility('[data-permission="backup_restore"]', hasPermission('backup_restore'));
    setActionVisibility('[data-permission="backup_export"]', hasPermission('backup_restore') || hasPermission('backup_export'));
}

const updateCurrentRole = () => {
    const user = auth.currentUser;
    const roles = window.appConfig.roles || {};
    const roleCount = Object.keys(roles).length;
    const role = user && roles[user.uid] ? roles[user.uid] : (roleCount === 0 ? 'webmaster' : 'viewer');
    window.currentUserRole = ROLE_PERMISSIONS[role] ? role : 'viewer';
    window.currentUserRoleLabel = getRoleLabel(window.currentUserRole);
    applyRoleAccess();
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

const VIEW_PERMISSIONS = {
    'view-tambah-anggota': 'manage_members',
    'view-catat-transaksi': 'manage_finance',
    'view-catat-pengeluaran': 'manage_finance',
    'view-tambah-arsip': 'manage_archive',
    'view-buat-surat': 'manage_archive',
    'view-setting': 'backup_export',
    'view-webmaster': 'manage_settings'
};

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

const getCurrentActor = () => {
    const user = auth.currentUser;
    if(!user) return { uid: 'anonymous', email: 'anonymous' };
    return {
        uid: user.uid || 'unknown',
        email: user.email || (user.isAnonymous ? 'anonymous' : 'unknown')
    };
};

const addAuditLog = async (action, entity, label, details = {}) => {
    try {
        const actor = getCurrentActor();
        await db.collection('audit_logs').add({
            action,
            entity,
            label: String(label || '-').slice(0, 180),
            details,
            actorUid: actor.uid,
            actorEmail: actor.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch(err) {
        console.warn('Audit log gagal disimpan:', err);
    }
};

const formatAuditTime = (value) => {
    const date = value && typeof value.toDate === 'function' ? value.toDate() : new Date();
    return `${appDateFormatter.format(date)} - ${getFormattedJakartaTime(date)} WIB`;
};

function renderAuditLog() {
    const list = document.getElementById('auditLogList');
    if(!list) return;

    if(!window.cachedAuditLogs.length) {
        list.innerHTML = '<div class="p-5 text-sm text-slate-400 text-center">Belum ada aktivitas tercatat.</div>';
        return;
    }

    const colorMap = {
        create: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        update: 'bg-blue-50 text-blue-700 border-blue-100',
        delete: 'bg-rose-50 text-rose-700 border-rose-100',
        config: 'bg-slate-50 text-slate-700 border-slate-100'
    };
    const iconMap = {
        anggota: 'ph-user',
        kas: 'ph-wallet',
        arsip: 'ph-folder',
        settings: 'ph-gear-six'
    };

    list.innerHTML = window.cachedAuditLogs.map((item) => {
        const badgeClass = colorMap[item.action] || 'bg-slate-50 text-slate-700 border-slate-100';
        const icon = iconMap[item.entity] || 'ph-activity';
        return `<div class="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
            <div class="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <i class="ph-bold ${icon} text-lg"></i>
            </div>
            <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2 mb-1">
                    <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border rounded ${badgeClass}">${escapeHtml(item.action || '-')}</span>
                    <span class="text-xs text-slate-400">${escapeHtml(formatAuditTime(item.timestamp))}</span>
                </div>
                <p class="text-sm font-bold text-slate-800">${escapeHtml(item.label || '-')}</p>
                <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(item.actorEmail || 'unknown')}</p>
            </div>
        </div>`;
    }).join('');
}

function sinkronAuditRealtime() {
    if(unsubscribeAudit) unsubscribeAudit();
    unsubscribeAudit = db.collection('audit_logs')
        .orderBy('timestamp', 'desc')
        .limit(8)
        .onSnapshot((snapshot) => {
            window.cachedAuditLogs = [];
            snapshot.forEach((doc) => window.cachedAuditLogs.push({ id: doc.id, ...doc.data() }));
            renderAuditLog();
        }, (error) => {
            console.warn('Audit log tidak dapat disinkronkan:', error);
            renderAuditLog();
        });
}

function getRecentArchive() {
    const rows = Object.entries(window.cachedArsipData || {}).map(([id, row]) => ({ id, ...row }));
    rows.sort((a, b) => new Date(b.tanggal || 0) - new Date(a.tanggal || 0));
    return rows[0] || null;
}

function getMonthlyTrend(rows = window.cachedKasData || []) {
    const now = new Date();
    const months = [];
    for(let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.push({
            key,
            label: date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
            masuk: 0,
            keluar: 0
        });
    }

    rows.forEach((row) => {
        const key = String(row.tanggal || '').slice(0, 7);
        const target = months.find((month) => month.key === key);
        if(!target) return;
        if(row.jenis === 'Pemasukan') target.masuk += Number(row.nominal || 0);
        if(row.jenis === 'Pengeluaran') target.keluar += Number(row.nominal || 0);
    });

    return months;
}

function updateDashboardSummary() {
    const anggota = Object.values(window.cachedAnggotaData || {});
    const arsip = Object.values(window.cachedArsipData || {});
    const kas = window.cachedKasData || [];
    const currentMonth = getJakartaDateInputValue().slice(0, 7);
    const kasBulanIni = kas.filter((row) => String(row.tanggal || '').startsWith(currentMonth));
    const masukBulanIni = kasBulanIni.filter((row) => row.jenis === 'Pemasukan').reduce((sum, row) => sum + Number(row.nominal || 0), 0);
    const keluarBulanIni = kasBulanIni.filter((row) => row.jenis === 'Pengeluaran').reduce((sum, row) => sum + Number(row.nominal || 0), 0);
    const suratTerbaru = getRecentArchive();
    const lpjRows = kas.filter((row) => row.sumberDana === 'kampus' || row.sumberDana === 'campuran');
    const deadline = new Date();
    deadline.setDate(10);
    if(new Date().getDate() > 10) deadline.setMonth(deadline.getMonth() + 1);

    setText('dash-anggota-aktif', anggota.length);
    setText('dash-kas-bulan-ini', formatRp(masukBulanIni - keluarBulanIni));
    setText('dash-surat-terbaru', suratTerbaru ? `${suratTerbaru.jenis || 'Surat'} - ${suratTerbaru.nomor || suratTerbaru.perihal || '-'}` : 'Belum ada surat');
    setText('dash-deadline-lpj', appDateFormatter.format(deadline));
    setText('dash-arsip-terbaru', suratTerbaru ? (suratTerbaru.perihal || suratTerbaru.pihak || '-') : 'Belum ada arsip');
    setText('dash-total-arsip', arsip.length);
    setText('dash-lpj-count', lpjRows.length);

    if(chartInstance) {
        const trend = getMonthlyTrend(kas);
        chartInstance.data.labels = trend.map((item) => item.label);
        chartInstance.data.datasets[0].data = trend.map((item) => item.masuk);
        chartInstance.data.datasets[1].data = trend.map((item) => item.keluar);
        chartInstance.update();
        window.updateDashboardChartState();
    }
}

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
    const requiredPermission = VIEW_PERMISSIONS[viewId];
    if(requiredPermission && !hasPermission(requiredPermission) && !(requiredPermission === 'backup_export' && hasPermission('backup_restore'))) {
        window.showToast('Akses Ditolak', 'Role Anda tidak memiliki akses ke fitur ini.', 'error');
        viewId = 'view-dashboard';
        element = document.querySelector('.sidebar-menu[onclick*="view-dashboard"]');
        isSubmenu = false;
    }

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
        if(!user.isAnonymous && Object.keys(window.appConfig.roles || {}).length === 0) {
            window.currentUserRole = 'webmaster';
            window.currentUserRoleLabel = 'Webmaster';
            applyRoleAccess();
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
        sinkronAuditRealtime();
        
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
            if(unsubscribeAudit) unsubscribeAudit();
            window.currentUserRole = 'viewer';
            window.currentUserRoleLabel = 'Viewer';
            applyRoleAccess();
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
            window.appConfig.roles = data.roles || {};
            updateCurrentRole();

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
            renderRoleManager();

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
    if(!requirePermission('manage_settings', 'Hanya Webmaster yang dapat menyimpan pengaturan sistem.')) return;
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
        await addAuditLog('config', 'settings', 'Memperbarui konfigurasi utama sistem', { namaInstansi: payload.namaInstansi, judulWebsite: payload.judulWebsite });
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

function renderRoleManager() {
    const list = document.getElementById('roleManagerList');
    if(!list) return;
    setText('currentFirebaseUid', auth.currentUser ? auth.currentUser.uid : '-');

    const roles = window.appConfig.roles || {};
    const entries = Object.entries(roles);
    if(!entries.length) {
        list.innerHTML = '<div class="p-4 text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-lg">Belum ada role tersimpan. User login saat ini diperlakukan sebagai Webmaster awal sampai role disimpan.</div>';
        return;
    }

    list.innerHTML = entries.map(([uid, role]) => `<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-slate-200 rounded-lg bg-white">
        <div class="min-w-0">
            <p class="text-xs font-black text-slate-700 uppercase">${escapeHtml(getRoleLabel(role))}</p>
            <p class="text-[11px] text-slate-500 break-all">${escapeHtml(uid)}</p>
        </div>
        <button type="button" onclick="window.removeUserRole(${JSON.stringify(uid)})" data-permission="manage_roles" class="bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 rounded text-xs font-bold transition-colors">Hapus</button>
    </div>`).join('');
    applyRoleAccess();
}

window.saveUserRole = async (e) => {
    e.preventDefault();
    if(!requirePermission('manage_roles', 'Hanya Webmaster yang dapat mengatur role pengguna.')) return;

    const uid = getInputValue('role-user-uid').trim();
    const role = getInputValue('role-user-role');
    if(!uid || !ROLE_PERMISSIONS[role]) {
        window.showToast('Data Belum Lengkap', 'UID pengguna dan role wajib diisi.', 'error');
        return;
    }

    const roles = { ...(window.appConfig.roles || {}), [uid]: role };
    const currentUid = auth.currentUser && auth.currentUser.uid;
    if(currentUid && Object.keys(window.appConfig.roles || {}).length === 0 && !roles[currentUid]) {
        roles[currentUid] = 'webmaster';
    }
    try {
        await db.collection('settings').doc('webmaster').set({ roles }, { merge: true });
        await addAuditLog('config', 'settings', `Mengatur role ${getRoleLabel(role)}`, { uid, role });
        setInputValue('role-user-uid', '');
        window.showToast('Role Disimpan', 'Hak akses pengguna berhasil diperbarui.', 'success');
    } catch(err) {
        window.showToast('Gagal', 'Role pengguna gagal disimpan.', 'error');
    }
};

window.removeUserRole = async (uid) => {
    if(!requirePermission('manage_roles', 'Hanya Webmaster yang dapat menghapus role pengguna.')) return;
    const roles = { ...(window.appConfig.roles || {}) };
    delete roles[uid];
    try {
        await db.collection('settings').doc('webmaster').set({ roles }, { merge: true });
        await addAuditLog('config', 'settings', 'Menghapus role pengguna', { uid });
        window.showToast('Role Dihapus', 'Hak akses pengguna telah dihapus.', 'success');
    } catch(err) {
        window.showToast('Gagal', 'Role pengguna gagal dihapus.', 'error');
    }
};

window.saveCetakConfig = async (e) => {
    e.preventDefault();
    if(!requirePermission('manage_settings', 'Hanya Webmaster yang dapat menyimpan pengaturan cetak.')) return;
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
        await addAuditLog('config', 'settings', 'Memperbarui pengaturan cetak dokumen', { nomorSurat: payload.nomorSurat });
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
    if(!requirePermission('manage_members', 'Role Anda tidak dapat menambah anggota.')) return;
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
    if(!requirePermission('manage_members', 'Role Anda tidak dapat menyimpan data anggota.')) return;
    const btn = e.target.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.innerHTML = 'Menyimpan...';
    btn.disabled = true;
    try {
        let payload = {
            nim: document.getElementById('anggota-nim').value.trim(),
            nama: document.getElementById('anggota-nama').value.trim(),
            tempat_lahir: document.getElementById('anggota-tempat-lahir').value,
            tgl_lahir: document.getElementById('anggota-tgl-lahir').value,
            jk: document.getElementById('anggota-jk').value,
            alamat: document.getElementById('anggota-alamat').value.trim(),
            prodi: document.getElementById('anggota-prodi').value.trim(),
            email: document.getElementById('anggota-email').value.trim(),
            wa: document.getElementById('anggota-wa').value.trim(),
            divisi: document.getElementById('anggota-divisi').value,
            angkatan: document.getElementById('anggota-angkatan').value.trim(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        if(!payload.nim || !payload.nama || !payload.jk || !payload.tempat_lahir || !isValidDateInput(payload.tgl_lahir) || !payload.alamat) {
            window.showToast('Data Belum Lengkap', 'NIM, nama, jenis kelamin, tempat/tanggal lahir, dan alamat wajib valid.', 'error');
            return;
        }

        const normalizedNim = payload.nim.toLowerCase();
        const duplicateId = Object.keys(window.cachedAnggotaData || {}).find((id) => {
            if(currentEditAnggotaId && id === currentEditAnggotaId) return false;
            return String(window.cachedAnggotaData[id].nim || '').trim().toLowerCase() === normalizedNim;
        });

        if(duplicateId) {
            window.showToast('NIM Duplikat', 'NIM tersebut sudah terdaftar di database anggota.', 'error');
            return;
        }

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
            await addAuditLog('update', 'anggota', `Memperbarui biodata ${payload.nama || payload.nim}`, { id: currentEditAnggotaId, nim: payload.nim });
            window.showToast('Biodata Diperbarui', 'Perubahan data anggota berhasil disimpan.', 'success');
        } else {
            const docRef = await db.collection("anggota_organisasi").add(payload);
            await addAuditLog('create', 'anggota', `Menambahkan anggota ${payload.nama || payload.nim}`, { id: docRef.id, nim: payload.nim });
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
    if(!requirePermission('manage_members', 'Role Anda tidak dapat mengedit anggota.')) return;
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
    if(!requirePermission('delete_members', 'Role Anda tidak dapat menghapus anggota.')) return;
    const data = window.cachedAnggotaData[id];
    const nama = data ? data.nama : "anggota ini";
    window.customConfirm(`TINDAKAN PERMANEN:\nYakin ingin menghapus seluruh biodata ${nama}?`, async () => {
        try {
            await db.collection("anggota_organisasi").doc(id).delete();
            await addAuditLog('delete', 'anggota', `Menghapus anggota ${nama}`, { id, nim: data ? data.nim : '' });
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
    
    const btnEdit = document.getElementById('btn-edit-detail');
    if(btnEdit) {
        btnEdit.classList.toggle('hidden', !hasPermission('manage_members'));
        btnEdit.onclick = () => {
            if(requirePermission('manage_members', 'Role Anda tidak dapat mengedit anggota.')) window.open(window.location.pathname + `?edit=${id}`, '_blank');
        };
    }
    const btnHapus = document.getElementById('btn-hapus-detail');
    if(btnHapus) {
        btnHapus.classList.toggle('hidden', !hasPermission('delete_members'));
        btnHapus.onclick = () => {
            if(!requirePermission('delete_members', 'Role Anda tidak dapat menghapus anggota.')) return;
            window.customConfirm(`TINDAKAN PERMANEN:\nYakin ingin menghapus seluruh biodata ${data.nama}?`, async () => {
                try {
                    await db.collection("anggota_organisasi").doc(id).delete();
                    await addAuditLog('delete', 'anggota', `Menghapus anggota ${data.nama || data.nim}`, { id, nim: data.nim || '' });
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
        updateDashboardSummary();
        
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
                    <button data-permission="manage_members" onclick="window.editAnggota(${safeRId})" class="bg-[#00a65a] hover:bg-green-700 text-white w-6 h-6 rounded-sm shadow-sm inline-flex items-center justify-center mr-1 transition-colors" title="Edit Anggota"><i class="ph-bold ph-pencil-simple"></i></button>
                    <button data-permission="delete_members" onclick="window.hapusAnggota(${safeRId})" class="bg-[#dd4b39] hover:bg-red-700 text-white w-6 h-6 rounded-sm shadow-sm inline-flex items-center justify-center transition-colors" title="Hapus"><i class="ph-bold ph-x"></i></button>
                </td>
            </tr>`;
        }
    });

    if(tbody) tbody.innerHTML = displayedCount === 0 ? `<tr><td colspan="7" class="text-center py-8 text-slate-400 font-medium">Tidak ada data yang sesuai dengan pencarian/filter.</td></tr>` : htmlTable;

    const tabelInfo = document.getElementById('tableInfo');
    if(tabelInfo) tabelInfo.innerText = `Menampilkan ${displayedCount > 0 ? 1 : 0} s/d ${displayedCount} dari ${total} Entri Data`;
    const tabelJumlah = document.getElementById('tabel-jumlah');
    if(tabelJumlah) tabelJumlah.innerText = displayedCount;
    applyRoleAccess();
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
    if(!requirePermission('manage_finance', 'Role Anda tidak dapat mencatat kas masuk.')) { btn.innerText = ori; btn.disabled = false; return; }
    try { 
        const nominal = parseCurrencyNumber(document.getElementById('nomPembayaran').value);
        const payload = {
            tanggal: document.getElementById('tglPembayaran').value,
            jenis: 'Pemasukan',
            sumberDana: document.getElementById('sumberDanaPembayaran').value,
            kategori: document.getElementById('kategoriPembayaran').value.trim(),
            keterangan: document.getElementById('ketPembayaran').value.trim(),
            nominal,
            timestamp: firebase.firestore.FieldValue.serverTimestamp() 
        };
        if(!isValidDateInput(payload.tanggal) || !payload.sumberDana || !payload.kategori || !payload.keterangan || !Number.isFinite(payload.nominal) || payload.nominal <= 0) {
            window.showToast('Data Tidak Valid', 'Tanggal, sumber dana, kategori, keterangan, dan nominal positif wajib diisi.', 'error');
            return;
        }
        const docRef = await db.collection("kas_organisasi").add(payload);
        await addAuditLog('create', 'kas', `Mencatat kas masuk ${formatRp(payload.nominal)}`, { id: docRef.id, sumberDana: payload.sumberDana, kategori: payload.kategori });
        document.getElementById('formInputPembayaran').reset(); 
        setInputToJakartaToday('tglPembayaran');
        window.showToast('Sukses', 'Arus kas masuk dicatat.', 'success'); 
    } 
    catch (err) { window.showToast('Gagal', 'Sistem gagal menyimpan.', 'error'); } 
    finally { btn.innerText = ori; btn.disabled = false; }
};

window.simpanPengeluaran = async (e) => {
    e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const ori = btn.innerText; btn.innerText = 'Merekam...'; btn.disabled = true;
    if(!requirePermission('manage_finance', 'Role Anda tidak dapat mencatat kas keluar.')) { btn.innerText = ori; btn.disabled = false; return; }
    try {
        const sumber = document.getElementById('sumberDanaPengeluaran').value;
        const totalNominal = parseCurrencyNumber(document.getElementById('nomPengeluaran').value);
        const nominalKampus = sumber === 'campuran' ? parseCurrencyNumber(document.getElementById('nomCampuranKampus').value) : 0;
        const nominalOrganisasi = sumber === 'campuran' ? parseCurrencyNumber(document.getElementById('nomCampuranOrganisasi').value) : 0;

        if(!isValidDateInput(document.getElementById('tglPengeluaran').value) || !sumber || !document.getElementById('kategoriPengeluaranForm').value.trim() || !document.getElementById('ketPengeluaran').value.trim() || !Number.isFinite(totalNominal) || totalNominal <= 0) {
            window.showToast('Data Tidak Valid', 'Tanggal, sumber dana, kategori, keterangan, dan nominal positif wajib diisi.', 'error');
            return;
        }

        if (sumber === 'campuran' && (!Number.isFinite(nominalKampus) || !Number.isFinite(nominalOrganisasi) || nominalKampus < 0 || nominalOrganisasi < 0)) {
            window.showToast('Data Tidak Valid', 'Rincian dana campuran tidak boleh kosong atau minus.', 'error');
            return;
        }

        if (sumber === 'campuran' && (nominalKampus + nominalOrganisasi) !== totalNominal) {
            window.showToast('Gagal', 'Total nominal campuran harus sama dengan jumlah rincian kampus dan organisasi.', 'error');
            throw new Error('Total campuran tidak cocok');
        }

        const payload = {
            tanggal: document.getElementById('tglPengeluaran').value,
            jenis: 'Pengeluaran',
            sumberDana: sumber,
            kategori: document.getElementById('kategoriPengeluaranForm').value.trim(),
            keterangan: document.getElementById('ketPengeluaran').value.trim(),
            nominal: totalNominal,
            nominalKampus,
            nominalOrganisasi,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        const docRef = await db.collection("kas_organisasi").add(payload);
        await addAuditLog('create', 'kas', `Mencatat kas keluar ${formatRp(payload.nominal)}`, { id: docRef.id, sumberDana: payload.sumberDana, kategori: payload.kategori });

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
    if(!requirePermission('delete_finance', 'Role Anda tidak dapat menghapus transaksi kas.')) return;
    window.customConfirm(`Tindakan Permanen:\nYakin hapus transaksi kas:\n"${ket}" ?`, async () => {
        try {
            await db.collection("kas_organisasi").doc(id).delete();
            await addAuditLog('delete', 'kas', `Menghapus transaksi kas: ${ket || id}`, { id });
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

        window.renderTabelKas();
        window.renderLPJKampus();
        updateDashboardSummary();
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
                    <button data-permission="manage_finance" onclick="window.bukaEditTransaksi(${safeRId})" class="bg-amber-100 text-amber-600 hover:bg-amber-500 hover:text-white p-1.5 rounded transition-colors" title="Edit Transaksi"><i class="ph-bold ph-pencil-simple"></i></button>
                    <button data-permission="delete_finance" onclick="window.hapusKas(${safeRId}, ${JSON.stringify(r.keterangan || '')})" class="bg-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white p-1.5 rounded transition-colors" title="Hapus Transaksi"><i class="ph-bold ph-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }

    if(tbody) tbody.innerHTML = count === 0 ? '<tr><td colspan="6" class="text-center py-12 text-slate-400 font-medium">Data transaksi tidak ditemukan / kosong.</td></tr>' : htmlTable;
    if(document.getElementById('infoTabelKas')) document.getElementById('infoTabelKas').innerText = `Menampilkan ${count} Transaksi`;
    applyRoleAccess();
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
    const total = chartInstance.data.datasets.reduce((sum, ds) => sum + ds.data.reduce((itemSum, value) => itemSum + Number(value || 0), 0), 0);
    empty.classList.toggle('hidden', total > 0);
};

window.bukaEditTransaksi = (id) => {
    if(!requirePermission('manage_finance', 'Role Anda tidak dapat mengedit transaksi kas.')) return;
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
    if(!requirePermission('manage_finance', 'Role Anda tidak dapat mengedit transaksi kas.')) return;
    const id = getInputValue('edit-transaksi-id');
    if(!id) return;

    const jenis = getInputValue('edit-jenis');
    const sumberDana = getInputValue('edit-sumber-dana');
    const nominal = parseCurrencyNumber(getInputValue('edit-nominal'));
    const nominalKampus = sumberDana === 'campuran' ? parseCurrencyNumber(getInputValue('edit-nominal-kampus')) : 0;
    const nominalOrganisasi = sumberDana === 'campuran' ? parseCurrencyNumber(getInputValue('edit-nominal-organisasi')) : 0;

    if(!isValidDateInput(getInputValue('edit-tanggal')) || !jenis || !sumberDana || !getInputValue('edit-kategori').trim() || !getInputValue('edit-keterangan').trim() || !Number.isFinite(nominal) || nominal <= 0) {
        window.showToast('Data Tidak Valid', 'Tanggal, kategori, keterangan, dan nominal positif wajib diisi.', 'error');
        return;
    }

    if(jenis === 'Pengeluaran' && sumberDana === 'campuran' && (!Number.isFinite(nominalKampus) || !Number.isFinite(nominalOrganisasi) || nominalKampus < 0 || nominalOrganisasi < 0)) {
        window.showToast('Data Tidak Valid', 'Rincian dana campuran tidak boleh kosong atau minus.', 'error');
        return;
    }

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
        await addAuditLog('update', 'kas', `Memperbarui transaksi kas: ${getInputValue('edit-keterangan') || id}`, { id, jenis, sumberDana, nominal });
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

const serializeFirestoreValue = (value) => {
    if(value && typeof value.toDate === 'function') return value.toDate().toISOString();
    if(Array.isArray(value)) return value.map(serializeFirestoreValue);
    if(value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeFirestoreValue(item)]));
    }
    return value;
};

window.downloadFullBackup = async () => {
    if(!requirePermission('backup_export', 'Role Anda tidak dapat mengunduh backup data.')) return;

    const backup = {
        meta: {
            app: 'e-Sistem LPM MAKHIBRA',
            exportedAt: new Date().toISOString(),
            exportedBy: getCurrentActor()
        },
        anggota_organisasi: Object.entries(window.cachedAnggotaData || {}).map(([id, row]) => ({ id, ...serializeFirestoreValue(row) })),
        kas_organisasi: (window.cachedKasData || []).map((row) => serializeFirestoreValue(row)),
        arsip_surat: Object.entries(window.cachedArsipData || {}).map(([id, row]) => ({ id, ...serializeFirestoreValue(row) })),
        settings: serializeFirestoreValue(window.appConfig)
    };

    downloadTextFile(`backup-e-sistem-${getJakartaDateInputValue()}.json`, JSON.stringify(backup, null, 2), 'application/json;charset=utf-8;');
    await addAuditLog('config', 'settings', 'Mengunduh backup penuh sistem', { anggota: backup.anggota_organisasi.length, kas: backup.kas_organisasi.length, arsip: backup.arsip_surat.length });
    window.showToast('Backup Berhasil', 'File backup JSON lengkap berhasil diunduh.', 'success');
};

const cleanImportedRow = (row, allowedKeys) => {
    const result = {};
    allowedKeys.forEach((key) => {
        if(row[key] !== undefined) result[key] = row[key];
    });
    return result;
};

const writeBackupCollection = async (collectionName, rows, allowedKeys, batchLimit = 400) => {
    let batch = db.batch();
    let count = 0;
    let total = 0;
    for(const row of rows || []) {
        const id = String(row.id || '').trim();
        const clean = cleanImportedRow(row, allowedKeys);
        clean.restoredAt = firebase.firestore.FieldValue.serverTimestamp();
        const ref = id ? db.collection(collectionName).doc(id) : db.collection(collectionName).doc();
        batch.set(ref, clean, { merge: true });
        count++;
        total++;
        if(count >= batchLimit) {
            await batch.commit();
            batch = db.batch();
            count = 0;
        }
    }
    if(count) await batch.commit();
    return total;
};

window.restoreFullBackup = async () => {
    if(!requirePermission('backup_restore', 'Hanya Webmaster yang dapat melakukan restore backup.')) return;
    const input = document.getElementById('backupRestoreFile');
    if(!input || !input.files || !input.files[0]) {
        window.showToast('File Belum Dipilih', 'Pilih file backup JSON terlebih dahulu.', 'error');
        return;
    }

    const file = input.files[0];
    if(file.type && file.type !== 'application/json') {
        window.showToast('Format Ditolak', 'Restore hanya menerima file JSON hasil backup sistem.', 'error');
        return;
    }

    try {
        const text = await file.text();
        const backup = JSON.parse(text);
        if(!backup || !Array.isArray(backup.anggota_organisasi) || !Array.isArray(backup.kas_organisasi) || !Array.isArray(backup.arsip_surat)) {
            window.showToast('Backup Tidak Valid', 'Struktur file backup tidak dikenali.', 'error');
            return;
        }

        window.customConfirm('Restore akan menimpa/menambahkan data dari file backup ke Firebase. Lanjutkan?', async () => {
            try {
                const anggotaCount = await writeBackupCollection('anggota_organisasi', backup.anggota_organisasi, ['nim', 'nama', 'tempat_lahir', 'tgl_lahir', 'jk', 'alamat', 'prodi', 'email', 'wa', 'divisi', 'angkatan', 'foto']);
                const kasCount = await writeBackupCollection('kas_organisasi', backup.kas_organisasi, ['tanggal', 'jenis', 'sumberDana', 'kategori', 'keterangan', 'nominal', 'nominalKampus', 'nominalOrganisasi']);
                const arsipCount = await writeBackupCollection('arsip_surat', backup.arsip_surat, ['jenis', 'tanggal', 'nomor', 'pihak', 'perihal', 'fileData', 'fileType']);
                await addAuditLog('config', 'settings', 'Restore backup sistem', { anggota: anggotaCount, kas: kasCount, arsip: arsipCount });
                input.value = '';
                window.showToast('Restore Selesai', 'Backup berhasil dipulihkan ke database.', 'success');
            } catch(err) {
                window.showToast('Restore Gagal', 'Data backup gagal dipulihkan.', 'error');
            }
        });
    } catch(err) {
        window.showToast('Backup Tidak Valid', 'File JSON tidak dapat dibaca.', 'error');
    }
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
    if(!requirePermission('manage_archive', 'Role Anda tidak dapat menambah arsip.')) return;
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
    if(!SAFE_ARCHIVE_TYPES.includes(file.type)) {
        window.showToast("Format Ditolak", "Arsip hanya menerima PDF, PNG, JPG, atau JPEG.", "error"); btn.innerHTML = ori; btn.disabled = false; return;
    }

    try {
        const fileData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
        
        const payload = {
            jenis: document.getElementById('arsipJenis').value,
            tanggal: document.getElementById('arsipTanggal').value,
            nomor: document.getElementById('arsipNomor').value.trim(),
            pihak: document.getElementById('arsipPihak').value.trim(),
            perihal: document.getElementById('arsipPerihal').value.trim(),
            fileData: fileData,
            fileType: file.type,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        if(!payload.jenis || !isValidDateInput(payload.tanggal) || !payload.nomor || !payload.pihak || !payload.perihal) {
            window.showToast('Data Belum Lengkap', 'Jenis, tanggal, nomor, pihak, dan perihal arsip wajib diisi.', 'error');
            return;
        }
        const docRef = await db.collection("arsip_surat").add(payload);
        await addAuditLog('create', 'arsip', `Mengarsipkan ${payload.jenis}: ${payload.nomor || payload.perihal}`, { id: docRef.id, jenis: payload.jenis, nomor: payload.nomor });
        
        document.getElementById('formInputArsip').reset();
        window.showToast('Sukses', 'Dokumen Arsip berhasil di-upload ke Cloud.', 'success');
        window.switchView('view-arsip-surat');
    } catch (err) { window.showToast('Gagal', 'Terjadi kesalahan sistem upload.', 'error'); }
    finally { btn.innerHTML = ori; btn.disabled = false; }
};

window.hapusArsip = (id) => {
    if(!requirePermission('delete_archive', 'Role Anda tidak dapat menghapus arsip.')) return;
    window.customConfirm(`Yakin ingin menghapus arsip dokumen ini selamanya?`, async () => {
        try {
            await db.collection("arsip_surat").doc(id).delete();
            await addAuditLog('delete', 'arsip', `Menghapus arsip surat ${id}`, { id });
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
        updateDashboardSummary();
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
                        <button data-permission="delete_archive" onclick="window.hapusArsip(${safeRId})" class="bg-rose-100 hover:bg-rose-200 text-rose-600 p-1.5 rounded shadow-sm transition-colors"><i class="ph-bold ph-trash"></i></button>
                    </div>
                </td>
            </tr>`;
        }
    });

    tbody.innerHTML = count === 0 ? `<tr><td colspan="6" class="text-center py-10 text-slate-400 font-medium">Arsip surat tidak ditemukan.</td></tr>` : htmlTable;
    applyRoleAccess();
};


// ==========================================
// 8. FUNGSI INISIALISASI (saat halaman dimuat)
// ==========================================
function initCharts() {
    const ctxBar = document.getElementById('keuanganChart');
    if(ctxBar && !chartInstance) {
        const trend = getMonthlyTrend([]);
        chartInstance = new Chart(ctxBar, {
            type: 'bar',
            data: { labels: trend.map((item) => item.label), datasets: [{ label: 'Pemasukan', data: trend.map((item) => item.masuk), backgroundColor: '#3498db' }, { label: 'Pengeluaran', data: trend.map((item) => item.keluar), backgroundColor: '#e74c3c' }] },
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
