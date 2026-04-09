// ═══════════════════════════════════════════════════════════════════════════════
// AUTH.js - Autentifikace a autorizace
// ═══════════════════════════════════════════════════════════════════════════════

import { setToken, showApp, hideApp } from './core.js';
import { showToast } from './helpers.js';

let token = localStorage.getItem("token") || null;

export function getToken() {
    return token;
}

export async function login() {
    console.log("auth.js: login() function called.");
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;

    if (!user || !pass) {
        console.log("auth.js: Username or password missing.");
        showToast("Zadejte prosím uživatelské jméno i heslo.", "danger");
        return;
    }

    console.log(`auth.js: Attempting to log in user: ${user}`);
    showToast("Probíhá přihlašování...", "info");

    const formData = new URLSearchParams();
    formData.append("username", user);
    formData.append("password", pass);
    
    try {
        const r = await fetch("/token", {
            method: "POST",
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            body: formData
        });

        console.log(`auth.js: Fetch response status: ${r.status}`);

        if (r.ok) {
            const data = await r.json();
            console.log("auth.js: Login successful, token received.");
            token = data.access_token;
            setToken(token);
            localStorage.setItem("token", token);
            showApp();
            showToast("Přihlášení proběhlo úspěšně!", "success");
            // Dynamický import a zavolání loadDashboard
            import('./dashboard.js').then(mod => mod.loadDashboard());
        } else {
            console.error("auth.js: Login failed. Status:", r.status);
            const errorText = await r.text();
            console.error("auth.js: Error response:", errorText);
            showToast("Nesprávné jméno nebo heslo!", "danger");
        }
    } catch (error) {
        console.error("auth.js: An error occurred during fetch:", error);
        showToast("Došlo k chybě sítě. Zkuste to prosím znovu.", "danger");
    }
}

export function logout() {
    localStorage.removeItem("token");
    token = null;
    setToken(null);
    hideApp();
    showToast("Byli jste odhlášeni.", "info");
}

export async function fetchWithAuth(url, options = {}) {
    if (!options.headers) options.headers = {};
    options.headers["Authorization"] = `Bearer ${token}`;
    const r = await fetch(url, options);
    if (r.status === 401) {
        logout();
        showToast("Vaše sezení vypršelo, přihlaste se prosím znovu.", "danger");
    }
    return r;
}
