// ═══════════════════════════════════════════════════════════════════════════════
// PILLS.js - Správa léků
// ═══════════════════════════════════════════════════════════════════════════════

import { contentDiv } from './core.js';
import { fetchWithAuth } from './auth.js';
import { formatPillTime, repeatBadge } from './helpers.js';

export function loadAddPills() {
    contentDiv.innerHTML = `
        <h2 class="mb-4">Správa léků</h2>
        <div class="row">
            <div class="col-md-5">
                <div class="card shadow-sm border-0 mb-4">
                    <div class="card-header bg-white">
                        <h5 class="mb-0 text-primary"><i class="bi bi-plus-circle"></i> Přidat nový lék</h5>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label class="form-label">Název léku</label>
                            <input type="text" id="pillName" class="form-control" placeholder="např. Paralen">
                        </div>
                        <div class="mb-4">
                            <label class="form-label">Opakování</label>
                            <div class="d-flex gap-2">
                                <input type="radio" class="btn-check" name="repeat" id="r-none"   value="none"   checked
                                       onchange="updateTimeInput('none')">
                                <label class="btn btn-outline-secondary flex-fill" for="r-none">
                                    <i class="bi bi-dash-circle me-1"></i>Jednorázově
                                </label>
                                <input type="radio" class="btn-check" name="repeat" id="r-daily"  value="daily"
                                       onchange="updateTimeInput('daily')">
                                <label class="btn btn-outline-info flex-fill" for="r-daily">
                                    <i class="bi bi-arrow-repeat me-1"></i>Každý den
                                </label>
                                <input type="radio" class="btn-check" name="repeat" id="r-weekly" value="weekly"
                                       onchange="updateTimeInput('weekly')">
                                <label class="btn btn-outline-warning flex-fill" for="r-weekly">
                                    <i class="bi bi-calendar-week me-1"></i>Týdně
                                </label>
                            </div>
                        </div>
                        <div class="mb-3" id="weekday-row" style="display:none;">
                            <label class="form-label">Dny v týdnu</label>
                            <div class="d-flex gap-1 flex-wrap">
                                <input type="checkbox" class="btn-check" name="weekday" id="wd-1" value="1" checked>
                                <label class="btn btn-sm btn-outline-secondary" for="wd-1">Po</label>
                                <input type="checkbox" class="btn-check" name="weekday" id="wd-2" value="2">
                                <label class="btn btn-sm btn-outline-secondary" for="wd-2">Út</label>
                                <input type="checkbox" class="btn-check" name="weekday" id="wd-3" value="3">
                                <label class="btn btn-sm btn-outline-secondary" for="wd-3">St</label>
                                <input type="checkbox" class="btn-check" name="weekday" id="wd-4" value="4">
                                <label class="btn btn-sm btn-outline-secondary" for="wd-4">Čt</label>
                                <input type="checkbox" class="btn-check" name="weekday" id="wd-5" value="5">
                                <label class="btn btn-sm btn-outline-secondary" for="wd-5">Pá</label>
                                <input type="checkbox" class="btn-check" name="weekday" id="wd-6" value="6">
                                <label class="btn btn-sm btn-outline-secondary" for="wd-6">So</label>
                                <input type="checkbox" class="btn-check" name="weekday" id="wd-0" value="0">
                                <label class="btn btn-sm btn-outline-secondary" for="wd-0">Ne</label>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label" id="pillTimeLabel">Datum a čas dávkování</label>
                            <input type="datetime-local" id="pillTime" class="form-control">
                            <div class="form-text text-muted" id="pillTimeHint">
                                Jednorázové podání — vyberte přesné datum a čas.
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Dávka</label>
                            <input type="text" id="pillDose" class="form-control" placeholder="např. 1 tableta">
                        </div>
                        <button onclick="submitPill()" class="btn btn-primary w-100">
                            <i class="bi bi-save me-1"></i>Uložit lék
                        </button>
                    </div>
                </div>
            </div>
            <div class="col-md-7">
                <div class="card shadow-sm border-0" id="pills-list-container">
                    <div class="card-body text-center text-muted py-5">
                        <div class="spinner-border spinner-border-sm me-2"></div>Načítám...
                    </div>
                </div>
            </div>
        </div>
    `;
    fetchPillsList();
}

