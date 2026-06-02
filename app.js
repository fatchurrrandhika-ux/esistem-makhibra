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

const tableState = {
    anggota: { page: 1, pageSize: 10, sortKey: 'nama', sortDir: 'asc' },
    kas: { page: 1, pageSize: 10, sortKey: 'tanggal', sortDir: 'desc' },
    arsip: { page: 1, pageSize: 10, sortKey: 'tanggal', sortDir: 'desc' }
};

const isMobileList = () => window.matchMedia && window.matchMedia('(max-width: 640px)').matches;

const compareValues = (a, b, dir = 'asc') => {
    const av = a === undefined || a === null ? '' : a;
    const bv = b === undefined || b === null ? '' : b;
    const result = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'id-ID', { numeric: true, sensitivity: 'base' });
    return dir === 'desc' ? -result : result;
};

const sortRows = (rows, key, dir) => rows.slice().sort((a, b) => compareValues(a[key], b[key], dir));

const paginateRows = (rows, state) => {
    const totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize));
    if(state.page > totalPages) state.page = totalPages;
    if(state.page < 1) state.page = 1;
    const start = (state.page - 1) * state.pageSize;
    return { rows: rows.slice(start, start + state.pageSize), totalPages, start };
};

const renderPagination = (id, tableName, count, totalPages) => {
    const el = document.getElementById(id);
    if(!el) return;
    const state = tableState[tableName];
    el.innerHTML = `<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
        <span>Halaman <b class="text-slate-700">${state.page}</b> dari <b class="text-slate-700">${totalPages}</b> - ${count} data</span>
        <div class="flex items-center gap-2">
            <button type="button" data-onclick="window.changeTablePage('${tableName}', -1)" class="px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-700 font-bold disabled:opacity-40" ${state.page <= 1 ? 'disabled' : ''}>Sebelumnya</button>
            <button type="button" data-onclick="window.changeTablePage('${tableName}', 1)" class="px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-700 font-bold disabled:opacity-40" ${state.page >= totalPages ? 'disabled' : ''}>Berikutnya</button>
        </div>
    </div>`;
};

window.changeTablePage = (tableName, delta) => {
    if(!tableState[tableName]) return;
    tableState[tableName].page += delta;
    if(tableName === 'anggota') window.renderTabelAnggota();
    if(tableName === 'kas') window.renderTabelKas();
    if(tableName === 'arsip') window.renderTabelArsip();
};

window.sortTable = (tableName, key) => {
    const state = tableState[tableName];
    if(!state) return;
    state.sortDir = state.sortKey === key && state.sortDir === 'asc' ? 'desc' : 'asc';
    state.sortKey = key;
    state.page = 1;
    if(tableName === 'anggota') window.renderTabelAnggota();
    if(tableName === 'kas') window.renderTabelKas();
    if(tableName === 'arsip') window.renderTabelArsip();
};

const emptyAction = (title, message, label, action, icon = 'ph-database') => `<div class="py-10 px-4 text-center">
    <div class="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center mb-3"><i class="ph-bold ${icon} text-2xl"></i></div>
    <p class="font-black text-slate-700">${escapeHtml(title)}</p>
    <p class="text-xs text-slate-500 mt-1 mb-4">${escapeHtml(message)}</p>
    ${label && action ? `<button type="button" data-onclick="${action}" class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors">${escapeHtml(label)}</button>` : ''}
