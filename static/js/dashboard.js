// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD.js - Hlavní dashboard
// ═══════════════════════════════════════════════════════════════════════════════

import { contentDiv } from './core.js';
import { fetchWithAuth } from './auth.js';
import { formatDateStr, formatPillTime, repeatBadge } from './helpers.js';

export async function loadDashboard() {
    const r = await fetchWithAuth("/api/dashboard");
    if (!r.ok) return;
    const data = await r.json();

    // ── Souhrnné karty ──
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Dashboard <small class="text-muted fs-6">· ${data.device}</small></h2>
            <span class="badge bg-secondary fs-6 p-2">
                <i class="bi bi-layers me-1"></i>Vrstvy: ${data.layers}
            </span>
        </div>
        <div class="row g-3 mb-4">
            <div class="col-md-2">
                <div class="card border-0 shadow-sm text-center p-3">
                    <div class="text-primary fs-2 mb-1"><i class="bi bi-capsule"></i></div>
                    <div class="fs-4 fw-bold">${data.planned_pills.length}</div>
                    <div class="text-muted small">Léků v plánu</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card border-0 shadow-sm text-center p-3">
                    <div class="text-success fs-2 mb-1"><i class="bi bi-box-seam"></i></div>
                    <div class="fs-4 fw-bold">${data.loaded_pills.length}</div>
                    <div class="text-muted small">Léků v dávkovači</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card border-0 shadow-sm text-center p-3">
                    <div class="text-warning fs-2 mb-1"><i class="bi bi-grid"></i></div>
                    <div class="fs-4 fw-bold">${data.layers * 7}</div>
                    <div class="text-muted small">Celkem slotů</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-0 shadow-sm text-center p-3">
                    <div id="dispenser-status-icon" class="fs-2 mb-1 text-muted">
                        <i class="bi bi-capsule"></i>
                    </div>
                    <div class="fw-bold fs-6 mb-1">Dávkovač</div>
                    <div id="dispenser-status-text" class="fw-bold text-muted">Neověřeno</div>
                    <div id="dispenser-latency" class="text-muted small mb-2">—</div>
                    <button onclick="pingDispenser()" id="ping-dispenser-btn" class="btn btn-sm btn-outline-secondary w-100">
                        <i class="bi bi-wifi me-1"></i>Ping
                    </button>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-0 shadow-sm text-center p-3">
                    <div id="scale-status-icon" class="fs-2 mb-1 text-muted">
                        <i class="bi bi-speedometer"></i>
                    </div>
                    <div class="fw-bold fs-6 mb-1">Váha</div>
                    <div id="scale-status-text" class="fw-bold text-muted">Neověřeno</div>
                    <div id="scale-latency" class="text-muted small mb-2">—</div>
                    <button onclick="pingScale()" id="ping-scale-btn" class="btn btn-sm btn-outline-secondary w-100">
                        <i class="bi bi-wifi me-1"></i>Ping
                    </button>
                </div>
            </div>
        </div>

        <div class="row g-4">
            <!-- Léky v dávkovači -->
            <div class="col-md-6">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-header bg-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0 text-success"><i class="bi bi-box-seam me-2"></i>V dávkovači</h5>
                        <div class="d-flex align-items-center gap-2">
                            <small class="text-muted">${data.loaded_pills.length} / ${data.layers * 7} slotů</small>
                            ${data.loaded_pills.length > 0
                                ? `<button onclick="emptyDispenser()" class="btn btn-sm btn-outline-danger">
                                       <i class="bi bi-trash me-1"></i>Vysypat
                                   </button>`
                                : ""}
                        </div>
                    </div>
                    <div class="card-body p-0">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr><th class="ps-3">Čas podání</th><th>Obsah</th><th class="pe-3">Slot</th></tr>
                            </thead>
                            <tbody>
    `;

    if (data.loaded_pills.length === 0) {
        html += `<tr><td colspan="3" class="text-center py-4 text-muted">Dávkovač je prázdný</td></tr>`;
    } else {
        data.loaded_pills.forEach(lp => {
            html += `<tr>
                <td class="ps-3"><strong>${formatDateStr(lp.time)}</strong></td>
                <td><small>${lp.content}</small></td>
                <td class="pe-3"><span class="badge bg-primary">L${lp.layer}·P${lp.position}</span></td>
            </tr>`;
        });
    }

    html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Naplánované léky -->
            <div class="col-md-6">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-header bg-white">
                        <h5 class="mb-0 text-primary"><i class="bi bi-clock me-2"></i>Naplánované léky</h5>
                    </div>
                    <div class="card-body p-0">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr><th class="ps-3">Čas</th><th>Název</th><th>Dávka</th><th class="pe-3">Opakování</th></tr>
                            </thead>
                            <tbody>
    `;

    if (data.planned_pills.length === 0) {
        html += `<tr><td colspan="4" class="text-center py-4 text-muted">Žádné léky v plánu</td></tr>`;
    } else {
        data.planned_pills.forEach(p => {
            html += `<tr>
                <td class="ps-3">${formatPillTime(p.time, p.repeat)}</td>
                <td>${p.name}</td>
                <td><span class="badge bg-light text-dark border">${p.dose}</span></td>
                <td class="pe-3">${repeatBadge(p.repeat)}</td>
            </tr>`;
        });
    }

    html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    contentDiv.innerHTML = html;
}

