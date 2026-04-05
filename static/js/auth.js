// ═══════════════════════════════════════════════════════════════════════════════
// AUTH.js - Autentifikace a autorizace
// ═══════════════════════════════════════════════════════════════════════════════

import { setToken, showApp, hideApp } from './core.js';

let token = localStorage.getItem("token") || null;

export function getToken() {
    return token;
}

export async function login() {
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
        setToken(token);
        localStorage.setItem("token", token);
        showApp();
        // Dynamický import a zavolání loadDashboard
        import('./dashboard.js').then(mod => mod.loadDashboard());
    } else {
        alert("Nesprávné jméno nebo heslo!");
    }
}

export function logout() {
    localStorage.removeItem("token");
    token = null;
    setToken(null);
    hideApp();
}

export async function fetchWithAuth(url, options = {}) {
    if (!options.headers) options.headers = {};
    options.headers["Authorization"] = `Bearer ${token}`;
    const r = await fetch(url, options);
    if (r.status === 401) logout();
    return r;
}


