window.tailwind = window.tailwind || {};
window.tailwind.config = { 
    theme: { 
        extend: { 
            fontFamily: { sans: ['"Source Sans Pro"', 'sans-serif'] }, 
            colors: { 
                admin: { dark: '#1e293b', sidebar: '#0f172a', hover: '#334155', brand: '#047857', bg: '#f1f5f9' } 
            } 
        } 
    } 
};

if (window.location.search.includes('verify=') || window.location.search.includes('print=')) {
    const earlyStyle = document.createElement('style');
    earlyStyle.textContent = 'aside, header, main, #view-login, #loading-overlay { display: none !important; } body { background-color: #f1f5f9; }';
    document.head.appendChild(earlyStyle);
} else if (window.location.search.includes('edit=')) {
    const earlyStyle = document.createElement('style');
    earlyStyle.textContent = '#view-dashboard, #view-login, #loading-overlay { display: none !important; }';
    document.head.appendChild(earlyStyle);
}
