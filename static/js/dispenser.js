// ═══════════════════════════════════════════════════════════════════════════════
// DISPENSER.js - Obsah a správa dávkovače
// ═══════════════════════════════════════════════════════════════════════════════

import { contentDiv } from './core.js';
import { fetchWithAuth } from './auth.js';
import { formatDateStr } from './helpers.js';
import { loadDashboard } from './dashboard.js';
import { startFillingProcess } from './filling.js';

export async function loadDispensorContent() {
    contentDiv.innerHTML = `<div class="text-center py-5">
        <div class="spinner-border text-success"></div>
        <p class="mt-3 text-muted">Načítám obsah dávkovače...</p>
    </div>`;

    const r = await fetchWithAuth("/api/loaded-pills");
    if (!r.ok) return;
    const data = await r.json();

    const byLayer = {};
    data.loaded.forEach(lp => {
        if (!byLayer[lp.layer]) byLayer[lp.layer] = [];
        byLayer[lp.layer].push(lp);
    });

    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="bi bi-box-seam me-2 text-success"></i>Obsah dávkovače</h2>
            <button onclick="startFillingProcess()" class="btn btn-warning btn-sm">
                <i class="bi bi-arrow-repeat me-1"></i>Znovu naplnit
            </button>
        </div>
        <div class="row g-3 mb-4">
            <div class="col-md-4"><div class="card border-0 shadow-sm text-center p-3">
                <div class="text-primary fs-2 mb-1"><i class="bi bi-layers"></i></div>
                <div class="fs-4 fw-bold">${data.layers}</div>
                <div class="text-muted small">Vrstvy</div>
            </div></div>
            <div class="col-md-4"><div class="card border-0 shadow-sm text-center p-3">
                <div class="text-success fs-2 mb-1"><i class="bi bi-check-circle"></i></div>
                <div class="fs-4 fw-bold">${data.used_slots}</div>
                <div class="text-muted small">Naplněno</div>
            </div></div>
            <div class="col-md-4"><div class="card border-0 shadow-sm text-center p-3">
                <div class="text-warning fs-2 mb-1"><i class="bi bi-grid"></i></div>
                <div class="fs-4 fw-bold">${data.total_slots - data.used_slots}</div>
                <div class="text-muted small">Volných</div>
            </div></div>
        </div>
    `;

    if (data.loaded.length === 0) {
        html += `<div class="alert alert-info text-center py-5">
            <i class="bi bi-inbox fs-1 d-block mb-3"></i>
            <strong>Dávkovač je prázdný.</strong><br>
            <button onclick="startFillingProcess()" class="btn btn-warning mt-3">
                <i class="bi bi-box-arrow-in-down me-1"></i>Zahájit plnění
            </button>
        </div>`;
    } else {
        Object.keys(byLayer).sort().forEach(layer => {
            html += `
            <div class="card border-0 shadow-sm mb-3">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <strong><i class="bi bi-stack me-2"></i>Vrstva ${layer}</strong>
                    <span class="badge bg-white text-primary">${byLayer[layer].length} / 7</span>
                </div>
                <div class="card-body p-0">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-light">
                            <tr><th class="ps-4" style="width:100px;">Patro</th><th style="width:130px;">Přihrádka č.</th><th>Čas podání</th><th class="pe-4">Léky</th><th style="width:50px;"></th></tr>
                        </thead><tbody>`;
            for (let pos = 1; pos <= 7; pos++) {
                const item = byLayer[layer].find(x => x.position === pos);
                if (item) {
                    html += `<tr>
                        <td class="ps-4"><span class="badge bg-primary">Patro ${item.layer}</span></td>
                        <td><span class="badge bg-danger fs-6 px-3">${item.compartment || item.position}</span></td>
                        <td><strong>${formatDateStr(item.time)}</strong></td>
                        <td class="pe-4"><small>${item.content}</small></td>
                        <td>
                            <button onclick="deleteLoadedPill(${item.id})" class="btn btn-sm btn-outline-danger">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>`;
                } else {
                    html += `<tr class="table-light">
                        <td class="ps-4"><span class="badge bg-light text-muted border rounded-pill px-3">Pozice ${pos}</span></td>
                        <td colspan="3" class="text-muted fst-italic"><small>— prázdné —</small></td>
                    </tr>`;
                }
            }
            html += `</tbody></table></div></div>`;
        });
    }

    html += `<button onclick="loadDashboard()" class="btn btn-outline-secondary mt-2">
        <i class="bi bi-arrow-left me-1"></i>Zpět na Dashboard
    </button>`;
    contentDiv.innerHTML = html;
}

export async function emptyDispenser() {
    if (!confirm(
        "Opravdu chcete vysypat celý dávkovač?\n\n" +
        "Všechny léky budou označeny jako 'Vysypáno' v historii a dávkovač bude prázdný."
    )) return;

    const r = await fetchWithAuth("/api/empty-dispenser", { method: "POST" });
    if (r.ok) {
        const data = await r.json();
        const toast = document.createElement("div");
        toast.className = "alert alert-success position-fixed bottom-0 end-0 m-3 shadow";
        toast.style.zIndex = "9999";
        toast.innerHTML = `<i class="bi bi-check-circle me-2"></i>${data.message}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
        loadDashboard();
    } else {
        alert("Chyba při vysypávání dávkovače.");
    }
}

export async function confirmEmptyAndFill() {
    if (!confirm(
        "Dávkovač bude vysypán a aktuální léky označeny jako 'Vysypáno'.\n\nPokračovat na plnění?"
    )) return;

    const r = await fetchWithAuth("/api/empty-dispenser", { method: "POST" });
    if (r.ok) {
        startFillingProcess();
    } else {
        alert("Chyba při vysypávání dávkovače.");
    }
}

export async function deleteLoadedPill(loadedPillId) {
    if (!confirm("Opravdu smazat tento lék z dávkovače?")) return;
    
    const r = await fetchWithAuth(`/api/loaded-pills/${loadedPillId}`, { method: "DELETE" });
    if (r.ok) {
        const data = await r.json();
        // Zobrazit toast notifikaci
        const toast = document.createElement("div");
        toast.className = "alert alert-success position-fixed bottom-0 end-0 m-3 shadow";
        toast.style.zIndex = "9999";
        toast.innerHTML = `<i class="bi bi-check-circle me-2"></i>${data.message}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
        
        // Obnovit obsah dávkovače
        loadDispensorContent();
        // Obnovit i dashboard
        loadDashboard();
    } else {
        alert("Chyba při mazání léku.");
    }

