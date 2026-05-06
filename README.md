# 💊 Pill Dispenser - Automatizovaný Systém na Distribuci Tablet

Automatizovaný systém pro distribuci léků a tablet s webovým rozhraním, MQTT komunikací a IoT integrací.

## 🎯 Hlavní Funkce

- ✅ **Automatické Vydávání Tablet** - Přesné dávkování v naprogramovaných časech
- 📊 **Webové Rozhraní** - Dashboard pro správu a monitorování
- 🔔 **MQTT Komunikace** - Bezpečná komunikace s mikrokontrolérem
- 📝 **Historie Vydaných Tablet** - Kompletní záznam všech dávek
- 🔐 **Autentifikace** - JWT tokeny a bezpečné přihlašování
- 📱 **Responsive Design** - Funguje na počítačích i mobilech
- ⚡ **Real-time Aktualizace** - Okamžité zpožití informací o stavech

## 🏗️ Architektura Systému

```
┌─────────────────────────────────────────────────────┐
│                   Web UI (Frontend)                 │
│         Bootstrap 5 + Vanilla JavaScript            │
└─────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────┐
│              FastAPI Backend (Python)               │
│  • RESTful API • JWT Autentifikace • MQTT Listener  │
└─────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────┐
│        MQTT Broker (HiveMQ Cloud - TLS/SSL)         │
│            Bezpečná komunikace IoT zařízení         │
└─────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────┐
│         Hardware (Raspberry Pi Pico 2W)             │
│   • Motor Řízení • RTC • WiFi Komunikace • Váha     │
└─────────────────────────────────────────────────────┘
```

## 📦 Technologie

| Komponenta | Technologie |
|-----------|-------------|
| **Backend** | FastAPI, Python 3.11+ |
| **Databáze** | PostgreSQL + SQLAlchemy ORM |
| **Autentifikace** | JWT, bcrypt |
| **Frontend** | Bootstrap 5, HTML5, Vanilla JS |
| **MQTT** | Paho MQTT, HiveMQ Cloud |
| **Containerizace** | Docker, Docker Compose |
| **Webserver** | Uvicorn |

## 🚀 Rychlý Start

### Předpoklady
- Python 3.11+
- PostgreSQL 12+
- Docker & Docker Compose (volitelně)
- Git

### Instalace

1. **Klonování repozitáře**
```bash
git clone https://github.com/yourusername/Pill_dispenser.git
cd Pill_dispenser
```

2. **Vytvoření virtuálního prostředí**
```bash
python -m venv .venv
source .venv/bin/activate  # Na Windows: .venv\Scripts\activate
```

3. **Instalace závislostí**
```bash
pip install -r requirements.txt
```

4. **Konfigurace databáze**
```bash
# Vytvořte soubor .env
echo "DATABASE_URL=postgresql://user:password@localhost:5432/pill_dispenser" > .env
echo "SECRET_KEY=your-secret-key-here" >> .env
```

5. **Spuštění aplikace**
```bash
python main.py
```

Aplikace bude dostupná na: `http://localhost:8000`

### Spuštění s Docker Compose

```bash
docker-compose up -d
```

## 📝 API Endpointy

### Autentifikace
```http
POST /token
Content-Type: application/x-www-form-urlencoded

username=admin&password=password123
```

### Léky
```http
GET /api/pills                    # Seznam všech léků
POST /api/pills                   # Přidání nového léku
```

### Dávkovač
```http
GET /api/loaded-pills             # Plán v dávkovači
POST /api/dispenser/fill-plan     # Vytvoření plánu
GET /api/dispenser/ping           # Ověření dostupnosti
```

### Historie
```http
GET /api/consumption              # Historie vydaných tablet
DELETE /api/consumption/{id}      # Smazání záznamu
```

## 🔌 MQTT Topics

| Topic | Směr | Obsah |
|-------|------|-------|
| `dispenser/{user}/ping` | Server → MCU | Ověření dostupnosti |
| `dispenser/{user}/pong` | MCU → Server | Odpověď na ping |
| `dispenser/{user}/pills` | Server → MCU | Plán tablet |
| `dispenser/{user}/cycle_result` | MCU → Server | Výsledek vydání |

## 📊 Databázový Model

### Tabulky

**users**
- id (PK)
- username (UNIQUE)
- hashed_password
- layers (počet vrstev dávkovače)

**pills**
- id (PK)
- name
- time (čas podání)
- dose (dávka)
- repeat (opakování)
- owner_id (FK)

**consumptions**
- id (PK)
- date
- time
- pill_name
- status ("Vydáno", "ERROR: X")
- pill_id
- owner_id (FK)

**loaded_pills**
- id (PK)
- layer
- position
- time
- pills_content
- owner_id (FK)

## 🔒 Bezpečnost

- ✅ **JWT Autentifikace** - Bezpečné tokeny s expirací
- ✅ **Hesla** - Hashování bcrypt algoritmem
- ✅ **MQTT TLS/SSL** - Šifrovaná komunikace
- ✅ **SQL Injection Ochrana** - SQLAlchemy ORM
- ✅ **CORS Zabezpečení** - Kontrola cross-origin požadavků

## 📖 Dokumentace

Podrobná dokumentace najdete v těchto souborech:
- `QUICK_REFERENCE.md` - Rychlý přehled
- `API_MQTT_GUIDE.md` - Podrobný API & MQTT průvodce
- `PROJECT_STRUCTURE.md` - Struktura projektu
- `MQTT_SETUP.md` - Nastavení MQTT

## 🛠️ Vývoj

### Nastavení vývojového prostředí

```bash
# Instalace dev závislostí
pip install -r requirements.txt

# Spuštění s auto-reloadem
python main.py
```

## 📁 Struktura Projektu

```
Pill_dispenser/
├── main.py                 # Hlavní FastAPI aplikace
├── models.py              # SQLAlchemy modely
├── schemas.py             # Pydantic schémata
├── auth.py                # JWT autentifikace
├── database.py            # DB konfigurace
├── mqtt.py                # MQTT listener a publish
├── routers/               # API endpointy
│   ├── pills.py
│   ├── dispenser.py
│   ├── consumption.py
│   ├── device.py
│   └── scale.py
├── static/                # Frontend assets
│   ├── js/
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── consumption.js
│   │   ├── dispenser.js
│   │   └── ...
│   └── css/
├── templates/             # HTML šablony
│   └── index.html
├── requirements.txt       # Python závislosti
├── Dockerfile            # Docker image
└── docker-compose.yml    # Docker Compose konfigurace
```
---

<div align="center">

**[⬆ Zpět na začátek](#-pill-dispenser---automatizovaný-systém-na-distribuci-tablet)**


</div>

