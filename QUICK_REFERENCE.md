# 📚 Referenční průvodce - Kde najít co

## Rychlý přehled souborů

### 🎯 Hlavní vstupní bod
**File:** `/static/js/app.js` (45 řádků)
- Provádí import všech modulů
- Exportuje funkce do globálního scope
- Inicializace aplikace na DOMContentLoaded

### 🔐 Autentifikace
**File:** `/static/js/auth.js` (50 řádků)
- `login()` - přihlášení
- `logout()` - odhlášení  
- `fetchWithAuth()` - API volání s tokenem

### 🏠 Hlavní stránka
**File:** `/static/js/dashboard.js` (100 řádků)
- `loadDashboard()` - zobrazí přehled
- Karty se souhrnem léků, dávkovače, vrstev

### 💊 Správa léků
**File:** `/static/js/pills.js` (170 řádků)
- `loadAddPills()` - stránka formuláře
- `submitPill()` - uložit nový lék
- `deletePill()` - smazat lék
- `updateTimeInput()` - změnit typ času

### 📊 Plnění dávkovače
**File:** `/static/js/filling.js` (330 řádků) ⚠️ NEJVĚTŠÍ
- `startFillingProcess()` - zahájit plnění
- `showFillSummary()` - shrnutí
- `confirmFilling()` - uložit do DB
- Carousel navigace

### 📦 Obsah dávkovače
**File:** `/static/js/dispenser.js` (100 řádků)
- `loadDispensorContent()` - zobrazit obsah
- `emptyDispenser()` - vysypat
- `confirmEmptyAndFill()` - vysypat + plnit

### 🥤 Historie váhy
**File:** `/static/js/scale.js` (200 řádků)
- `loadCustomTable()` - tabulka + grafy
- `updateHeight()` - přepočítat BMI
- Chart.js integrace

### 📈 Historie odběrů
**File:** `/static/js/consumption.js` (40 řádků)
- `loadConsumption()` - zobrazit historii

### 🌐 IoT komunikace
**File:** `/static/js/ping.js` (80 řádků)
- `pingDispenser()` - ping na dávkovač
- `pingScale()` - ping na váhu

### ⚙️ Globální stav
**File:** `/static/js/core.js` (40 řádků)
- `token` - aktuální JWT token
- `contentDiv` - hlavní obsah
- `state.currentFillPlan` - plán plnění

### 🔧 Pomocné funkce
**File:** `/static/js/helpers.js` (60 řádků)
- `formatDateStr()` - datum + čas na CZ
- `formatPillTime()` - čas podání léku
- `repeatBadge()` - HTML badge opakování
- `DAYS_CS` - názvy dní

### 📖 Dokumentace
- `README.md` - architektura
- `TESTING_GUIDE.md` - jak testovat
- `DEPENDENCY_DIAGRAM.md` - grafy závislostí
- `MIGRATION_CHECKLIST.txt` - seznam funkcí

---

## Jak přidat novou funkcionalitu?

### 1️⃣ Přidat nový modul

Pokud chceš přidat zcela novou doménu (např. Reports):

```javascript
// static/js/reports.js
import { contentDiv } from './core.js';
import { fetchWithAuth } from './auth.js';
import { formatDateStr } from './helpers.js';

export async function loadReports() {
    // ... tvůj kód
}
```

### 2️⃣ Exportovat do app.js

```javascript
// static/js/app.js
import { loadReports } from './reports.js';

window.loadReports = loadReports;
```

### 3️⃣ Přidat tlačítko v HTML

```html
<a class="nav-link" onclick="loadReports()">Reporty</a>
```

---

## Jak debugovat?

### Otevřít Developer Tools
- Chrome: `F12`
- Firefox: `F12`
- Safari: `Cmd+Option+I`

### Console
```javascript
// Zkontrolovat, zda je funkce dostupná
typeof login           // 'function'
typeof loadDashboard   // 'function'

// Zkontrolovat globální stav
window.token           // JWT token
window.contentDiv      // DOM element
```

### Network tab
- Zkontrolovat, zda se načtou všechny moduly
- Zkontrolovat HTTP status (200, 401, apod.)
- Hledat 404 chyby

### Sources tab
- Debugovat kód
- Breakpoints
- Profiling

---

## Chyby a řešení

### ❌ "fetch is not defined"
**Příčina:** Stary prohlížeč  
**Řešení:** Upgrade prohlížeče

### ❌ "Cannot import"
**Příčina:** Chybný path k modulu  
**Řešení:** Zkontrolovat jméno souboru (case-sensitive)

### ❌ "onclick is not a function"
**Příčina:** Funkce není v window scope  
**Řešení:** Přidat do `app.js` export

### ❌ "401 Unauthorized"
**Příčina:** Token vypršel nebo je neplatný  
**Řešení:** Odhlásit a znovu přihlásit

### ❌ "token is undefined"
**Příčina:** Token nebyl uložen  
**Řešení:** Přihlásit se znovu

---

## Struktura složky

```
static/js/
├── app.js              # ← ZAČNI TADY
├── core.js             # Globální stav
├── auth.js             # Autentifikace
├── helpers.js          # Utility
├── dashboard.js        # Přehled
├── pills.js            # Léky
├── consumption.js      # Historie
├── filling.js          # Plnění
├── dispenser.js        # Obsah
├── scale.js            # Váha
├── ping.js             # IoT
├── script_backup.js           # STARÝ - nezapisovat!
└── README.md           # Dokumentace

templates/
└── index.html          # HTML template
```

---

## Příkazové řádky (terminál)

```bash
# Spustit Flask aplikaci
python -m flask run

# S auto-reload
python -m flask run --reload

# Zkontrolovat Python balíky
pip list

# Nainstalovat balíky
pip install -r requirements.txt
```

---

## Zajímavá místa v kódu

### localStorage
```javascript
// V auth.js
localStorage.setItem("token", token);
let token = localStorage.getItem("token") || null;

// V scale.js
localStorage.getItem("userHeight_cm") || 175;
```

### Dynamic imports
```javascript
// V auth.js - dynamický import po přihlášení
import('./dashboard.js').then(mod => mod.loadDashboard());
```

### ES6 features
```javascript
// Template literals
`<span>${value}</span>`

// Arrow functions
data.forEach(item => { ... })

// Destructuring
import { login, logout } from './auth.js'

// Async/await
async function loadDashboard() { ... }
```

---

## Tipy a triky

✅ Použij Console pro testování funkcí:
```javascript
login();
loadDashboard();
fetchWithAuth('/api/pills').then(r => r.json()).then(console.log);
```

✅ Zkontroluj Network traffic:
```
API Call → Network tab → Response
```

✅ Prohledávej kód:
```
Ctrl+Shift+F v VS Code
```

✅ Formátuj kód:
```
Shift+Alt+F v VS Code
```

---

**Máš něco nejasného? Podívej se na TESTING_GUIDE.md nebo DEPENDENCY_DIAGRAM.md! 🎉**

