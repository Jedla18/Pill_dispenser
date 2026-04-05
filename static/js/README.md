# JavaScript Modulární Struktura

Původní soubor `script_backup.js` (1298 řádků) byl rozčleněn na následující moduly:

## Architektura

```
static/js/
├── app.js              # Inicializace a export veřejných funkcí
├── core.js             # Globální stav a DOM elementy
├── helpers.js          # Formátovací funkce a konstanty
├── auth.js             # Autentifikace a fetchWithAuth
├── dashboard.js        # Hlavní dashboard
├── pills.js            # Správa léků (přidání, smazání)
├── consumption.js      # Historie odběrů
├── filling.js          # Plnění dávkovače (největší modul)
├── dispenser.js        # Obsah dávkovače a vysypání
├── scale.js            # Historie váhy a BMI
└── ping.js             # IoT komunikace (ping)
```

## Popis modulů

### **core.js** (~40 řádků)
- Inicializace aplikace
- Globální DOM elementy (`contentDiv`, `loginView`, `appView`)
- Globální stav (`token`)
- Pomocný objekt `state` pro sdílení dat mezi moduly

### **helpers.js** (~60 řádků)
- Formátovací funkce pro data/časy
- `formatDateStr()` - formátování ISO datetime na českou lokalizaci
- `formatPillTime()` - speciální formátování času podání léků
- `formatTimeOnly()` - pouze čas
- `repeatBadge()` - HTML badge pro opakování
- Konstanta `DAYS_CS` - názvy dní v češtině

### **auth.js** (~50 řádků)
- `login()` - přihlášení uživatele
- `logout()` - odhlášení
- `fetchWithAuth()` - fetch s Authorization headrem

### **dashboard.js** (~100 řádků)
- `loadDashboard()` - hlavní přehledová stránka
- Zobrazuje souhrn léků, dávkovače, plánované léky

### **pills.js** (~170 řádků)
- `loadAddPills()` - stránka pro přidání léků
- `fetchPillsList()` - načtení seznamu léků
- `submitPill()` - odesílání nového léku
- `deletePill()` - mazání léku
- `updateTimeInput()` - změna vstupu času při změně typu opakování

### **consumption.js** (~40 řádků)
- `loadConsumption()` - tabulka historie odběrů

### **filling.js** (~300 řádků)
- **Největší modul** - plnění dávkovače
- `startFillingProcess()` - iniciace průvodce plnění
- `showFillSummary()` - shrnutí plnění
- `confirmFilling()` - uložení do databáze
- `moveCarousel()`, `jumpToStep()` - navigace v carouselu
- `updateCarouselUI()` - aktualizace UI během navigace

### **dispenser.js** (~100 řádků)
- `loadDispensorContent()` - zobrazení obsahu dávkovače
- `emptyDispenser()` - vysypání dávkovače
- `confirmEmptyAndFill()` - vysypání + zahájení plnění

### **scale.js** (~200 řádků)
- `loadCustomTable()` - tabulka s grafem váhy a BMI
- `updateHeight()` - aktualizace výšky pro výpočet BMI
- Vykreslování grafů pomocí Chart.js

### **ping.js** (~80 řádků)
- `pingDispenser()` - ping na dávkovač
- `pingScale()` - ping na váhu
- `pingDevice()` - zpětná kompatibilita

### **app.js** (~50 řádků)
- Centrální bod inicializace
- Import všech modulů
- Export funkcí do globálního scope (`window`)
- DOMContentLoaded listener pro inicializaci

## Závislosti mezi moduly

```
app.js (vstupní bod)
├── core.js (globální stav) ← používáno všemi
├── auth.js ← používáno všemi (fetchWithAuth)
├── helpers.js ← používáno: dashboard, pills, filling, dispenser, scale
├── dashboard.js ← import: core, auth, helpers
├── pills.js ← import: core, auth, helpers
├── consumption.js ← import: core, auth, helpers
├── filling.js ← import: core, auth, helpers, dispenser, dashboard
├── dispenser.js ← import: core, auth, helpers, dashboard, filling
├── scale.js ← import: core, auth, helpers
└── ping.js ← import: auth
```

## Migrace z původního script_backup.js

**Před:**

```html

<script src="/static/js/script_backup.js?v=2"></script>
```

**Po:**
```html
<script type="module" src="/static/js/app.js"></script>
```

## Zpětná kompatibilita

Všechny veřejné funkce jsou exportovány do globálního scope (`window`) tak, aby fungovaly `onclick` handlery v HTML beze změn:

```html
<button onclick="login()">Přihlásit</button>
<button onclick="loadDashboard()">Dashboard</button>
<!-- ... apod. -->
```

## Přínosy modulární struktury

✅ **Čitelnost** - Menší soubory jsou snáze pochopitelné  
✅ **Údržba** - Změny v jedné doméně neovlivňují ostatní  
✅ **Testování** - Jednotlivé moduly lze testovat izolovaně  
✅ **Opětovné použití** - Funkce lze importovat v jiných projektech  
✅ **Výkon** - Moduly se mohou načítat asynchronně  

## Budoucí úpravy

Pokud chcete dále optimalizovat:
- Zvážit bundler (Webpack, Vite) pro produkci
- Přidat TypeScript pro typovou bezpečnost
- Rozdělit velké moduly (filling.js, scale.js) na menší

