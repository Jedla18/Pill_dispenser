// ═══════════════════════════════════════════════════════════════════════════════
// CORE.js - Inicializace a globální stav
// ═══════════════════════════════════════════════════════════════════════════════

// DOM elementy
export const contentDiv = document.getElementById("main-content");
export const loginView  = document.getElementById("login-view");
export const appView    = document.getElementById("app-view");

// Globální stav
export let token = localStorage.getItem("token");

// Pomocný objekt pro sdílení stavu mezi moduly
export const state = {
    currentFillPlan: null
};

// Inicializace aplikace
export function initApp() {
    if (token) {
        showApp();
    }
}

export function showApp() {
    loginView.classList.remove("d-flex");
    loginView.classList.add("d-none");
    appView.style.display = "block";
}

export function hideApp() {
    appView.style.display = "none";
    loginView.classList.remove("d-none");
    loginView.classList.add("d-flex");
}

export function setToken(newToken) {
    token = newToken;
}