export async function fetchPillsList() {
    const r = await fetchWithAuth("/api/pills");
    if (!r.ok) return;
    const data = await r.json();

    let html = `
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
            <h5 class="mb-0 text-success"><i class="bi bi-list-ul"></i> Uložené léky</h5>
            <small class="text-muted">${data.pills.length} záznamy</small>
        </div>
        <div class="card-body p-0">
        <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
                <tr>
                    <th class="ps-3">Název</th>
                    <th>Čas / Datum</th>
                    <th>Dávka</th>
                    <th>Opakování</th>
                    <th class="pe-3"></th>
                </tr>
            </thead><tbody>
    `;

    if (data.pills.length === 0) {
        html += `<tr><td colspan="5" class="text-center py-4 text-muted">Zatím žádné léky.</td></tr>`;
    } else {
        data.pills.forEach(p => {
            html += `<tr>
                <td class="ps-3"><strong>${p.name}</strong></td>
                <td>${formatPillTime(p.time, p.repeat)}</td>
                <td><span class="badge bg-light text-dark border">${p.dose}</span></td>
                <td>${repeatBadge(p.repeat)}</td>
                <td class="pe-3">
                    <button onclick="deletePill(${p.id})" class="btn btn-sm btn-outline-danger">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`;
        });
    }
    html += `</tbody></table></div>`;
    document.getElementById("pills-list-container").innerHTML = html;
}

export async function submitPill() {
    const name   = document.getElementById("pillName").value.trim();
    const timeEl = document.getElementById("pillTime");
    const dose   = document.getElementById("pillDose").value.trim();
    const repeat = document.querySelector('input[name="repeat"]:checked')?.value || "none";

    if (!name || !dose) {
        window.showToast("Vyplňte prosím název léku i dávku.", "warning");
        return;
    }
    if (!timeEl.value) {
        window.showToast("Vyplňte prosím čas.", "warning");
        return;
    }

    let time = timeEl.value;

    if (repeat === "none") {
        // datetime-local — uložíme celý string
    } else if (repeat === "daily") {
        // jen HH:MM
        if (time.includes("T")) time = time.substring(11, 16);
    } else if (repeat === "weekly") {
        // zakódujeme jako "weekly:WEEKDAY1,WEEKDAY2:HH:MM"
        // WEEKDAY: 0=Ne, 1=Po, ..., 6=So
        const checkedDays = Array.from(document.querySelectorAll('input[name="weekday"]:checked')).map(el => el.value);
        const weekdays = checkedDays.length > 0 ? checkedDays.join(",") : "1";
        if (time.includes("T")) time = time.substring(11, 16);
        time = `weekly:${weekdays}:${time}`;
    }

    const r = await fetchWithAuth("/api/pills", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name, time, dose, repeat})
    });
    if (r.ok) {
        window.showToast("Lék byl úspěšně uložen.", "success");
        loadAddPills();
    } else {
        window.showToast("Chyba při ukládání léku.", "danger");
    }
}

export async function deletePill(id) {
    if (!confirm("Opravdu smazat tento lék?")) return;
    const r = await fetchWithAuth(`/api/pills/${id}`, {method: "DELETE"});
    if (r.ok) {
        window.showToast("Lék byl smazán.", "success");
        fetchPillsList();
    } else {
        window.showToast("Chyba při mazání léku.", "danger");
    }
}

export function updateTimeInput(repeat) {
    const input  = document.getElementById("pillTime");
    const label  = document.getElementById("pillTimeLabel");
    const hint   = document.getElementById("pillTimeHint");
    const dayRow = document.getElementById("weekday-row");
    const oldVal = input.value;

    if (repeat === "none") {
        input.type  = "datetime-local";
        label.textContent = "Datum a čas dávkování";
        hint.textContent  = "Jednorázové podání — vyberte přesné datum a čas.";
        dayRow.style.display = "none";
        if (oldVal && oldVal.length === 5) {
            const today = new Date().toISOString().substring(0, 10);
            input.value = today + "T" + oldVal;
        }
    } else if (repeat === "daily") {
        input.type  = "time";
        label.textContent = "Čas dávkování (každý den)";
        hint.textContent  = "Lék bude vydáván každý den v tento čas.";
        dayRow.style.display = "none";
        if (oldVal && oldVal.includes("T")) {
            input.value = oldVal.substring(11, 16);
        }
    } else {
        // weekly
        input.type  = "time";
        label.textContent = "Čas dávkování";
        hint.textContent  = "Lék bude vydáván každý týden ve zvolený den.";
        dayRow.style.display = "block";
        if (oldVal && oldVal.includes("T")) {
            input.value = oldVal.substring(11, 16);
        }
    }
}
