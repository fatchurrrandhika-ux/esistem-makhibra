window.tailwind = window.tailwind || {};
window.tailwind.config = { 
    theme: { 
        extend: { 
            fontFamily: { sans: ['"Source Sans Pro"', 'sans-serif'] }
        } 
    } 
};

(() => {
    const timeZone = 'Asia/Jakarta';
    let jakartaClockTimer = null;
    const dateFormatter = new Intl.DateTimeFormat('id-ID', {
        timeZone,
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    const timeFormatter = new Intl.DateTimeFormat('id-ID', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    window.getJakartaClockSnapshot = (now = new Date()) => {
        const timeParts = timeFormatter.formatToParts(now).reduce((result, part) => {
            result[part.type] = part.value;
            return result;
        }, {});
        const yearPart = dateFormatter.formatToParts(now).find((part) => part.type === 'year');

        return {
            date: dateFormatter.format(now),
            time: `${timeParts.hour}:${timeParts.minute}:${timeParts.second} WIB`,
            year: yearPart ? yearPart.value : String(now.getFullYear())
        };
    };

    window.paintJakartaClock = () => {
        const snapshot = window.getJakartaClockSnapshot();
        const dateEl = document.getElementById('currentDate');
        const timeEl = document.getElementById('currentTime');
        const loginYearEl = document.getElementById('login-year');
        const footerYearEl = document.getElementById('footer-year');

        if(dateEl) dateEl.innerText = snapshot.date;
        if(timeEl) timeEl.innerText = snapshot.time;
        if(loginYearEl) loginYearEl.innerText = snapshot.year;
        if(footerYearEl) footerYearEl.innerText = snapshot.year;
    };

    window.startJakartaClock = () => {
        if(jakartaClockTimer) clearTimeout(jakartaClockTimer);

        const tick = () => {
            window.paintJakartaClock();
            jakartaClockTimer = setTimeout(tick, 1000 - new Date().getMilliseconds());
        };

        tick();
    };
})();

const initialHashView = window.location.hash && window.location.hash.startsWith('#view-') ? window.location.hash.slice(1) : '';
let initialStoredView = '';
const isSafeViewId = (value) => /^view-[a-z0-9-]+$/.test(value || '');

try {
    initialStoredView = localStorage.getItem('eSistem:lastView') || '';
} catch(e) {}

const initialRouteView = (isSafeViewId(initialHashView) && initialHashView) || (isSafeViewId(initialStoredView) && initialStoredView) || '';

if (window.location.search.includes('verify=') || window.location.search.includes('print=')) {
    const earlyStyle = document.createElement('style');
    earlyStyle.textContent = 'aside, header, main, #view-login, #loading-overlay { display: none !important; } body { background-color: #f1f5f9; }';
    document.head.appendChild(earlyStyle);
} else if (window.location.search.includes('edit=')) {
    const earlyStyle = document.createElement('style');
    earlyStyle.textContent = '#view-dashboard, #view-login, #loading-overlay { display: none !important; }';
    document.head.appendChild(earlyStyle);
} else if (initialRouteView && initialRouteView !== 'view-login') {
    const earlyStyle = document.createElement('style');
    earlyStyle.id = 'early-route-style';
    earlyStyle.textContent = `#view-login, #loading-overlay { display: none !important; } #${initialRouteView} { display: block !important; }`;
    document.head.appendChild(earlyStyle);
}
