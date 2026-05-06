# 📁 Struktura projektu po refaktoringu

## Projekt Pill_dispenser

```
Pill_dispenser/
│
├─ 📋 DOKUMENTACE (NOVÁ)
│  ├─ DOCUMENTATION_INDEX.md ← INDEX VŠECH DOKUMENTŮ (začni tady!)
│  ├─ REFACTORING_README.md ← Úvodní průvodce
│  ├─ REFACTORING_COMPLETE.txt ← Vizuální souhrn
│  ├─ QUICK_REFERENCE.md ← Orientace v kódu
│  ├─ FINAL_SUMMARY.md ← Detailní souhrn
│  ├─ TESTING_GUIDE.md ← Jak testovat
│  ├─ DEPENDENCY_DIAGRAM.md ← Grafy architektur
│  ├─ MIGRATION_CHECKLIST.txt ← Přehled funkcí
│  └─ MODULARIZATION_SUMMARY.md ← Status refaktoringu
│
├─ 📁 static/
│  └─ js/
│     ├─ 🆕 app.js (45 řádků) ← VSTUPNÍ BOD
│     ├─ 🆕 core.js (41 řádků) ← Globální stav
│     ├─ 🆕 auth.js (53 řádků) ← Autentifikace
│     ├─ 🆕 helpers.js (62 řádků) ← Utility funkce
│     ├─ 🆕 dashboard.js (153 řádků) ← Dashboard
│     ├─ 🆕 pills.js (219 řádků) ← Správa léků
│     ├─ 🆕 consumption.js (35 řádků) ← Historie
│     ├─ 🆕 filling.js (330 řádků) ← Plnění 🔴 NEJVĚTŠÍ
│     ├─ 🆕 dispenser.js (134 řádků) ← Obsah dávkovače
│     ├─ 🆕 scale.js (252 řádků) ← Váha a BMI
│     ├─ 🆕 ping.js (95 řádků) ← IoT komunikace
│     ├─ 🆕 README.md ← Dokumentace modulů
│     └─ ⚠️  script_backup.js (1298 řádků) ← STARÝ (BACKUP!)
│
├─ 📁 templates/
│  └─ index.html ← ZMĚNĚNO (nový script import)
│
├─ 📁 routers/
│  ├─ __init__.py
│  ├─ consumption.py
│  ├─ device.py
│  ├─ dispenser.py
│  ├─ pills.py
│  └─ scale.py
│
├─ 📁 static/
│  └─ pill_position/
│     ├─ L1, L2, L3, L4, L5, L6, L7, L8/
│     └─ (obrázky PNG/SVG)
│
├─ 🐍 PYTHON BACKEND
│  ├─ main.py ← Flask aplikace
│  ├─ auth.py ← Autentifikace
│  ├─ database.py ← Databáze
│  ├─ models.py ← SQLAlchemy modely
│  ├─ schemas.py ← Pydantic schémata
│  ├─ mqtt.py ← IoT komunikace
│  └─ test_imports.py
│
├─ 📦 INFRASTRUKTURA
│  ├─ requirements.txt
│  ├─ Dockerfile
│  └─ __pycache__/
│
├─ 📝 STARÉ DOKUMENTACE
│  ├─ OPRAVY.md
│  └─ PING_PONG_SETUP.md
│
└─ 📂 GIT
   └─ .git/
   └─ .idea/ (PyCharm)
```

---

## 📊 Statistika změn

### JavaScript - Soubory
```
PŘED:    1 soubor (1298 řádků)
PO:      11 souborů + 1 backup
         ~1220 řádků (rozčleněno)
```

### Dokumentace - Soubory
```
VYTVOŘENO: 8 dokumentačních souborů
           ~49 KB dokumentace
```

### Modul Velikost (Bajty)
```
app.js            2,261  B   (přepravce)
core.js           1,410  B   (stav)
auth.js           1,924  B   (autentifikace)
helpers.js        3,022  B   (utility)
consumption.js    1,822  B   (malý modul)
dashboard.js      7,580  B   (přehled)
pills.js         11,079  B   (správa léků)
dispenser.js      6,567  B   (obsah)
scale.js         10,940  B   (váha)
ping.js           3,943  B   (IoT)
filling.js       17,564  B   ⭐ NEJVĚTŠÍ
───────────────────────────
Celkem NEW:      ~68 KB
Starý script_backup.js: ~61 KB
```

---

## 🔄 Tok importů

```
index.html
    ↓
    <script type="module" src="/static/js/app.js"></script>
    ↓
app.js (všechny importy paralelně)
    ├─→ core.js
    ├─→ auth.js → core.js
    ├─→ dashboard.js → core, auth, helpers
    ├─→ pills.js → core, auth, helpers
    ├─→ consumption.js → core, auth, helpers
    ├─→ filling.js → core, auth, helpers, dispenser, dashboard
    ├─→ dispenser.js → core, auth, helpers, dashboard, filling
    ├─→ scale.js → core, auth, helpers
    ├─→ ping.js → auth
    └─→ helpers.js (bez importů!)
    ↓
window.* = všechny veřejné funkce
    ↓
onclick="login()" // atd. funguje!
```

---

## 🎯 Logické oddělení

### LAYER 1: Core (Základ)
- `core.js` - Globální stav a DOM
- `helpers.js` - Utility funkce

### LAYER 2: Auth (Vstup)
- `auth.js` - Přihlášení / Odhlášení
- `ping.js` - IoT comunicace

### LAYER 3: Features (Funkcionality)
- `dashboard.js` - Přehled
- `pills.js` - Správa léků
- `consumption.js` - Historie
- `scale.js` - Váha a BMI
- `filling.js` - Plnění 🔴
- `dispenser.js` - Obsah

### LAYER 4: App (Orchestrace)
- `app.js` - Inicializace a export

---
