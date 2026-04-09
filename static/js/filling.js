// ═══════════════════════════════════════════════════════════════════════════════
// FILLING.js - Plnění dávkovače
// ═══════════════════════════════════════════════════════════════════════════════

import { contentDiv, state } from './core.js';
import { fetchWithAuth } from './auth.js';
import { formatDateStr } from './helpers.js';
import { loadDispensorContent } from './dispenser.js';
import { loadDashboard } from './dashboard.js';

export async function startFillingProcess() {
    contentDiv.innerHTML = `<div class="text-center py-5">
        <div class="spinner-border text-primary"></div>
        <p class="mt-3 text-muted">Načítám plán plnění...</p>
    </div>`;

    // Nejdřív zkontroluj jestli je dávkovač prázdný
    const checkR = await fetchWithAuth("/api/loaded-pills");
    if (checkR.ok) {
        const checkData = await checkR.json();
        if (checkData.used_slots > 0) {
            contentDiv.innerHTML = `
                <h2 class="mb-4"><i class="bi bi-box-arrow-in-down me-2 text-warning"></i>Plnění dávkovače</h2>
                <div class="alert alert-warning d-flex gap-3 align-items-start">
                    <i class="bi bi-exclamation-triangle-fill fs-3 text-warning mt-1"></i>
                    <div>
                        <h5 class="mb-1">Dávkovač není prázdný</h5>
                        <p class="mb-2">
                            V dávkovači je aktuálně <strong>${checkData.used_slots} dávek</strong>.
                            Před novým plněním je nejprve doberte nebo vysypejte.
                        </p>
                        <div class="d-flex gap-2 flex-wrap">
                            <button onclick="loadDispensorContent()" class="btn btn-primary">
                                <i class="bi bi-box-seam me-1"></i>Zobrazit obsah dávkovače
                            </button>
                            <button onclick="confirmEmptyAndFill()" class="btn btn-outline-danger">
                                <i class="bi bi-trash me-1"></i>Vysypat a přejít na plnění
                            </button>
                            <button onclick="loadDashboard()" class="btn btn-outline-secondary">
                                <i class="bi bi-arrow-left me-1"></i>Zpět na dashboard
                            </button>
                        </div>
                    </div>
                </div>`;
            return;
        }
    }

    const r = await fetchWithAuth("/api/fill-plan");
    if (!r.ok) return;
    const data = await r.json();

    if (!data.plan || data.plan.length === 0) {
        contentDiv.innerHTML = `<div class="alert alert-warning text-center mt-5 py-5 fs-5">
            <i class="bi bi-exclamation-triangle me-2"></i>${data.message || "Zásobník je prázdný."}
        </div>`;
        return;
    }

    state.currentFillPlan = data.plan;

    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="bi bi-box-arrow-in-down me-2 text-warning"></i>Průvodce plněním</h2>
            <span class="badge bg-info text-dark fs-6 p-2">
                Využito: <strong>${data.used_slots} / ${data.total_slots}</strong>
            </span>
        </div>

        <!-- Progress -->
        <div class="card border-0 shadow-sm mb-4 p-3">
            <div class="d-flex justify-content-between mb-2">
                <small class="text-muted fw-bold text-uppercase">Průběh</small>
                <small class="text-muted" id="carousel-progress">Krok 1 z ${data.plan.length}</small>
            </div>
            <div class="progress" style="height:8px;">
                <div class="progress-bar bg-warning" id="fill-progress-bar"
                     style="width:${Math.round(1/data.plan.length*100)}%"></div>
            </div>
        </div>

        <!-- Carousel -->
        <div id="fillCarousel" class="carousel slide" data-bs-interval="false">
            <div class="carousel-inner">
    `;

    data.plan.forEach((step, i) => {
        const isActive = i === 0 ? "active" : "";
        const isLast   = i === data.plan.length - 1;
        const comp     = step.compartment || step.position; // fyzická přihrádka
        html += `
            <div class="carousel-item ${isActive}">
                <div class="card border-0 shadow-sm">
                    <div class="card-body p-0">
                        <div class="row g-0 align-items-stretch">
                            <div class="col-md-5 bg-dark d-flex align-items-center justify-content-center rounded-start p-4" style="min-height:360px;">
                                <div class="text-center">
                                    <img src="${step.image_url}" class="img-fluid rounded mb-3"
                                         style="max-height:260px;object-fit:contain;"
                                         onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                                    <div style="display:none;" class="align-items-center justify-content-center flex-column text-white">
                                        <div style="width:160px;height:160px;border-radius:50%;border:6px solid #ffc107;display:flex;align-items:center;justify-content:center;font-size:3rem;font-weight:bold;color:#ffc107;">
                                            ${comp}
                                        </div>
                                        <div class="mt-3 text-warning fw-bold">Vrstva ${step.layer}</div>
                                    </div>
                                    <div class="mt-2 d-flex flex-column gap-1 align-items-center">
                                        <span class="badge bg-warning text-dark px-3 py-2">
                                            Patro ${step.layer}
                                        </span>
                                        <span class="badge bg-success px-3 py-2 fs-6">
                                            <i class="bi bi-check-circle me-1"></i>Plníte přihrádku č. ${comp}
                                        </span>
                                        <span class="badge bg-danger px-2 py-1">
                                            <i class="bi bi-x-circle me-1"></i>Díra (výstup) = přihrádka č. ${step.layer}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-7 p-4 d-flex flex-column justify-content-between">
                                <div>
                                    <div class="d-flex align-items-center gap-2 mb-3">
                                        <span class="badge bg-primary rounded-pill fs-6 px-3">Krok ${i+1}</span>
                                        <h4 class="mb-0">Patro ${step.layer} · Přihrádka <span class="text-success">${comp}</span></h4>
                                    </div>
                                    <div class="alert alert-success py-2 mb-1">
                                        <i class="bi bi-check-circle-fill me-2"></i>
                                        Vložte léky do <strong>zelené přihrádky č. ${comp}</strong> na kole.
                                    </div>
                                    <div class="alert alert-danger py-2 mb-3">
                                        <i class="bi bi-x-circle-fill me-2"></i>
                                        Červená přihrádka č. ${step.layer} = díra/výstup — tam nic nedávejte.
                                    </div>
                                    <div class="mb-3">
                                        <label class="text-muted small fw-bold text-uppercase mb-1 d-block">Čas podání</label>
                                        <div class="border rounded p-3 bg-light">
                                            <span class="fs-5 fw-bold">${formatDateStr(step.time)}</span>
                                        </div>
                                    </div>
                                    <div class="mb-4">
                                        <label class="text-muted small fw-bold text-uppercase mb-1 d-block">Léky k vložení</label>
                                        <div class="border rounded p-3 bg-dark text-warning fw-bold fs-5">
                                            ${step.content.split(", ").map(p => `<div><i class="bi bi-dot fs-4"></i>${p}</div>`).join("")}
                                        </div>
                                    </div>
                                </div>
                                <div class="d-flex gap-2">
                                    ${i > 0
                                        ? `<button class="btn btn-outline-secondary flex-fill" onclick="moveCarousel('prev',${i},${data.plan.length})">
                                               <i class="bi bi-arrow-left me-1"></i>Předchozí
                                           </button>`
                                        : `<div class="flex-fill"></div>`}
                                    ${isLast
                                        ? `<button onclick="showFillSummary()" class="btn btn-success flex-fill btn-lg shadow">
                                               <i class="bi bi-check-circle me-2"></i>Dokončit plnění
                                           </button>`
                                        : `<button class="btn btn-primary flex-fill" onclick="moveCarousel('next',${i},${data.plan.length})">
                                               Další<i class="bi bi-arrow-right ms-1"></i>
                                           </button>`}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div></div>

        <!-- Miniatura kroků -->
        <div class="card border-0 shadow-sm mt-4 p-3">
            <div class="small text-muted fw-bold text-uppercase mb-2">Kroky</div>
            <div class="d-flex flex-wrap gap-2">
                ${data.plan.map((s,i) => `
                    <button onclick="jumpToStep(${i},${data.plan.length})"
                            class="btn btn-sm ${i===0?'btn-primary':'btn-outline-secondary'} step-btn"
                            id="step-btn-${i}" title="L${s.layer}·P${s.position}">
                        L${s.layer}·P${s.position}
                    </button>`).join("")}
            </div>
        </div>
    `;

    // ── Tabulka nevešlých léků ──
    if (data.skipped && data.skipped.length > 0) {

        // Seskup opakující se léky — použij repeat přímo z API
        const skippedGroups = {};
        data.skipped.forEach(s => {
            const key = s.content;
            if (!skippedGroups[key]) {
                skippedGroups[key] = { first: s.time, count: 1, content: s.content, repeat: s.repeat || "none" };
            } else {
                skippedGroups[key].count++;
            }
        });

        const repeatLabel = {
            "daily":  `<span class="badge bg-info text-dark">každý den</span>`,
            "weekly": `<span class="badge bg-warning text-dark">každý týden</span>`,
            "none":   `<span class="badge bg-light text-muted border">jednorázově</span>`
        };

        const skippedRows = Object.values(skippedGroups).map(g => {
            const timeLabel = g.repeat !== "none"
                ? `${formatDateStr(g.first)} <span class="text-muted">a dále </span>`
                : formatDateStr(g.first);
            return `<tr>
                <td class="ps-3">${timeLabel}</td>
                <td class="pe-3"><small>${g.content}</small></td>
                <td class="pe-3 text-end">${repeatLabel[g.repeat] || repeatLabel["none"]}</td>
            </tr>`;
        }).join("");

        html += `
        <div class="card border-0 shadow-sm mt-4">
            <div class="card-header bg-warning bg-opacity-25 d-flex align-items-center gap-2">
                <i class="bi bi-exclamation-triangle text-warning fs-5"></i>
                <strong>Léky co se nevešly do dávkovače:</strong>
            </div>
            <div class="card-body p-0">
                <table class="table table-sm align-middle mb-0">
                    <thead class="table-light">
                        <tr><th class="ps-3">První dávka</th><th>Obsah</th><th class="pe-3 text-end">Frekvence</th></tr>
                    </thead><tbody>${skippedRows}</tbody>
                </table>
            </div>
            <div class="card-footer bg-transparent text-muted small">
                <i class="bi bi-info-circle me-1"></i>
                Tyto léky se nevejdou do dávkovače s ${Math.floor(data.total_slots/7)} vrstvami.
                Zvyšte počet vrstev nebo odeberte nepotřebné léky.
            </div>
        </div>`;
    }

    contentDiv.innerHTML = html;
}

export function showFillSummary() {
    const plan = state.currentFillPlan;
    if (!plan) return;

    let html = `
        <h2 class="mb-4"><i class="bi bi-clipboard-check me-2 text-success"></i>Shrnutí plnění</h2>
        <div class="alert alert-success">
            <i class="bi bi-check-circle me-2"></i>
            Prošli jste všemi kroky. Zkontrolujte tabulku níže a potvrďte uložení do databáze.
        </div>
        <div class="card border-0 shadow-sm mb-4">
            <div class="card-header bg-white">
                <h5 class="mb-0"><i class="bi bi-box-seam me-2 text-success"></i>Naplněné přihrádky (${plan.length})</h5>
            </div>
            <div class="card-body p-0">
                <table class="table table-hover align-middle mb-0">
                    <thead class="table-light">
                        <tr>
                            <th class="ps-3">Patro</th>
                            <th>Přihrádka č.</th>
                            <th>Čas podání</th>
                            <th class="pe-3">Léky</th>
                        </tr>
                    </thead><tbody>
                        ${plan.map(s => `
                            <tr>
                                <td class="ps-3"><span class="badge bg-primary">Patro ${s.layer}</span></td>
                                <td><span class="badge bg-danger fs-6 px-3">${s.compartment || s.position}</span></td>
                                <td>${formatDateStr(s.time)}</td>
                                <td class="pe-3"><small>${s.content}</small></td>
                            </tr>`).join("")}
                    </tbody>
                </table>
            </div>
        </div>
        <div class="d-flex gap-3">
            <button onclick="startFillingProcess()" class="btn btn-outline-secondary">
                <i class="bi bi-arrow-left me-1"></i>Zpět na průvodce
            </button>
            <button onclick="confirmFilling(this)" class="btn btn-success btn-lg flex-fill shadow">
                <i class="bi bi-check-circle me-2"></i>Uložit do DB a odeslat MCU
            </button>
        </div>
    `;
    contentDiv.innerHTML = html;
}

export async function confirmFilling(btn) {
    const plan = state.currentFillPlan;
    if (!plan) {
        window.showToast("Plán nenalezen.", "danger");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Ukládám...`;

    const r = await fetchWithAuth("/api/confirm-fill", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(plan)
    });

    if (r.ok) {
        loadDispensorContent();
        window.showToast("Dávkovač byl úspěšně naplněn a data uložena.", "success");
    } else {
        window.showToast("Chyba při ukládání.", "danger");
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-check-circle me-2"></i>Uložit do DB a odeslat MCU`;
    }
}

export function moveCarousel(dir, idx, total) {
    const c = bootstrap.Carousel.getOrCreateInstance(document.getElementById("fillCarousel"));
    dir === "next" ? c.next() : c.prev();
    updateCarouselUI(dir === "next" ? idx+1 : idx-1, total);
}

export function jumpToStep(idx, total) {
    bootstrap.Carousel.getOrCreateInstance(document.getElementById("fillCarousel")).to(idx);
    updateCarouselUI(idx, total);
}

export function updateCarouselUI(idx, total) {
    const bar   = document.getElementById("fill-progress-bar");
    const label = document.getElementById("carousel-progress");
    if (bar)   bar.style.width = Math.round((idx+1)/total*100) + "%";
    if (label) label.textContent = `Krok ${idx+1} z ${total}`;
    document.querySelectorAll(".step-btn").forEach((b,i) => {
        b.className = `btn btn-sm ${i===idx?"btn-primary":"btn-outline-secondary"} step-btn`;
    });
}