</div>`;

function renderTableSkeleton(tbodyId, columns = 6, rows = 5) {
    const tbody = document.getElementById(tbodyId);
    if(!tbody || tbody.children.length) return;
    tbody.innerHTML = Array.from({ length: rows }).map(() => `<tr>${Array.from({ length: columns }).map(() => '<td class="p-3"><span class="skeleton-line"></span></td>').join('')}</tr>`).join('');
}

function renderInitialSkeletons() {
    renderTableSkeleton('tableAnggotaBody', 7, 6);
    renderTableSkeleton('tableBody', 6, 6);
    renderTableSkeleton('tabelBodyArsip', 6, 5);
}

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
    document.documentElement.classList.remove('route-public-mode', 'route-edit-mode', 'route-initial-mode');
    delete document.documentElement.dataset.initialRouteView;
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
    renderInternalNotifications({ anggota, arsip, kasBulanIni, lpjRows, keluarBulanIni });

    if(chartInstance) {
        const trend = getMonthlyTrend(kas);
        chartInstance.data.labels = trend.map((item) => item.label);
        chartInstance.data.datasets[0].data = trend.map((item) => item.masuk);
        chartInstance.data.datasets[1].data = trend.map((item) => item.keluar);
        chartInstance.update();
        window.updateDashboardChartState();
    }
}

function renderInternalNotifications({ anggota = [], arsip = [], kasBulanIni = [], lpjRows = [], keluarBulanIni = 0 } = {}) {
    const target = document.getElementById('internalNotificationList');
    if(!target) return;
    const items = [];
    const incompleteMembers = anggota.filter((row) => !row.email || !row.wa || !row.divisi || !row.angkatan);
    const largeExpense = (window.cachedKasData || []).filter((row) => row.jenis === 'Pengeluaran' && Number(row.nominal || 0) >= 1000000).slice(-3);
    if(incompleteMembers.length) items.push({ icon: 'ph-user-warning', title: 'Data anggota belum lengkap', body: `${incompleteMembers.length} anggota perlu dilengkapi email, WA, divisi, atau angkatan.`, color: 'amber' });
    if(largeExpense.length) items.push({ icon: 'ph-warning-circle', title: 'Kas keluar besar', body: `${largeExpense.length} transaksi pengeluaran besar perlu ditinjau bendahara.`, color: 'rose' });
    if(!lpjRows.length && keluarBulanIni > 0) items.push({ icon: 'ph-file-text', title: 'LPJ belum tersedia', body: 'Ada pengeluaran bulan ini, tetapi data LPJ kampus/campuran belum tercatat.', color: 'blue' });
    if(arsip.length) items.push({ icon: 'ph-folder-plus', title: 'Arsip terbaru tersedia', body: `${arsip.length} dokumen tersimpan di E-Arsip.`, color: 'emerald' });
    if(!items.length) {
        target.innerHTML = '<div class="p-4 text-sm text-slate-400 text-center">Tidak ada notifikasi internal saat ini.</div>';
        return;
    }
    const colorMap = {
        amber: 'bg-amber-50 text-amber-700',
        rose: 'bg-rose-50 text-rose-700',
        blue: 'bg-blue-50 text-blue-700',
        emerald: 'bg-emerald-50 text-emerald-700'
    };
    target.innerHTML = items.map((item) => `<div class="p-4 flex items-start gap-3 border-b border-slate-100 last:border-b-0">
        <div class="w-9 h-9 rounded-lg ${colorMap[item.color] || colorMap.blue} flex items-center justify-center shrink-0"><i class="ph-bold ${item.icon} text-lg"></i></div>
        <div><p class="text-sm font-black text-slate-800">${escapeHtml(item.title)}</p><p class="text-xs text-slate-500 mt-0.5">${escapeHtml(item.body)}</p></div>
    </div>`).join('');
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

const EVENT_ACTION_ALLOWLIST = new Set([
    'applySuratTemplate',
    'batalAnggota',
    'bukaEditTransaksi',
    'bukaFormTambah',
    'changeTablePage',
    'closeConfirmModal',
    'closeEditModal',
    'downloadCSVData',
    'downloadFullBackup',
    'editAnggota',
    'generateLPJ',
    'generateNomorSurat',
    'gantiTabAnggota',
    'gantiTabDetailView',
    'handleLoginSubmit',
    'handleLogout',
    'handleSimulatedDownload',
    'hapusAnggota',
    'hapusArsip',
    'hapusFooter',
    'hapusKas',
    'lihatDetailAnggota',
    'removeUserRole',
    'renderTabelAnggota',
    'renderTabelArsip',
    'renderTabelKas',
    'resetFilterTabel',
    'restoreFullBackup',
    'saveCetakConfig',
    'saveUserRole',
    'saveWebmasterConfig',
    'simpanAnggota',
    'simpanArsip',
    'simpanEditTransaksi',
    'simpanPembayaran',
    'simpanPengeluaran',
    'sortTable',
    'switchMenu',
    'switchView',
    'toggleSidebar',
    'toggleSubmenu',
    'updateCampuranTotal',
    'updateEditCampuranTotal',
    'updateEditKategori',
    'updateKategoriPembayaran',
    'updateKategoriPengeluaran',
    'updatePilihanFilter'
]);

function splitActionArgs(rawArgs) {
    const args = [];
    let current = '';
    let quote = '';
    let escapeNext = false;

    for(const char of rawArgs) {
        if(escapeNext) {
            current += char;
            escapeNext = false;
            continue;
        }
        if(char === '\\') {
            current += char;
            escapeNext = true;
            continue;
        }
        if(quote) {
            current += char;
            if(char === quote) quote = '';
            continue;
        }
        if(char === '"' || char === "'") {
            quote = char;
            current += char;
            continue;
        }
        if(char === ',') {
            args.push(current.trim());
            current = '';
            continue;
        }
        current += char;
    }

    if(current.trim()) args.push(current.trim());
    return args;
}

function parseActionArg(token, element, event) {
    const raw = String(token || '').trim();
    if(raw === 'this') return element;
    if(raw === 'event') return event;
    if(raw === 'true') return true;
    if(raw === 'false') return false;
    if(raw === 'null') return null;
    if(raw === 'undefined') return undefined;
    if(/^[-]?\d+(\.\d+)?$/.test(raw)) return Number(raw);
    if((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
        try {
            return JSON.parse(raw.startsWith("'") ? `"${raw.slice(1, -1).replace(/"/g, '\\"')}"` : raw);
        } catch(err) {
            return raw.slice(1, -1);
        }
    }
    return raw;
}

function runDataAction(actionText, element, event) {
    String(actionText || '').split(';').map((item) => item.trim()).filter(Boolean).forEach((statement) => {
        if(statement === 'event.preventDefault()') {
            event.preventDefault();
            return;
        }

        const match = statement.match(/^window\.([A-Za-z0-9_]+)\((.*)\)$/);
        if(!match) return;
        const fnName = match[1];
        if(!EVENT_ACTION_ALLOWLIST.has(fnName) || typeof window[fnName] !== 'function') return;
        const args = splitActionArgs(match[2]).map((arg) => parseActionArg(arg, element, event));
        window[fnName](...args);
    });
}

function bindDataEventDelegation() {
    document.addEventListener('click', (event) => {
        const target = event.target.closest('[data-onclick]');
        if(target) runDataAction(target.getAttribute('data-onclick'), target, event);
    });

    document.addEventListener('submit', (event) => {
        const target = event.target.closest('[data-onsubmit]');
        if(target) runDataAction(target.getAttribute('data-onsubmit'), target, event);
    });

    document.addEventListener('change', (event) => {
        const target = event.target.closest('[data-onchange]');
        if(target) runDataAction(target.getAttribute('data-onchange'), target, event);
    });

    document.addEventListener('keyup', (event) => {
        const target = event.target.closest('[data-onkeyup]');
        if(target) runDataAction(target.getAttribute('data-onkeyup'), target, event);
    });

    document.addEventListener('input', (event) => {
        const target = event.target.closest('[data-oninput]');
        if(target) runDataAction(target.getAttribute('data-oninput'), target, event);
    });
}

