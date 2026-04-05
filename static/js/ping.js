// ═══════════════════════════════════════════════════════════════════════════════
// PING.js - Komunikace s IoT zařízeními
// ═══════════════════════════════════════════════════════════════════════════════

import { fetchWithAuth } from './auth.js';

export async function pingDispenser() {
    const btn        = document.getElementById("ping-dispenser-btn");
    const iconEl     = document.getElementById("dispenser-status-icon");
    const textEl     = document.getElementById("dispenser-status-text");
    const latencyEl  = document.getElementById("dispenser-latency");

    if (!btn) return;

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

export async function pingScale() {
    const btn        = document.getElementById("ping-scale-btn");
    const iconEl     = document.getElementById("scale-status-icon");
    const textEl     = document.getElementById("scale-status-text");
    const latencyEl  = document.getElementById("scale-latency");

    if (!btn) return;

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

// Zpětná kompatibilita
export async function pingDevice() {
    await pingDispenser();
}

