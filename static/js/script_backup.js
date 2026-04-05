const contentDiv = document.getElementById("main-content");
const loginView  = document.getElementById("login-view");
const appView    = document.getElementById("app-view");

let token = localStorage.getItem("token");

// ─── HELPERS ────────────────────────────────────────────────────────────────

function formatDateStr(s) {
    if (!s) return "";
    if (!s.includes("T")) return s;
    const d = new Date(s);
    return d.toLocaleDateString("cs-CZ") + " " + d.toLocaleTimeString("cs-CZ", {hour:"2-digit", minute:"2-digit"});
}

const DAYS_CS = {0:"Ne", 1:"Po", 2:"Út", 3:"St", 4:"Čt", 5:"Pá", 6:"So"};

function formatPillTime(s, repeat) {
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

function formatTimeOnly(s) {
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

function repeatBadge(repeat) {
    if (repeat === "daily")  return `<span class="badge bg-info text-dark">každý den</span>`;
    if (repeat === "weekly") return `<span class="badge bg-warning text-dark">každý týden</span>`;
    return `<span class="badge bg-light text-muted border">jednorázově</span>`;
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

if (token) showApp();

function showApp() {
    loginView.classList.remove("d-flex");
    loginView.classList.add("d-none");
    appView.style.display = "block";
    loadDashboard();
}

function logout() {
    localStorage.removeItem("token");
    token = null;
    appView.style.display = "none";
    loginView.classList.remove("d-none");
    loginView.classList.add("d-flex");
}

async function login() {
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;
    const formData = new URLSearchParams();
    formData.append("username", user);
    formData.append("password", pass);
    const r = await fetch("/token", {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body: formData
    });
    if (r.ok) {
        const data = await r.json();
        token = data.access_token;
        localStorage.setItem("token", token);
        showApp();
    } else {
        alert("Nesprávné jméno nebo heslo!");
    }
}

async function fetchWithAuth(url, options = {}) {
    if (!options.headers) options.headers = {};
    options.headers["Authorization"] = `Bearer ${token}`;
    const r = await fetch(url, options);
    if (r.status === 401) logout();
    return r;
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

async function loadDashboard() {
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

// ─── CONSUMPTION ─────────────────────────────────────────────────────────────

async function loadConsumption() {
    const r = await fetchWithAuth("/api/consumption");
    if (!r.ok) return;
    const data = await r.json();
    let html = `<h2 class="mb-4">Consumption Data</h2>
    <div class="card shadow-sm border-0"><div class="card-body p-0">
    <table class="table table-striped align-middle mb-0">
        <thead class="table-dark">
            <tr><th class="ps-4">Datum</th><th>Čas</th><th>Lék</th><th class="pe-4">Status</th></tr>
        </thead><tbody>`;
    if (data.consumed.length === 0) {
        html += `<tr><td colspan="4" class="text-center py-4 text-muted">Žádná data.</td></tr>`;
    } else {
        data.consumed.forEach(c => {
            const badge = c.status === "Vzato" ? "bg-success" : "bg-danger";
            html += `<tr>
                <td class="ps-4">${c.date}</td><td>${formatTimeOnly(c.time)}</td>
                <td><strong>${c.name}</strong></td>
                <td class="pe-4"><span class="badge ${badge}">${c.status}</span></td>
            </tr>`;
        });
    }
    html += `</tbody></table></div></div>`;
    contentDiv.innerHTML = html;
}

// ─── ADD PILLS ───────────────────────────────────────────────────────────────

function loadAddPills() {
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

async function fetchPillsList() {
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

async function submitPill() {
    const name   = document.getElementById("pillName").value.trim();
    const timeEl = document.getElementById("pillTime");
    const dose   = document.getElementById("pillDose").value.trim();
    const repeat = document.querySelector('input[name="repeat"]:checked')?.value || "none";

    if (!name || !dose) { alert("Vyplňte všechny údaje!"); return; }
    if (!timeEl.value)  { alert("Vyplňte čas!"); return; }

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
    if (r.ok) loadAddPills();
    else alert("Chyba při ukládání.");
}

async function deletePill(id) {
    if (!confirm("Opravdu smazat tento lék?")) return;
    const r = await fetchWithAuth(`/api/pills/${id}`, {method: "DELETE"});
    if (r.ok) fetchPillsList();
    else alert("Chyba při mazání.");
}

function updateTimeInput(repeat) {
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

// ─── PLNĚNÍ DÁVKOVAČE ────────────────────────────────────────────────────────

async function startFillingProcess() {
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

    window.currentFillPlan = data.plan;

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

// ── Souhrnná stránka před potvrzením ────────────────────────────────────────

function showFillSummary() {
    const plan = window.currentFillPlan;
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

// ── Potvrzení do DB ──────────────────────────────────────────────────────────

async function confirmFilling(btn) {
    const plan = window.currentFillPlan;
    if (!plan) { alert("Plán nenalezen."); return; }

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Ukládám...`;

    const r = await fetchWithAuth("/api/confirm-fill", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(plan)
    });

    if (r.ok) {
        loadDispensorContent();
    } else {
        alert("Chyba při ukládání.");
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-check-circle me-2"></i>Uložit do DB a odeslat MCU`;
    }
}

// ── Carousel helpers ─────────────────────────────────────────────────────────

function moveCarousel(dir, idx, total) {
    const c = bootstrap.Carousel.getOrCreateInstance(document.getElementById("fillCarousel"));
    dir === "next" ? c.next() : c.prev();
    updateCarouselUI(dir === "next" ? idx+1 : idx-1, total);
}

function jumpToStep(idx, total) {
    bootstrap.Carousel.getOrCreateInstance(document.getElementById("fillCarousel")).to(idx);
    updateCarouselUI(idx, total);
}

function updateCarouselUI(idx, total) {
    const bar   = document.getElementById("fill-progress-bar");
    const label = document.getElementById("carousel-progress");
    if (bar)   bar.style.width = Math.round((idx+1)/total*100) + "%";
    if (label) label.textContent = `Krok ${idx+1} z ${total}`;
    document.querySelectorAll(".step-btn").forEach((b,i) => {
        b.className = `btn btn-sm ${i===idx?"btn-primary":"btn-outline-secondary"} step-btn`;
    });
}

// ─── OBSAH DÁVKOVAČE ─────────────────────────────────────────────────────────

async function loadDispensorContent() {
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
                            <tr><th class="ps-4" style="width:100px;">Patro</th><th style="width:130px;">Přihrádka č.</th><th>Čas podání</th><th class="pe-4">Léky</th></tr>
                        </thead><tbody>`;
            for (let pos = 1; pos <= 7; pos++) {
                const item = byLayer[layer].find(x => x.position === pos);
                if (item) {
                    html += `<tr>
                        <td class="ps-4"><span class="badge bg-primary">Patro ${item.layer}</span></td>
                        <td><span class="badge bg-danger fs-6 px-3">${item.compartment || item.position}</span></td>
                        <td><strong>${formatDateStr(item.time)}</strong></td>
                        <td class="pe-4"><small>${item.content}</small></td>
                    </tr>`;
                } else {
                    html += `<tr class="table-light">
                        <td class="ps-4"><span class="badge bg-light text-muted border rounded-pill px-3">Pozice ${pos}</span></td>
                        <td colspan="2" class="text-muted fst-italic"><small>— prázdné —</small></td>
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

// ─── VYSYPÁNÍ DÁVKOVAČE ──────────────────────────────────────────────────────

async function emptyDispenser() {
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

async function confirmEmptyAndFill() {
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

// ─── TABULKA HISTORIE VÁHY ───────────────────────────────────────────────────

async function loadCustomTable() {
    // 1. ZMĚNA: Správné URL pro historii váhy
    const r = await fetchWithAuth("/api/scale/history");

    if (!r.ok) {
        contentDiv.innerHTML = `
            <h2 class="mb-4">Historie vážení</h2>
            <div class="alert alert-danger">
                Nepodařilo se načíst data z váhy.
            </div>`;
        return;
    }

    const data = await r.json();
    const currentHeight = localStorage.getItem("userHeight_cm") || 175;

    let html = `
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h2><i class="bi bi-speedometer me-2 text-secondary"></i>Historie vážení</h2>
        <div class="d-flex align-items-center gap-2">
            <label class="text-muted text-nowrap">Vaše výška (cm):</label>
            <input type="number" id="heightInput" class="form-control form-control-sm" value="${currentHeight}" style="width: 80px;" onchange="updateHeight()">
        </div>
    </div>
    
    <div class="row mb-4">
        <div class="col-md-8">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-header bg-white">
                    <h5 class="mb-0 text-primary"><i class="bi bi-graph-up me-2"></i>Vývoj váhy</h5>
                </div>
                <div class="card-body">
                    <canvas id="weightChart" style="max-height: 300px; width: 100%;"></canvas>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-header bg-white text-center">
                    <h5 class="mb-0 text-info"><i class="bi bi-activity me-2"></i>Aktuální BMI</h5>
                </div>
                <div class="card-body d-flex flex-column align-items-center justify-content-center">
                    <div style="position: relative; width: 100%; max-width: 250px;">
                        <canvas id="bmiChart"></canvas>
                        <div id="bmiText" class="position-absolute w-100 text-center" style="top: 60%; left: 0; transform: translateY(-50%);">
                            <h3 class="mb-0 fw-bold" id="bmiValue">--</h3>
                            <small class="text-muted fw-bold" id="bmiLabel">Neznámé</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="card shadow-sm border-0">
        <div class="card-body p-0">
            <table class="table table-striped align-middle mb-0">
                <thead class="table-dark">
                    <tr>
                        <th class="ps-4">ID</th>
                        <th>Datum a čas</th>
                        <th>Trend (Změna)</th>
                        <th class="pe-4">Naměřená váha</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // 2. ZMĚNA: data je rovnou pole (Array), nikoliv data.items
    if (!data || data.length === 0) {
        html += `<tr><td colspan="4" class="text-center py-4 text-muted">Zatím se nikdo nevážil.</td></tr>`;
    } else {
        // Vykreslení jednotlivých řádků
        data.forEach((item, index) => {
            let trendHtml = `<span class="text-muted">—</span>`; // Pro první naměřenou hodnotu neznáme předchozí
            
            // Protože jsou data od nejnovějšího po nejstarší, porovnáme s hodnotou index + 1
            if (index < data.length - 1) {
                const prevItem = data[index + 1];
                const diff = parseFloat(item.weight) - parseFloat(prevItem.weight);
                
                if (diff > 0) {
                    trendHtml = `<span class="text-danger fw-bold"><i class="bi bi-arrow-up-right me-1"></i>+${diff.toFixed(1)} kg</span>`;
                } else if (diff < 0) {
                    trendHtml = `<span class="text-success fw-bold"><i class="bi bi-arrow-down-right me-1"></i>${diff.toFixed(1)} kg</span>`;
                } else {
                    trendHtml = `<span class="text-muted fw-bold"><i class="bi bi-dash me-1"></i>0.0 kg</span>`;
                }
            }

            html += `<tr>
                <td class="ps-4">${item.id || "-"}</td>
                <td>${formatDateStr(item.timestamp)}</td>
                <td>${trendHtml}</td>
                <td class="pe-4"><span class="badge bg-primary fs-6">${item.weight} kg</span></td>
            </tr>`;
        });
    }

    html += `
                </tbody>
            </table>
        </div>
    </div>`;

    contentDiv.innerHTML = html;

    // Vykreslení grafů
    if (data && data.length > 0) {
        // Data grafu váhy
        const reversedData = [...data].reverse();
        const labels = reversedData.map(item => formatDateStr(item.timestamp));
        const weights = reversedData.map(item => parseFloat(item.weight));

        const ctx = document.getElementById('weightChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Naměřená váha (kg)',
                    data: weights,
                    borderColor: 'rgba(13, 110, 253, 1)', // Bootstrap primary
                    backgroundColor: 'rgba(13, 110, 253, 0.2)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(13, 110, 253, 1)',
                    pointRadius: 4,
                    fill: true,
                    tension: 0.3 // lehce zaoblená křivka
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        title: { display: true, text: 'Váha (kg)' }
                    },
                    x: {
                        ticks: {
                            maxTicksLimit: 10 // nezahltit osu X hromadou popisků
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + ' kg';
                            }
                        }
                    }
                }
            }
        });

        // Výpočet BMI z nejnovější váhy (první v poli dat)
        const latestWeight = parseFloat(data[0].weight);
        const heightM = parseFloat(document.getElementById("heightInput").value) / 100;
        
        if (heightM > 0) {
            const bmi = latestWeight / (heightM * heightM);
            let bmiStatus = "";
            let pointerColor = "";
            
            if (bmi < 18.5) { bmiStatus = "Podváha"; pointerColor = "#0dcaf0"; }
            else if (bmi < 25) { bmiStatus = "Normální"; pointerColor = "#198754"; }
            else if (bmi < 30) { bmiStatus = "Nadváha"; pointerColor = "#ffc107"; }
            else { bmiStatus = "Obezita"; pointerColor = "#dc3545"; }

            document.getElementById("bmiValue").textContent = bmi.toFixed(1);
            document.getElementById("bmiLabel").textContent = bmiStatus;
            document.getElementById("bmiLabel").style.color = pointerColor;

            // Rotační úhel pro jehlu / segmenty
            // Rozsah BMI: 15 (min) - 40 (max)
            const minBmi = 15;
            const maxBmi = 40;
            let normalizedBmi = Math.max(minBmi, Math.min(bmi, maxBmi));
            let bmiValuePercent = (normalizedBmi - minBmi) / (maxBmi - minBmi);

            // Vytvoření půlkruhového gauge grafu
            const ctxBmi = document.getElementById('bmiChart').getContext('2d');
            new Chart(ctxBmi, {
                type: 'doughnut',
                data: {
                    labels: ['Podváha', 'Normální', 'Nadváha', 'Obezita'],
                    datasets: [{
                        data: [18.5 - 15, 25 - 18.5, 30 - 25, 40 - 30], // šířky segmentů podle BMI stupnice
                        backgroundColor: ['#0dcaf0', '#198754', '#ffc107', '#dc3545'],
                        borderWidth: 0,
                        cutout: '75%'
                    }]
                },
                options: {
                    rotation: -90,
                    circumference: 180,
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    },
                    animation: {
                        onComplete: function(animation) {
                            // Dovyreslení ukazatele
                            const chart = animation.chart;
                            const ctx = chart.ctx;
                            const chartArea = chart.chartArea;
                            
                            const centerX = (chartArea.left + chartArea.right) / 2;
                            const centerY = chartArea.bottom; // spodek chartArea kvůli půlkruhu
                            
                            const angle = Math.PI - (bmiValuePercent * Math.PI); // odleva doprava

                            const innerRadius = chart.innerRadius;
                            const outerRadius = chart.outerRadius;
                            const pointerLength = outerRadius - 10;
                            
                            const tipX = centerX - pointerLength * Math.cos(angle);
                            const tipY = centerY - pointerLength * Math.sin(angle);
                            
                            ctx.save();
                            ctx.beginPath();
                            ctx.moveTo(centerX, centerY);
                            ctx.lineTo(tipX, tipY);
                            ctx.lineWidth = 4;
                            ctx.strokeStyle = '#333';
                            ctx.stroke();
                            
                            ctx.beginPath();
                            ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
                            ctx.fillStyle = '#333';
                            ctx.fill();
                            ctx.restore();
                        }
                    }
                }
            });
        }
    }
}

function updateHeight() {
    const h = document.getElementById("heightInput").value;
    if (h) {
        localStorage.setItem("userHeight_cm", h);
        loadCustomTable(); // překreslí graf
    }
}

// ─── PING DISPENSER ─────────────────────────────────────────────────────────

async function pingDispenser() {
    const btn        = document.getElementById("ping-dispenser-btn");
    const iconEl     = document.getElementById("dispenser-status-icon");
    const textEl     = document.getElementById("dispenser-status-text");
    const latencyEl  = document.getElementById("dispenser-latency");

    if (!btn) return;

    // Stav: čekám
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Čekám...`;
    iconEl.innerHTML  = `<i class="bi bi-capsule text-muted"></i>`;
    textEl.textContent = "Odesílám ping...";
    textEl.className   = "fw-bold text-muted";
    latencyEl.textContent = "—";

    const r = await fetchWithAuth("/api/ping-dispenser?timeout=5");
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-wifi me-1"></i>Ping`;

    if (!r.ok) {
        iconEl.innerHTML   = `<i class="bi bi-capsule text-danger"></i>`;
        textEl.textContent = "Chyba API";
        textEl.className   = "fw-bold text-danger";
        return;
    }

    const data = await r.json();

    if (data.status === "online") {
        iconEl.innerHTML   = `<i class="bi bi-capsule text-success"></i>`;
        textEl.textContent = "Připojeno";
        textEl.className   = "fw-bold text-success";
        latencyEl.textContent = data.latency_ms !== null ? `${data.latency_ms} ms` : "";
    } else {
        iconEl.innerHTML   = `<i class="bi bi-capsule text-danger"></i>`;
        textEl.textContent = "Nedostupné";
        textEl.className   = "fw-bold text-danger";
        latencyEl.textContent = "Timeout (5s)";
    }
}

// ─── PING SCALE ─────────────────────────────────────────────────────────────

async function pingScale() {
    const btn        = document.getElementById("ping-scale-btn");
    const iconEl     = document.getElementById("scale-status-icon");
    const textEl     = document.getElementById("scale-status-text");
    const latencyEl  = document.getElementById("scale-latency");

    if (!btn) return;

    // Stav: čekám
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Čekám...`;
    iconEl.innerHTML  = `<i class="bi bi-speedometer text-muted"></i>`;
    textEl.textContent = "Odesílám ping...";
    textEl.className   = "fw-bold text-muted";
    latencyEl.textContent = "—";

    const r = await fetchWithAuth("/api/ping-scale?timeout=5");
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-wifi me-1"></i>Ping`;

    if (!r.ok) {
        iconEl.innerHTML   = `<i class="bi bi-speedometer text-danger"></i>`;
        textEl.textContent = "Chyba API";
        textEl.className   = "fw-bold text-danger";
        return;
    }

    const data = await r.json();

    if (data.status === "online") {
        iconEl.innerHTML   = `<i class="bi bi-speedometer text-success"></i>`;
        textEl.textContent = "Připojeno";
        textEl.className   = "fw-bold text-success";
        latencyEl.textContent = data.latency_ms !== null ? `${data.latency_ms} ms` : "";
    } else {
        iconEl.innerHTML   = `<i class="bi bi-speedometer text-danger"></i>`;
        textEl.textContent = "Nedostupné";
        textEl.className   = "fw-bold text-danger";
        latencyEl.textContent = "Timeout (5s)";
    }
}

// ─── PING MCU (stará funkce - kompatibilita) ─────────────────────────────────

async function pingDevice() {
    // Zastaralá funkce — volej přímo pingDispenser() nebo pingScale()
    await pingDispenser();
}
