# 📊 Diagram závislostí mezi moduly

## Architektura - Tok dat

```
┌─────────────────────────────────────────────────────────────────┐
│                       index.html                                │
│  <script type="module" src="/static/js/app.js"></script>       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       app.js                                    │
│  Centrální bod inicializace a export do window                 │
└─┬─────────┬──────────┬────────┬────────┬────────┬─────────────┬┘
  │         │          │        │        │        │             │
  ▼         ▼          ▼        ▼        ▼        ▼             ▼
core     auth      dashboard   pills   filling  consumption    ping
├─────────────────────────────────────────────────────────────┤
│              Všechny moduly                                 │
└──────┬───────────────────────────┬──────────────────────────┘
       │                           │
       ▼                           ▼
    helpers                    dispenser
    (formát)                   (obsah)
       │                           │
       └───────────┬───────────────┘
                   │
                   ▼
              scale (váha)

```

## Detailní graf importů

```
┌──────────────────────────────────────────────────────────────┐
│  CORE LAYER - Globální stav                                 │
├──────────────────────────────────────────────────────────────┤
│  
│  core.js
│  ├─ token              (localStorage)
│  ├─ contentDiv         (DOM #main-content)
│  ├─ loginView          (DOM #login-view)
│  ├─ appView            (DOM #app-view)
│  └─ state.currentFillPlan
│
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  AUTH LAYER - Autentifikace                                 │
├──────────────────────────────────────────────────────────────┤
│
│  auth.js
│  ├─ import: core
│  ├─ login()            ← HTML onclick
│  ├─ logout()           ← HTML onclick
│  └─ fetchWithAuth()    ← použito všude
│
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  HELPERS LAYER - Utility funkce                             │
├──────────────────────────────────────────────────────────────┤
│
│  helpers.js            (bez importů!)
│  ├─ DAYS_CS            (konstanta)
│  ├─ formatDateStr()
│  ├─ formatPillTime()
│  ├─ formatTimeOnly()
│  └─ repeatBadge()
│
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  FEATURE LAYERS - Hlavní funkcionality                       │
├──────────────────────────────────────────────────────────────┤
│
│  dashboard.js                 │  consumption.js
│  ├─ import: core, auth        │  ├─ import: core, auth
│  ├─ import: helpers           │  ├─ import: helpers
│  └─ loadDashboard()           │  └─ loadConsumption()
│
│  pills.js                     │  scale.js
│  ├─ import: core, auth        │  ├─ import: core, auth
│  ├─ import: helpers           │  ├─ import: helpers
│  ├─ loadAddPills()            │  ├─ loadCustomTable()
│  ├─ submitPill()              │  └─ updateHeight()
│  ├─ deletePill()              │
│  └─ updateTimeInput()         │
│
│  ping.js
│  ├─ import: auth
│  ├─ pingDispenser()
│  ├─ pingScale()
│  └─ pingDevice()
│
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  COMPLEX LAYERS - Komplexní funkcionality                    │
├──────────────────────────────────────────────────────────────┤
│
│  filling.js                       dispenser.js
│  ├─ import: core, auth            ├─ import: core, auth
│  ├─ import: helpers               ├─ import: helpers
│  ├─ import: dispenser ◄─┐         ├─ import: dashboard
│  ├─ import: dashboard   │         ├─ import: filling
│  ├─ startFillingProcess()│         ├─ loadDispensorContent()
│  ├─ showFillSummary()   │         ├─ emptyDispenser()
│  ├─ confirmFilling()    │         └─ confirmEmptyAndFill()
│  ├─ moveCarousel()      │
│  └─ jumpToStep()        │
│                         │
└─────────────────────────┘
       ▲
       └─ Cyklická dependency (OK - voláno z app.js)
          Filling importuje Dispenser
          Dispenser importuje Filling (jen pro type, dynamicky)

```

## Tok importu při spuštění

```
1. Prohlížeč zavádí app.js (module)

2. app.js importuje:
   ├─ core.js
   ├─ auth.js (import core)
   ├─ dashboard.js (import core, auth, helpers)
   ├─ consumption.js (import core, auth, helpers)
   ├─ pills.js (import core, auth, helpers)
   ├─ scale.js (import core, auth, helpers)
   ├─ filling.js (import core, auth, helpers, dispenser, dashboard)
   ├─ dispenser.js (import core, auth, helpers, dashboard, filling)
   └─ ping.js (import auth)

3. Všechny moduly se načítají paralelně

4. app.js exportuje veřejné funkce:
   window.login = login
   window.logout = logout
   window.loadDashboard = loadDashboard
   ... apod.

5. DOMContentLoaded listener:
   └─ initApp() → pokud existuje token, zobrazit app
```

## Cyklické dependency

✅ **Detekované:**
- `filling.js` → `dispenser.js` → `dashboard.js`
- `filling.js` → `dashboard.js`

✅ **Řešení:**
- Všechny importy jsou na začátku souboru
- Žádné problémy s pořadím
- ES6 moduly jsou automaticky optimalizovány

## Paralelní načítání

```
Čas 0ms:  app.js starts
Čas ~5ms: All imports parallel
          ├─ core.js ✓
          ├─ auth.js ✓
          ├─ dashboard.js ✓
          ├─ pills.js ✓
          ├─ filling.js ✓
          ├─ dispenser.js ✓
          ├─ consumption.js ✓
          ├─ scale.js ✓
          ├─ helpers.js ✓
          └─ ping.js ✓
Čas ~20ms: DOMContentLoaded fires
Čas ~30ms: initApp() called
Čas ~50ms: showApp() if token exists
```

## Výhody modulární struktury

```
┌─────────────────────────────────────────────────────────────┐
│  Bez modulů (původní script_backup.js)                             │
├─────────────────────────────────────────────────────────────┤
│  script_backup.js (1298 řádků)                                     │
│  ├─ Všechno v globálním scope                              │
│  ├─ Těžko se hledají funkce                                │
│  ├─ Riziko jmenných konfliktů                              │
│  └─ Nelze to testovat izolovaně                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  S moduly (nová struktura)                                  │
├─────────────────────────────────────────────────────────────┤
│  app.js (~50 řádků)                                         │
│  ├─ core.js (~40 řádků)                                    │
│  ├─ auth.js (~50 řádků)                                    │
│  ├─ dashboard.js (~100 řádků)                              │
│  ├─ pills.js (~170 řádků)                                  │
│  ├─ filling.js (~330 řádků)     ← Největší                │
│  ├─ dispenser.js (~100 řádků)                              │
│  ├─ consumption.js (~40 řádků)                              │
│  ├─ scale.js (~200 řádků)                                  │
│  ├─ ping.js (~80 řádků)                                    │
│  ├─ helpers.js (~60 řádků)                                 │
│  └─ README.md (dokumentace)                                │
│
│  Výhody:                                                    │
│  ✓ Každý modul odpovídá jedné doméně                       │
│  ✓ Lze je nezávisle vyvíjet a testovat                     │
│  ✓ Čitelnější kód                                          │
│  ✓ Lehší údržba                                            │
│  ✓ Možnost opětovného použití                              │
│  ✓ Budoucí možnost bundlingu                               │
└─────────────────────────────────────────────────────────────┘
```

---

**Poznámka:** Všechny importy jsou statické (na začátku souboru), kromě jednoho dynamického importu v `auth.js` pro `dashboard.js` (po úspěšné přihlášce).

