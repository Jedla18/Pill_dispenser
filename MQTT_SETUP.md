# MQTT Integrace

## 📊 Přehled

Aplikace používá dva MQTT brokery:
1. **Lokální broker** - pro komunikaci se senzory (dávkovač, váha)
2. **Školní broker** - pro odesílání dat váhy na školní infrastrukturu

## 🔌 MQTT Konfigurace

### Lokální MQTT Broker
- **Broker:** broker.hivemq.com
- **Port:** 1883
- **TLS:** Ne

### Školní MQTT Broker (HiveMQ Cloud)
- **Broker:** 716e6715e3b14167aed452d327749c59.s1.eu.hivemq.cloud
- **Port:** 8883
- **TLS:** Ano
- **Username:** student
- **Password:** 4vvg26N4g3TeDF5

## 📝 MQTT Topics

### Váha ze senzoru (Lokální)

**Topic:** `scale/{username}/data`

**Payload:**
```json
{
  "weight": 75.5
}
```

**Co se stane:**
- Váha se uloží do DB
- Data se odesílají na školní broker (topic: `student/{username}/weight`)

### Odesílání na školní broker

**Topic:** `student/{username}/weight`

**Payload:**
```json
{
  "user": "uzivatel1",
  "weight": 75.5,
  "timestamp": "2026-04-05T14:30:00",
  "unit": "kg"
}
```

### Dávkovač

**Topic:** `dispenser/{username}/request_pills`

Dávkovač si vyžádá seznam léků k vydání.

## 🚀 Jak to funguje

### 1. Ručné přidání váhy přes Web UI

1. Přejděte na "Historie vážení"
2. Klikněte **"+ Přidat váhu"**
3. Zadejte váhu v kg
4. Klikněte **"Přidat"**

✅ Váha se uloží do DB  
✅ Data se odesílají na školní MQTT broker

### 2. Váha ze senzoru (MQTT)

1. Senzor pošle: `scale/{username}/data` s `{"weight": 75.5}`
2. Server uloží váhu do DB
3. Server pošle data na školní broker: `student/{username}/weight`

## 📱 API Endpoints

### POST /api/scale/
Přidá nový záznam váhy a odesílá na školní MQTT

### GET /api/scale/history
Vrátí historii vážení

### DELETE /api/scale/{record_id}
Smaže záznam váhy

## 🧪 Test MQTT

### Simulovat senzor váhy (lokální)
```bash
mosquitto_pub -h broker.hivemq.com -t "scale/uzivatel1/data" -m '{"weight": 75.5}'
```

### Poslouchat na školním brokeru
```bash
mosquitto_sub -h 716e6715e3b14167aed452d327749c59.s1.eu.hivemq.cloud \
  -p 8883 --tls-version tlsv1_2 \
  -u student -P 4vvg26N4g3TeDF5 \
  -t "student/#"
```

## ✅ Shrnutí

| Operace | Broker | Topic |
|---------|--------|-------|
| Senzor váhy | Lokální | `scale/{username}/data` |
| Odesílání vážení | Školní | `student/{username}/weight` |
| Dávkovač | Lokální | `dispenser/{username}/...` |


