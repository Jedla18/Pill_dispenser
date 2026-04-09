// ═══════════════════════════════════════════════════════════════════════════════
// CONSUMPTION.js - História odběrů léků
// ═══════════════════════════════════════════════════════════════════════════════

import { contentDiv } from './core.js';
import { fetchWithAuth } from './auth.js';
import { formatTimeOnly } from './helpers.js';

export async function loadConsumption() {
    const r = await fetchWithAuth("/api/consumption");
    if (!r.ok) return;
    const data = await r.json();
    let html = `<h2 class="mb-4">Consumption Data</h2>
    <div class="card shadow-sm border-0"><div class="card-body p-0">
    <table class="table table-striped align-middle mb-0">
        <thead class="table-dark">
            <tr><th class="ps-4">Datum</th><th>Čas</th><th>Lék</th><th class="pe-4">Status</th><th style="width:50px;"></th></tr>
        </thead><tbody>`;
    if (data.consumed.length === 0) {
        html += `<tr><td colspan="5" class="text-center py-4 text-muted">Žádná data.</td></tr>`;
    } else {
        data.consumed.forEach(c => {
            const badge = c.status === "Vzato" ? "bg-success" : "bg-danger";
            html += `<tr>
                <td class="ps-4">${c.date}</td><td>${formatTimeOnly(c.time)}</td>
                <td><strong>${c.name}</strong></td>
                <td class="pe-4"><span class="badge ${badge}">${c.status}</span></td>
                <td>
                    <button onclick="deleteConsumption(${c.id})" class="btn btn-sm btn-outline-danger">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`;
        });
    }
    html += `</tbody></table></div></div>`;
    contentDiv.innerHTML = html;
}

export async function deleteConsumption(consumptionId) {
    if (!confirm("Opravdu smazat tento záznam?")) return;
    
    const r = await fetchWithAuth(`/api/consumption/${consumptionId}`, { method: "DELETE" });
    if (r.ok) {
        loadConsumption();
        window.showToast("Záznam smazán", "success");
    } else {
        window.showToast("Chyba při mazání záznamu.", "danger");
    }
}
