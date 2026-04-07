// ═══════════════════════════════════════════════════════════════════════════════
// APP.js - Hlavní inicializační modul
// Provádí inicializaci aplikace a exportuje veřejné funkce do globálního scope
// ═══════════════════════════════════════════════════════════════════════════════

// Importy
import { initApp } from './core.js';
import { login, logout, fetchWithAuth } from './auth.js';
import { loadDashboard } from './dashboard.js';
import { loadConsumption, deleteConsumption } from './consumption.js';
import { loadAddPills, submitPill, deletePill, updateTimeInput, fetchPillsList } from './pills.js';
import { loadCustomTable, updateHeight } from './scale.js';
import { startFillingProcess, showFillSummary, confirmFilling, moveCarousel, jumpToStep } from './filling.js';
import { loadDispensorContent, emptyDispenser, confirmEmptyAndFill, deleteLoadedPill } from './dispenser.js';
import { pingDispenser, pingScale, pingDevice } from './ping.js';

// Export veřejných funkcí do globálního scope (pro onclick handlery v HTML)
window.login = login;
window.logout = logout;
window.loadDashboard = loadDashboard;
window.loadConsumption = loadConsumption;
window.deleteConsumption = deleteConsumption;
window.loadAddPills = loadAddPills;
window.submitPill = submitPill;
window.deletePill = deletePill;
window.updateTimeInput = updateTimeInput;
window.loadCustomTable = loadCustomTable;
window.updateHeight = updateHeight;
window.startFillingProcess = startFillingProcess;
window.showFillSummary = showFillSummary;
window.confirmFilling = confirmFilling;
window.moveCarousel = moveCarousel;
window.jumpToStep = jumpToStep;
window.loadDispensorContent = loadDispensorContent;
window.emptyDispenser = emptyDispenser;
window.confirmEmptyAndFill = confirmEmptyAndFill;
window.deleteLoadedPill = deleteLoadedPill;
window.pingDispenser = pingDispenser;
window.pingScale = pingScale;
window.pingDevice = pingDevice;

// Inicializace aplikace
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