// ==========================================
// 4. SISTEM UI & NOTIFIKASI
// ==========================================
window.showToast = (title, message, type='success') => {
    const t = document.getElementById('toast');
    const icon = document.getElementById('toast-icon');
    document.getElementById('toast-title').innerText = title;
    document.getElementById('toast-message').innerText = message;
    t.classList.remove('toast-success', 'toast-error');
    if(type === 'error') {
        t.classList.add('toast-error');
        icon.innerHTML = '<div class="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600"><i class="ph-fill ph-warning-circle text-2xl"></i></div>';
    } else {
        t.classList.add('toast-success');
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

window.customConfirmTyped = (msg, expectedText, callback) => {
    const expected = String(expectedText || '').trim();
    if(!expected) {
        window.customConfirm(msg, callback);
        return;
    }
    const typed = window.prompt(`${msg}\n\nKetik persis: ${expected}`);
    if(typed === expected) {
        callback();
    } else if(typed !== null) {
        window.showToast('Konfirmasi Tidak Cocok', 'Tindakan dibatalkan karena teks konfirmasi tidak sesuai.', 'error');
    }
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
    if (urlParams.get('verify') || urlParams.get('verifyLetter') || urlParams.get('print')) {
        if(!user) {
            auth.signInAnonymously().catch(err => {
                if(urlParams.get('verify')) window.renderPublicVerification(urlParams.get('verify'));
                if(urlParams.get('verifyLetter')) window.renderPublicLetterVerification(urlParams.get('verifyLetter'));
                if(urlParams.get('print')) window.renderPrintView(urlParams.get('print'), urlParams.get('id'));
            });
            return;
        }
        if(urlParams.get('verify')) window.renderPublicVerification(urlParams.get('verify'));
        if(urlParams.get('verifyLetter')) window.renderPublicLetterVerification(urlParams.get('verifyLetter'));
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
            if(document.documentElement.classList.contains('route-initial-mode')) {
                loginView.classList.add('hidden'); 
            } else {
                loginView.classList.replace('opacity-100', 'opacity-0');
                setTimeout(() => {
                    loginView.classList.add('hidden');
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
                if(el.getAttribute('data-onclick') && el.getAttribute('data-onclick').includes(initialView)) {
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
            
            const loginWallpaper = document.getElementById('login-wallpaper-img');
            if(loginWallpaper) loginWallpaper.src = nWallpaper || 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&q=80&w=2000';
            
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
        <button type="button" data-onclick='window.removeUserRole(${JSON.stringify(uid)})' data-permission="manage_roles" class="bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 rounded text-xs font-bold transition-colors">Hapus</button>
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
        
        btn1.className = "member-tab member-tab-active";
        btn2.className = "member-tab";
    } else {
        cont1.classList.remove('block'); cont1.classList.add('hidden');
        cont2.classList.remove('hidden'); cont2.classList.add('block');
        
        btn2.className = "member-tab member-tab-active";
        btn1.className = "member-tab";
    }
};

window.gantiTabDetailView = (tabNum) => {
    const btn1 = document.getElementById('tab-detail-1');
    const btn2 = document.getElementById('tab-detail-2');
    const cont1 = document.getElementById('content-detail-1');
    const cont2 = document.getElementById('content-detail-2');

    if(!btn1 || !btn2 || !cont1 || !cont2) return;

    if(tabNum === 1) {
        cont1.classList.remove('hidden'); cont1.classList.add('block');
        cont2.classList.remove('block'); cont2.classList.add('hidden');
        
        btn1.className = "px-6 py-3 bg-white border-t-[3px] border-t-[#3c8dbc] border-r border-slate-200 text-[#3c8dbc] font-bold cursor-pointer transition-all -mb-px";
        btn2.className = "px-6 py-3 text-slate-500 font-medium hover:bg-slate-100 cursor-pointer transition-all border-r border-slate-200";
    } else {
        cont1.classList.remove('block'); cont1.classList.add('hidden');
        cont2.classList.remove('hidden'); cont2.classList.add('block');
        
        btn2.className = "px-6 py-3 bg-white border-t-[3px] border-t-[#3c8dbc] border-r border-slate-200 text-[#3c8dbc] font-bold cursor-pointer transition-all -mb-px";
        btn1.className = "px-6 py-3 text-slate-500 font-medium hover:bg-slate-100 cursor-pointer transition-all border-r border-slate-200";
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
    window.customConfirmTyped(`TINDAKAN PERMANEN:\nYakin ingin menghapus seluruh biodata ${nama}?`, data ? (data.nim || nama) : nama, async () => {
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
            window.customConfirmTyped(`TINDAKAN PERMANEN:\nYakin ingin menghapus seluruh biodata ${data.nama}?`, data.nim || data.nama, async () => {
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
    const elAngkatan = document.getElementById('filterAngkatanAnggota');
    
    const kat = elKat ? elKat.value : '';
    const val = elVal ? elVal.value : '';
    const search = elCari ? elCari.value.toLowerCase() : '';
    const angkatanFilter = elAngkatan ? elAngkatan.value.trim() : '';
    
    let tbody = document.getElementById('tableAnggotaBody');
    let htmlTable = '';
    let total = Object.keys(window.cachedAnggotaData).length;

    let dataArray = Object.keys(window.cachedAnggotaData).map(id => ({id, ...window.cachedAnggotaData[id]}));
    let filteredRows = [];

    dataArray.forEach(r => {
        let passFilter = true;
        
        if(kat === 'divisi' && val && r.divisi !== val) passFilter = false;
        if(kat === 'jk' && val && r.jk !== val) passFilter = false;
        if(kat === 'angkatan' && val && String(r.angkatan) !== val) passFilter = false;
        if(angkatanFilter && String(r.angkatan || '') !== angkatanFilter) passFilter = false;

        if(search) {
            let rowText = `${r.nim || ''} ${r.nama || ''} ${r.divisi || ''} ${r.angkatan || ''} ${r.alamat || ''}`.toLowerCase();
            if(!rowText.includes(search)) passFilter = false;
        }

        if(passFilter) filteredRows.push(r);
    });

    filteredRows = sortRows(filteredRows, tableState.anggota.sortKey, tableState.anggota.sortDir);
    const page = paginateRows(filteredRows, tableState.anggota);

    page.rows.forEach((r, index) => {
            const safeRNim = escapeHtml(r.nim || '-');
            const safeRName = escapeHtml(r.nama || '-');
            const safeRDivisi = escapeHtml(r.divisi || '-');
            const safeRAngkatan = escapeHtml(r.angkatan || '-');
            const safeRAlamat = escapeHtml(r.alamat || '-');
            const safeRId = JSON.stringify(String(r.id || ''));
            const avatarName = encodeURIComponent(r.nama || 'Anggota');
            const safeAvatar = escapeHtml(r.foto || `https://ui-avatars.com/api/?name=${avatarName}&size=128&background=0f172a&color=fff`);

            if(isMobileList()) {
                htmlTable += `<tr><td colspan="7" class="p-3 bg-slate-50">
                    <div class="member-mobile-card">
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex items-center gap-3 min-w-0">
                                <img src="${safeAvatar}" alt="" class="w-12 h-12 rounded-xl object-cover bg-slate-200 shrink-0">
                                <div class="min-w-0">
                                    <p class="text-sm font-black text-slate-900 uppercase truncate">${safeRName}</p>
                                    <p class="text-xs text-emerald-600 font-bold mt-0.5">${safeRNim}</p>
                                </div>
                            </div>
                            <span class="member-chip bg-slate-100 text-slate-700">${safeRAngkatan}</span>
                        </div>
                        <div class="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-500">
                            <span class="member-mobile-meta"><i class="ph-bold ph-briefcase"></i><b>${safeRDivisi}</b></span>
                            <span class="member-mobile-meta"><i class="ph-bold ph-map-pin"></i><b>${safeRAlamat}</b></span>
                        </div>
                        <div class="mt-4 flex gap-2 member-action-row">
                            <button type="button" data-onclick='window.lihatDetailAnggota(${safeRId})' class="member-card-btn member-action-detail" aria-label="Lihat detail ${safeRName}">
                                <i class="ph-bold ph-eye"></i><span>Detail</span>
                            </button>
                            <button type="button" data-permission="manage_members" data-onclick='window.editAnggota(${safeRId})' class="member-card-btn member-action-edit" aria-label="Edit ${safeRName}">
                                <i class="ph ph-pencil"></i><span>Edit</span>
                            </button>
                            <button type="button" data-permission="delete_members" data-onclick='window.hapusAnggota(${safeRId})' class="member-card-btn member-action-delete" aria-label="Hapus ${safeRName}">
                                <i class="ph ph-trash"></i><span>Hapus</span>
                            </button>
                        </div>
                    </div>
                </td></tr>`;
                return;
            }

            htmlTable += `<tr class="hover:bg-slate-50 transition-colors text-slate-700">
                <td class="p-3 border-b border-slate-100 text-slate-400 font-bold">${page.start + index + 1}</td>
                <td class="p-3 border-b border-slate-100 font-bold text-slate-700">${safeRNim}</td>
                <td class="p-3 border-b border-slate-100">
                    <button class="flex items-center gap-3 text-left group" data-onclick='window.lihatDetailAnggota(${safeRId})' title="Klik untuk lihat E-Profil">
                        <img src="${safeAvatar}" alt="" class="w-9 h-9 rounded-lg object-cover bg-slate-200 shrink-0">
                        <span class="uppercase font-black text-slate-800 group-hover:text-emerald-600">${safeRName}</span>
                    </button>
                </td>
                <td class="p-3 border-b border-slate-100 uppercase"><span class="member-chip bg-emerald-50 text-emerald-700">${safeRDivisi}</span></td>
                <td class="p-3 border-b border-slate-100"><span class="member-chip bg-slate-100 text-slate-700">${safeRAngkatan}</span></td>
                <td class="p-3 border-b border-slate-100 uppercase max-w-[280px] truncate">${safeRAlamat}</td>
                <td class="p-3 border-b border-slate-100">
                    <div class="member-action-row justify-center">
                        <button type="button" data-onclick='window.lihatDetailAnggota(${safeRId})' class="member-table-action member-action-detail" title="Lihat Detail" aria-label="Lihat detail ${safeRName}">
                            <i class="ph-bold ph-eye"></i><span>Detail</span>
                        </button>
                        <button type="button" data-permission="manage_members" data-onclick='window.editAnggota(${safeRId})' class="member-table-action member-action-edit" title="Edit Anggota" aria-label="Edit ${safeRName}">
                            <i class="ph ph-pencil"></i><span>Edit</span>
                        </button>
                        <button type="button" data-permission="delete_members" data-onclick='window.hapusAnggota(${safeRId})' class="member-table-action member-action-delete" title="Hapus Anggota" aria-label="Hapus ${safeRName}">
                            <i class="ph ph-trash"></i><span>Hapus</span>
                        </button>
                    </div>
                </td>
            </tr>`;
    });

    if(tbody) tbody.innerHTML = filteredRows.length === 0 ? `<tr><td colspan="7">${emptyAction('Belum ada anggota sesuai filter', 'Ubah filter pencarian atau tambahkan data anggota baru.', 'Tambah Anggota', 'window.bukaFormTambah()', 'ph-user-plus')}</td></tr>` : htmlTable;

    const tabelInfo = document.getElementById('tableInfo');
    if(tabelInfo) tabelInfo.innerText = `Menampilkan ${filteredRows.length ? page.start + 1 : 0} s/d ${Math.min(page.start + tableState.anggota.pageSize, filteredRows.length)} dari ${total} Entri Data`;
    const tabelJumlah = document.getElementById('tabel-jumlah');
    if(tabelJumlah) tabelJumlah.innerText = filteredRows.length;
    renderPagination('paginationAnggota', 'anggota', filteredRows.length, page.totalPages);
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

    tableState.anggota.page = 1;
    window.renderTabelAnggota();
};

window.resetFilterTabel = () => {
    setInputValue('filterKategori', '');
    setInputValue('filterAngkatanAnggota', '');
    const filterNilai = document.getElementById('filterNilai');
    if(filterNilai) filterNilai.innerHTML = '<option value="">- Pilih Kategori Terlebih Dahulu -</option>';
    setInputValue('pencarianTabel', '');
    tableState.anggota.page = 1;
    window.renderTabelAnggota();
};

window.populateAnggotaList = () => {
    const selectEl = document.getElementById('anggotaPembayar');
    if(!selectEl) return;
    
    const anggotaList = Object.entries(window.cachedAnggotaData || {})
        .map(([id, data]) => ({
            id,
            display: `${data.nama || 'N/A'} (${data.divisi || 'N/A'}) - ${data.nim || 'N/A'}`
        }))
        .sort((a, b) => a.display.localeCompare(b.display));
    
    selectEl.innerHTML = '<option value="">- Tidak ada anggota spesifik (Kolektif) -</option>' +
        anggotaList.map(a => `<option value="${a.id}">${a.display}</option>`).join('');
};

// ... (KODE MANAJEMEN KAS & KEUANGAN)
window.updateKategoriPembayaran = () => {
    const sumber = getInputValue('sumberDanaPembayaran');
    const anggotaField = document.getElementById('anggotaPembayarField');
    
    const kategoriBySumber = {
        'iuran_anggota': 'Iuran Rutin Anggota',
        'donasi': 'Donasi',
        'usaha': 'Hasil Usaha',
        'kampus': 'Dana Kampus',
        'lainnya': 'Lainnya'
    };
    
    setInputValue('kategoriPembayaran', kategoriBySumber[sumber] || '');
    
    // Show member selection field only for iuran_anggota
    if(anggotaField) {
        if(sumber === 'iuran_anggota') {
            anggotaField.classList.remove('hidden');
            window.populateAnggotaList();
        } else {
            anggotaField.classList.add('hidden');
            setInputValue('anggotaPembayar', '');
        }
    }
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
        const sumberDana = document.getElementById('sumberDanaPembayaran').value;
        const anggotaPembayarId = document.getElementById('anggotaPembayar')?.value || '';
        
        const payload = {
            tanggal: document.getElementById('tglPembayaran').value,
            jenis: 'Pemasukan',
            sumberDana: sumberDana,
            kategori: document.getElementById('kategoriPembayaran').value.trim(),
            keterangan: document.getElementById('ketPembayaran').value.trim(),
            nominal,
            timestamp: firebase.firestore.FieldValue.serverTimestamp() 
        };
        
        // Add member info if iuran_anggota
        if(sumberDana === 'iuran_anggota' && anggotaPembayarId) {
            const anggota = window.cachedAnggotaData[anggotaPembayarId];
            if(anggota) {
                payload.anggotaPembayarId = anggotaPembayarId;
                payload.anggotaPembayarNama = anggota.nama || '';
                payload.anggotaPembayarNim = anggota.nim || '';
            }
        }
        
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
    if(!ket) {
        const row = (window.cachedKasData || []).find((item) => item.id === id);
        ket = row ? (row.keterangan || row.kategori || id) : id;
    }
    window.customConfirmTyped(`Tindakan Permanen:\nYakin hapus transaksi kas:\n"${ket}" ?`, ket || id, async () => {
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
    const elMulai = document.getElementById('filterKasMulai');
    const elSelesai = document.getElementById('filterKasSelesai');
    const elSumber = document.getElementById('filterSumberKas');
    
    const fBulan = elBulan ? elBulan.value : '';
    const fTahun = elTahun ? elTahun.value : '';
    const cari = elCari ? elCari.value.toLowerCase() : '';
    const fMulai = elMulai ? elMulai.value : '';
    const fSelesai = elSelesai ? elSelesai.value : '';
    const fSumber = elSumber ? elSumber.value : '';
    const tbody = document.getElementById('tableBody');
    
    let htmlTable = '';
    let rows = [];

    for (let i = 0; i < window.cachedKasData.length; i++) {
        const r = window.cachedKasData[i];
        const parts = (r.tanggal || '').split('-');
        if(fTahun && parts[0] !== fTahun) continue;
        if(fBulan && parts[1] !== fBulan) continue;
        if(fMulai && String(r.tanggal || '') < fMulai) continue;
        if(fSelesai && String(r.tanggal || '') > fSelesai) continue;
        if(fSumber && r.sumberDana !== fSumber) continue;
        if(cari && !(r.keterangan || '').toLowerCase().includes(cari) && !(r.kategori || '').toLowerCase().includes(cari)) continue;
        rows.push(r);
    }

    rows = sortRows(rows, tableState.kas.sortKey, tableState.kas.sortDir);
    const page = paginateRows(rows, tableState.kas);

    page.rows.forEach((r) => {
        const isMasuk = r.jenis === 'Pemasukan';
        const nom = Number(r.nominal);
        const safeRTanggal = escapeHtml(r.tanggal || '');
        const safeRKeterangan = escapeHtml(r.keterangan || '-');
        const safeRKategori = escapeHtml(r.kategori || '-');
        const safeRSumber = escapeHtml(r.sumberDana || '-');
        const safeRId = JSON.stringify(String(r.id || ''));

        if(isMobileList()) {
            htmlTable += `<tr><td colspan="6" class="p-3 bg-slate-50">
                <div class="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <p class="text-sm font-black text-slate-800">${safeRKeterangan}</p>
                            <p class="text-xs text-slate-500 mt-0.5">${safeRTanggal} - ${safeRKategori}</p>
                        </div>
                        <span class="text-[10px] font-black uppercase px-2 py-1 rounded ${isMasuk ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}">${escapeHtml(r.jenis || '-')}</span>
                    </div>
                    <div class="mt-3 flex items-center justify-between text-xs">
                        <span class="text-slate-500">Sumber: <b class="text-slate-700">${safeRSumber}</b></span>
                        <span class="font-black ${isMasuk ? 'text-emerald-700' : 'text-rose-700'}">${formatRp(nom)}</span>
                    </div>
                    <div class="mt-4 flex gap-2">
                        <button data-permission="manage_finance" data-onclick='window.bukaEditTransaksi(${safeRId})' class="flex-1 bg-amber-50 text-amber-700 px-3 py-2 rounded font-bold text-xs">Edit</button>
                        <button data-permission="delete_finance" data-onclick='window.hapusKas(${safeRId})' class="flex-1 bg-rose-50 text-rose-700 px-3 py-2 rounded font-bold text-xs">Hapus</button>
                    </div>
                </div>
            </td></tr>`;
            return;
        }
        
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
                    <button data-permission="manage_finance" data-onclick='window.bukaEditTransaksi(${safeRId})' class="bg-amber-100 text-amber-600 hover:bg-amber-500 hover:text-white p-1.5 rounded transition-colors" title="Edit Transaksi"><i class="ph ph-pencil-simple"></i></button>
                    <button data-permission="delete_finance" data-onclick='window.hapusKas(${safeRId})' class="bg-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white p-1.5 rounded transition-colors" title="Hapus Transaksi"><i class="ph ph-trash"></i></button>
                </div>
            </td>
        </tr>`;
    });

    if(tbody) tbody.innerHTML = rows.length === 0 ? `<tr><td colspan="6">${emptyAction('Belum ada transaksi sesuai filter', 'Catat kas masuk atau ubah filter tanggal/sumber dana.', 'Catat Kas Masuk', "window.switchView('view-catat-transaksi')", 'ph-wallet')}</td></tr>` : htmlTable;
    if(document.getElementById('infoTabelKas')) document.getElementById('infoTabelKas').innerText = `Menampilkan ${rows.length} Transaksi`;
    renderPagination('paginationKas', 'kas', rows.length, page.totalPages);
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

const downloadTextFile = (filename, content, mime = 'application/vnd.ms-excel;charset=utf-8;') => {
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

const downloadExcelFile = (filename, title, headers, rows) => {
    const workbook = XLSX.utils.book_new();
    const fullHeaders = ['No', ...headers];
    
    const data = [
        [title],
        [],
        fullHeaders,
        ...rows.map((row, index) => [index + 1, ...row])
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Style header row (skip title and empty row)
    const headerRowIndex = 2;
    const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
    for (let C = headerRange.s.c; C <= headerRange.e.c; C++) {
        const address = XLSX.utils.encode_col(C) + (headerRowIndex + 1);
        if (!worksheet[address]) continue;
        worksheet[address].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "0F172A" } },
            alignment: { horizontal: "center", vertical: "center" }
        };
    }
    
    // Auto-fit column widths
    const colWidths = fullHeaders.map(h => Math.max(10, String(h).length + 2));
    worksheet['!cols'] = colWidths.map(w => ({ wch: w }));
    
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, filename);
};

const excelCell = (value) => escapeHtml(value ?? '');

const makeExcelTable = (title, headers, rows) => {
    const fullHeaders = ['No', ...headers];
    const headerHtml = fullHeaders.map((header) => `<th>${excelCell(header)}</th>`).join('');
    const rowHtml = rows.map((row, index) => {
        const cells = [index + 1, ...row].map((value) => `<td>${excelCell(value)}</td>`).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11pt; }
        th { background: #0f172a; color: #ffffff; font-weight: 700; text-align: center; }
        th, td { border: 1px solid #94a3b8; padding: 6px 8px; vertical-align: top; mso-number-format:"\\@"; }
        td:first-child { text-align: center; width: 42px; }
        .title { background: #ecfdf5; color: #064e3b; font-size: 14pt; text-align: left; }
    </style>
</head>
<body>
    <table>
        <thead>
            <tr><th class="title" colspan="${fullHeaders.length}">${excelCell(title)}</th></tr>
            <tr>${headerHtml}</tr>
        </thead>
        <tbody>
            ${rowHtml || `<tr><td colspan="${fullHeaders.length}" style="text-align:center;">Tidak ada data</td></tr>`}
        </tbody>
    </table>
</body>
</html>`;
};

window.downloadCSVData = (type) => {
    let filename = `${type || 'export'}-${getJakartaDateInputValue()}.xlsx`;
    let title = type || 'Export Data';
    let headers = [];
    let rows = [];

    if(type === 'Buku_Kas') {
        title = 'Buku Kas LPM MAKHIBRA';
        headers = ['Tanggal', 'Jenis', 'Sumber Dana', 'Kategori', 'Keterangan', 'Masuk', 'Keluar', 'Saldo'];
        rows = (window.cachedKasData || []).map((r) => {
            const isMasuk = r.jenis === 'Pemasukan';
            return [r.tanggal, r.jenis, r.sumberDana, r.kategori, r.keterangan, isMasuk ? r.nominal : '', isMasuk ? '' : r.nominal, r.saldoCalc];
        });
    } else {
        title = type === 'Data_Laki' ? 'Data Anggota Laki-laki'
            : type === 'Data_Perempuan' ? 'Data Anggota Perempuan'
            : type === 'Tabel_Anggota' ? 'Data Anggota Sesuai Filter'
            : 'Data Semua Anggota';
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

    downloadExcelFile(filename, title, headers, rows);
    window.showToast('Export Berhasil', `${rows.length} baris data Excel diunduh.`, 'success');
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
        </style></head><body>${bodyHtml}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
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

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const SURAT_TEMPLATE_CONFIG = {
    tugas: { code: 'ST', perihal: 'Surat Tugas', isi: 'Dengan hormat,\n\nSehubungan dengan kebutuhan pelaksanaan kegiatan kelembagaan, kami menugaskan pengurus LPM MAKHIBRA untuk melaksanakan tugas yang telah ditetapkan oleh organisasi.\n\nDemikian surat tugas ini dibuat agar dapat digunakan sebagaimana mestinya.' },
    undangan: { code: 'UND', perihal: 'Undangan Kegiatan', isi: 'Dengan hormat,\n\nSehubungan dengan akan dilaksanakannya kegiatan LPM MAKHIBRA, kami mengundang Bapak/Ibu/Saudara/i untuk hadir dan berpartisipasi dalam kegiatan tersebut.\n\nDemikian undangan ini kami sampaikan. Atas perhatian dan kehadirannya, kami ucapkan terima kasih.' },
    permohonan: { code: 'PRM', perihal: 'Permohonan', isi: 'Dengan hormat,\n\nMelalui surat ini, kami dari LPM MAKHIBRA bermaksud mengajukan permohonan dukungan/izin terkait kebutuhan kegiatan organisasi.\n\nDemikian permohonan ini kami sampaikan. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.' },
    peminjaman: { code: 'PJM', perihal: 'Permohonan Peminjaman Tempat', isi: 'Dengan hormat,\n\nSehubungan dengan kegiatan yang akan diselenggarakan oleh LPM MAKHIBRA, kami bermaksud mengajukan permohonan peminjaman tempat untuk menunjang kelancaran kegiatan tersebut.\n\nDemikian surat permohonan ini kami sampaikan. Atas perhatian dan izinnya, kami ucapkan terima kasih.' },
    lpj: { code: 'LPJ', perihal: 'Laporan Pertanggungjawaban Kegiatan', isi: 'Dengan hormat,\n\nBersama surat ini kami menyampaikan laporan pertanggungjawaban kegiatan LPM MAKHIBRA sebagai bentuk akuntabilitas pelaksanaan program kerja organisasi.\n\nDemikian laporan ini kami sampaikan. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.' }
};

window.applySuratTemplate = () => {
    const template = SURAT_TEMPLATE_CONFIG[getInputValue('gs-template')];
    if(!template) return;
    setInputValue('gs-perihal', template.perihal);
    setInputValue('gs-isi', template.isi);
    if(!getInputValue('gs-nomor')) window.generateNomorSurat();
};

window.generateNomorSurat = () => {
    const template = SURAT_TEMPLATE_CONFIG[getInputValue('gs-template')] || SURAT_TEMPLATE_CONFIG.permohonan;
    const dateRaw = getInputValue('gs-tanggal') || getJakartaDateInputValue();
    const date = new Date(`${dateRaw}T00:00:00`);
    const month = ROMAN_MONTHS[date.getMonth()] || ROMAN_MONTHS[new Date().getMonth()];
    const year = date.getFullYear();
    const monthlyDocs = Object.values(window.cachedArsipData || {}).filter((row) => String(row.tanggal || '').slice(0, 7) === dateRaw.slice(0, 7));
    setInputValue('gs-nomor', `${String(monthlyDocs.length + 1).padStart(3, '0')}/${template.code}/LPM-MAKHIBRA/${month}/${year}`);
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

    const verificationUrl = `${window.location.origin}${window.location.pathname}?verifyLetter=${encodeURIComponent(getInputValue('gs-nomor'))}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(verificationUrl)}`;
    const body = `<div class="kop">${window.appConfig.kopImg ? `<img src="${safeUrl(window.appConfig.kopImg)}">` : '<h2>LPM MAKHIBRA</h2>'}</div>
        <p>Nomor: ${escapeHtml(getInputValue('gs-nomor'))}<br>Lampiran: ${escapeHtml(getInputValue('gs-lampiran') || '-')}<br>Perihal: <strong>${escapeHtml(getInputValue('gs-perihal'))}</strong></p>
        <p>Kepada Yth.<br>${escapeHtml(getInputValue('gs-tujuan'))}<br>di ${escapeHtml(getInputValue('gs-alamat'))}</p>
        ${paragraphs}
        <p class="right">${escapeHtml(getInputValue('gs-tempat'))}, ${escapeHtml(getInputValue('gs-tanggal'))}</p>
        <div class="ttd">${sign(getInputValue('gs-jabatan-1'), getInputValue('gs-nama-1'), ttd1)}${sign(getInputValue('gs-jabatan-2'), getInputValue('gs-nama-2'), ttd2)}${sign(getInputValue('gs-jabatan-3'), getInputValue('gs-nama-3'), ttd3 || stempel)}</div>
        <div style="margin-top:24px;font-size:10px;color:#475569;display:flex;align-items:center;gap:10px"><img src="${qrUrl}" style="width:72px;height:72px"><span>QR verifikasi dokumen: ${escapeHtml(getInputValue('gs-nomor'))}<br>${escapeHtml(verificationUrl)}</span></div>`;
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

window.renderPublicLetterVerification = (nomor) => {
    const view = document.getElementById('view-public-verify');
    const content = document.getElementById('public-verify-content');
    if(view) {
        view.classList.remove('hidden');
        view.classList.add('flex');
    }
    if(!content) return;
    content.innerHTML = `<div class="text-center">
        <div class="w-20 h-20 rounded-2xl bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center mb-4"><i class="ph-fill ph-shield-check text-4xl"></i></div>
        <h3 class="text-xl font-black text-slate-800">Dokumen Terverifikasi</h3>
        <p class="text-sm text-slate-500 mt-2">Nomor surat ini dibuat melalui generator e-Sistem LPM MAKHIBRA.</p>
        <div class="mt-5 text-left text-sm bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p><strong>Nomor:</strong> ${escapeHtml(nomor || '-')}</p>
            <p><strong>Status:</strong> Valid secara format sistem</p>
            <p><strong>Waktu Cek:</strong> ${escapeHtml(appDateFormatter.format(new Date()))} ${escapeHtml(getFormattedJakartaTime(new Date()))} WIB</p>
        </div>
    </div>`;
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
            </style></head><body>${body}</body></html>`);
        document.close();
        setTimeout(() => window.print(), 300);
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
    window.customConfirmTyped(`Yakin ingin menghapus arsip dokumen ini selamanya?`, id, async () => {
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
    const elMulai = document.getElementById('filterArsipMulai');
    const elSelesai = document.getElementById('filterArsipSelesai');
    
    const filterJenis = elJenis ? elJenis.value : '';
    const search = elCari ? elCari.value.toLowerCase() : '';
    const fMulai = elMulai ? elMulai.value : '';
    const fSelesai = elSelesai ? elSelesai.value : '';
    const tbody = document.getElementById('tabelBodyArsip');
    if(!tbody) return;

    let htmlTable = '';
    let rows = [];
    let dataArray = Object.keys(window.cachedArsipData).map(id => ({id, ...window.cachedArsipData[id]}));

    dataArray.forEach(r => {
        let pass = true;
        if(filterJenis && r.jenis !== filterJenis) pass = false;
        if(fMulai && String(r.tanggal || '') < fMulai) pass = false;
        if(fSelesai && String(r.tanggal || '') > fSelesai) pass = false;
        if(search && !`${r.nomor || ''} ${r.perihal || ''} ${r.pihak || ''}`.toLowerCase().includes(search)) pass = false;
        if(pass) rows.push(r);
    });

    rows = sortRows(rows, tableState.arsip.sortKey, tableState.arsip.sortDir);
    const page = paginateRows(rows, tableState.arsip);

    page.rows.forEach((r, index) => {
            const badgeColor = r.jenis === 'Surat Masuk' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700';
            const iconColor = r.jenis === 'Surat Masuk' ? 'ph-download-simple' : 'ph-upload-simple';
            
            const safeRJenis = escapeHtml(r.jenis || '');
            const safeRNomor = escapeHtml(r.nomor || '');
            const safeRTanggal = escapeHtml(r.tanggal || '');
            const safeRPihak = escapeHtml(r.pihak || '');
            const safeRPerihal = escapeHtml(r.perihal || '');
            const safeRId = JSON.stringify(String(r.id || ''));

            if(isMobileList()) {
                htmlTable += `<tr><td colspan="6" class="p-3 bg-slate-50">
                    <div class="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                        <div class="flex items-start justify-between gap-3">
                            <div>
                                <p class="text-sm font-black text-slate-800">${safeRNomor}</p>
                                <p class="text-xs text-slate-500 mt-0.5">${safeRTanggal} - ${safeRPihak}</p>
                            </div>
                            <span class="px-2 py-1 rounded text-[10px] font-black ${badgeColor} uppercase">${safeRJenis}</span>
                        </div>
                        <p class="text-xs text-slate-600 mt-3">${safeRPerihal}</p>
                        <div class="mt-4 flex gap-2">
                            <button data-permission="delete_archive" data-onclick='window.hapusArsip(${safeRId})' class="flex-1 bg-rose-50 text-rose-700 px-3 py-2 rounded font-bold text-xs">Hapus</button>
                        </div>
                    </div>
                </td></tr>`;
                return;
            }

            htmlTable += `<tr class="hover:bg-slate-50 border-b border-slate-100">
                <td class="px-5 py-4 text-slate-500">${page.start + index + 1}</td>
                <td class="px-5 py-4"><span class="px-2.5 py-1 rounded text-[11px] font-bold ${badgeColor} uppercase tracking-wider flex items-center gap-1 w-max"><i class="ph-bold ${iconColor}"></i> ${safeRJenis}</span></td>
                <td class="px-5 py-4">
                    <p class="font-bold text-slate-800">${safeRNomor}</p>
                    <p class="text-xs text-slate-500 mt-0.5">${safeRTanggal}</p>
                </td>
                <td class="px-5 py-4 font-medium text-slate-700 uppercase">${safeRPihak}</td>
                <td class="px-5 py-4 text-slate-600 truncate max-w-[200px]">${safeRPerihal}</td>
                <td class="px-5 py-4 text-center">
                    <div class="flex justify-center gap-1">
                        <button data-permission="delete_archive" data-onclick='window.hapusArsip(${safeRId})' class="bg-rose-100 hover:bg-rose-200 text-rose-600 p-1.5 rounded shadow-sm transition-colors"><i class="ph ph-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    });

    tbody.innerHTML = rows.length === 0 ? `<tr><td colspan="6">${emptyAction('Belum ada arsip sesuai filter', 'Arsipkan surat masuk/keluar atau ubah filter pencarian.', 'Arsipkan Surat', "window.switchView('view-tambah-arsip')", 'ph-folders')}</td></tr>` : htmlTable;
    renderPagination('paginationArsip', 'arsip', rows.length, page.totalPages);
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
    bindDataEventDelegation();

    const footerYear = document.getElementById('login-year');
    if(footerYear) footerYear.innerText = getFormattedJakartaYear(new Date());
    const loginLogo = document.getElementById('login-logo');
    if(loginLogo) {
        loginLogo.addEventListener('error', () => {
            loginLogo.src = 'https://ui-avatars.com/api/?name=LM&background=10b981&color=fff&rounded=true&bold=true';
        }, { once: true });
    }
    
    const urlParamsInitial = new URLSearchParams(window.location.search);
    
    if (urlParamsInitial.get('edit') || urlParamsInitial.get('verify') || urlParamsInitial.get('print')) {
        const loginView = document.getElementById('view-login');
        const loadingOverlay = document.getElementById('loading-overlay');
        if(loginView) {
            loginView.classList.add('hidden');
        }
        if(loadingOverlay) { loadingOverlay.classList.add('hidden'); loadingOverlay.classList.remove('flex'); }
    }

    setInputToJakartaToday('tglPembayaran');
    setInputToJakartaToday('tglPengeluaran');
    
    startClock();
    initCharts();
    renderInitialSkeletons();

    if('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js').catch((err) => console.warn('Service worker gagal didaftarkan:', err));
    }
});

document.addEventListener('visibilitychange', () => {
    if(!document.hidden) startClock();
});
