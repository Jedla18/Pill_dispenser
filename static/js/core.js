// ═══════════════════════════════════════════════════════════════════════════════
// CORE.js - Inicializace a globální stav
// ═══════════════════════════════════════════════════════════════════════════════


import { login } from './auth.js'
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
    console.log("core.js: initApp() called.");
    if (token) {
        console.log("core.js: Token found, showing app.");
        showApp();
    } else {
        console.log("core.js: No token, showing login view.");
    }
    // Přidá event listener na přihlašovací tlačítko
    setupLoginButton();
}

export function setupLoginButton() {
    console.log("core.js: setupLoginButton() called.");
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        console.log("core.js: Login button found, adding click listener.");
        loginBtn.addEventListener('click', async () => {
            console.log("core.js: Login button clicked.");
            await login(); // Zavoláš přímo importovanou funkci
        });
    } else {
        console.error("core.js: Login button #login-btn not found!");
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
