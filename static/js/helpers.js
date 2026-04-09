// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS.js - Formátovací funkce a konstanty
// ═══════════════════════════════════════════════════════════════════════════════

export const DAYS_CS = {0:"Ne", 1:"Po", 2:"Út", 3:"St", 4:"Čt", 5:"Pá", 6:"So"};

export function formatDateStr(s) {
    if (!s) return "";
    if (!s.includes("T")) return s;
    const d = new Date(s);
    return d.toLocaleDateString("cs-CZ") + " " + d.toLocaleTimeString("cs-CZ", {hour:"2-digit", minute:"2-digit"});
}

export function formatPillTime(s, repeat) {
    if (!s) return "";

    if (repeat === "daily") {
        // HH:MM — každý den
        const hhmm = s.includes("T") ? s.split("T")[1].substring(0,5) : s.substring(0,5);
        return `<span class="text-info fw-bold">${hhmm}</span>
                <small class="text-muted d-block">každý den</small>`;
    }

    if (repeat === "weekly" || s.startsWith("weekly:")) {
        // weekly:WEEKDAYS:HH:MM
        const parts = s.split(":");
        const days  = parts[1].split(",").map(d => DAYS_CS[parseInt(d)] || "?").join(", ");
        const hhmm  = parts[2] + ":" + (parts[3] || "00");
        return `<span class="text-warning fw-bold">${days} ${hhmm}</span>
                <small class="text-muted d-block">každý týden</small>`;
    }

    // none — jednorázový, zobrazíme plné datum + čas
    if (s.includes("T")) {
        const dt = new Date(s);
        const dateStr = dt.toLocaleDateString("cs-CZ", {day:"2-digit", month:"2-digit", year:"numeric"});
        const timeStr = dt.toLocaleTimeString("cs-CZ", {hour:"2-digit", minute:"2-digit"});
        const dayName = dt.toLocaleDateString("cs-CZ", {weekday:"short"});
        return `<span class="fw-bold">${timeStr}</span>
                <small class="text-muted d-block">${dayName} ${dateStr}</small>`;
    }

    return s.substring(0,5);
}

export function formatTimeOnly(s) {
    if (!s) return "";
    if (s.startsWith("weekly:")) {
        const parts = s.split(":");
        const days = parts[1].split(",").map(d => DAYS_CS[parseInt(d)] || "").join(", ");
        const time = parts[2] + ":" + (parts[3] || "00");
        return `${days} ${time}`;
    }
    if (s.includes("T")) return s.split("T")[1].substring(0,5);
    return s.substring(0,5);
}

export function repeatBadge(repeat) {
    if (repeat === "daily")  return `<span class="badge bg-info text-dark">každý den</span>`;
    if (repeat === "weekly") return `<span class="badge bg-warning text-dark">každý týden</span>`;
    return `<span class="badge bg-light text-muted border">jednorázově</span>`;
}

/**
 * Zobrazí toast notifikaci.
 * @param {string} message - Zpráva k zobrazení.
 * @param {string} type - Typ notifikace ('success', 'danger', 'info').
 */
export function showToast(message, type = 'info') {
    const toast = document.createElement("div");
    const icons = {
        success: 'bi-check-circle-fill',
        danger: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    };
    const icon = icons[type] || icons['info'];

    toast.className = `alert alert-${type} position-fixed bottom-0 end-0 m-3 shadow d-flex align-items-center`;
    toast.style.zIndex = "9999";
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `<i class="bi ${icon} me-2"></i><div>${message}</div>`;

    document.body.appendChild(toast);

    // Auto-hide after 3 seconds
    setTimeout(() => {
        // Add fade out effect
        toast.style.transition = 'opacity 0.5s ease';
        toast.style.opacity = '0';
        // Remove after transition
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}
