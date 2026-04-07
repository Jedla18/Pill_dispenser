import threading
import json
import time
import paho.mqtt.client as mqtt
import paho.mqtt.publish as mqtt_publish
from datetime import datetime, timezone, timedelta

# Importy potřebné pro práci s databází na pozadí
from database import SessionLocal
from models import User, LoadedPill, Consumption, WeightRecord

# MQTT Broker - Lokální pro dávkovač a váhu
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883

# MQTT Broker - Školní HiveMQ Cloud
MQTT_SCHOOL_BROKER = "716e6715e3b14167aed452d327749c59.s1.eu.hivemq.cloud"
MQTT_SCHOOL_PORT = 8883
MQTT_SCHOOL_USER = "student"
MQTT_SCHOOL_PASSWORD = "4vvg26N4g3TeDF5"

# Upravené globální proměnné pro podporu více zařízení
_pong_events: dict[str, threading.Event] = {}
_pong_latency: dict[str, float] = {}
_ping_sent_at: dict[str, float] = {}


def _on_message(client, userdata, msg):
    try:
        # Topic formát: "typ_zarizeni/uzivatel/akce"
        # Např: "scale/admin/data" nebo "dispenser/admin/pong"
        parts = msg.topic.split("/")
        if len(parts) < 3: return

        device_type = parts[0]  # "dispenser" nebo "scale"
        username = parts[1]
        action = parts[2]

        # Unikátní klíč pro ping-pong (např. "scale:admin")
        device_key = f"{device_type}:{username}"

        # --- SPOLEČNÝ PING-PONG ---
        if action == "pong":
            if device_key in _ping_sent_at:
                _pong_latency[device_key] = round((time.time() - _ping_sent_at[device_key]) * 1000, 1)
            if device_key in _pong_events:
                _pong_events[device_key].set()
            return

        # --- LOGIKA PRO VÁHU ---
        if device_type == "scale" and action == "data":
            payload = json.loads(msg.payload.decode())
            _handle_scale_data(username, payload)

        # --- LOGIKA PRO DÁVKOVAČ (původní) ---
        elif device_type == "dispenser":
            if action == "request_pills":
                _handle_request_pills(username)
            # ... zbytek vaší logiky ...

    except Exception as e:
        print(f"[MQTT] Chyba: {e}")


def _handle_scale_data(username, payload):
    """Uloží příchozí váhu do DB a odesílá na školní MQTT broker."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if user:
            # Přečteme pouze váhu, nic jiného nepotřebujeme
            weight = payload.get("weight")

            # Vytvoříme nový záznam s aktuálním časem + 2 hodiny
            new_rec = WeightRecord(
                weight=float(weight),
                owner_id=user.id,
                timestamp=datetime.utcnow() + timedelta(hours=2)
            )

            db.add(new_rec)
            db.commit()
            print(f"[MQTT] Váha {weight}kg uložena pro {username}.")

            # Odeslaní na školní broker
            school_payload = {
                "user": username,
                "weight": float(weight),
                "timestamp": new_rec.timestamp.isoformat(),
                "unit": "kg"
            }
            send_to_school(f"student/{username}/weight", school_payload)
    except Exception as e:
        print(f"[MQTT] Chyba při ukládání váhy: {e}")
    finally:
        db.close()


# Upravená funkce ping
def ping(device_type, username, timeout=5):
    device_key = f"{device_type}:{username}"
    event = threading.Event()
    _pong_events[device_key] = event
    _ping_sent_at[device_key] = time.time()

    send(f"{device_type}/{username}/ping", {"action": "ping"})

    is_online = event.wait(timeout=timeout)

    # Úklid po eventu
    _pong_events.pop(device_key, None)
    _ping_sent_at.pop(device_key, None)

    if is_online:
        return {"status": "online", "latency_ms": _pong_latency.pop(device_key, None)}
    return {"status": "offline"}


def _handle_request_pills(username: str):
    """Sestaví seznam léků z databáze a odešle ho zpět do MCU."""
    db = SessionLocal()  # Vytvoříme vlastní DB session pro toto vlákno
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"[MQTT] Uživatel {username} nenalezen pro request_pills.")
            return

        loaded = db.query(LoadedPill).filter(LoadedPill.owner_id == user.id).order_by(LoadedPill.time).all()

        # Sestavení payloadu přesně tak, jak ho očekává ArduinoJson
        payload = {
            "loaded": [
                {
                    "id": lp.id,
                    "layer": lp.layer,
                    "position": lp.position,
                    "time": lp.time,
                    "content": lp.pills_content
                } for lp in loaded
            ]
        }

        send(f"dispenser/{username}/pills", payload)
        print(f"[MQTT] Odeslán plán léků pro dávkovač: {username}")
    finally:
        db.close()  # Nesmíme zapomenout session zavřít!


def _handle_dispense_confirm(username: str, payload: dict):
    """Zapíše vydaný lék do historie (Consumption) a smaže ho z plánu (LoadedPill)."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            return

        loaded_pill_id = payload.get("loaded_pill_id")
        timestamp = payload.get("timestamp")  # Např. "2023-10-27T08:00:00"

        # Najdeme lék v dávkovači
        pill = db.query(LoadedPill).filter(LoadedPill.id == loaded_pill_id, LoadedPill.owner_id == user.id).first()

        if pill:
            # Vytvoříme záznam o užití
            db.add(Consumption(
                date=timestamp[:10] if timestamp else time.strftime("%Y-%m-%d"),
                time=pill.time,
                pill_name=pill.pills_content,
                status="Vzato",
                owner_id=user.id
            ))
            # Smažeme lék z fyzického plánu dávkovače
            db.delete(pill)
            db.commit()
            print(f"[MQTT] Výdej potvrzen a uložen: lék ID {loaded_pill_id} ({username})")
        else:
            print(f"[MQTT] Potvrzovaný lék ID {loaded_pill_id} nebyl nalezen v db (možná už byl smazán?).")

    except Exception as e:
        db.rollback()
        print(f"[MQTT] Chyba při ukládání potvrzení do DB: {e}")
    finally:
        db.close()


def start_listener():
    """Spustí MQTT listener v background threadu - ŠKOLNÍ BROKER."""
    client = mqtt.Client(client_id=f"fastapi_server_{time.time()}")
    client.on_message = _on_message
    try:
        # === PŘIPOJENÍ NA ŠKOLNÍ BROKER (kde je Arduino) ===
        print("[MQTT] Připojování na školní broker (HiveMQ Cloud)...")
        client.username_pw_set(MQTT_SCHOOL_USER, MQTT_SCHOOL_PASSWORD)
        client.tls_set(tls_version=2)
        client.tls_insecure = True

        client.connect(MQTT_SCHOOL_BROKER, MQTT_SCHOOL_PORT, keepalive=60)

        client.subscribe("dispenser/#")
        client.subscribe("scale/#")
        print("[MQTT] ✅ Listener běží na ŠKOLNÍM brokeru a poslouchá na 'dispenser/#' a 'scale/#'")
        client.loop_forever()
    except Exception as e:
        print(f"[MQTT] ❌ Broker nedostupný: {e}")


def send(topic: str, payload: dict):
    """Odešle MQTT zprávu - ŠKOLNÍ BROKER."""
    try:
        mqtt_publish.single(
            topic,
            json.dumps(payload),
            hostname=MQTT_SCHOOL_BROKER,
            port=MQTT_SCHOOL_PORT,
            auth={"username": MQTT_SCHOOL_USER, "password": MQTT_SCHOOL_PASSWORD},
            tls={"ca_certs": None},
            qos=1
        )
        print(f"[MQTT] Zpráva odeslána: {topic}")
    except Exception as e:
        print(f"[MQTT] Publish selhal ({topic}): {e}")

def send_to_school(topic: str, payload: dict):
    """Odešle MQTT zprávu do školního brokeru (HiveMQ Cloud s SSL/TLS)."""
    try:
        mqtt_publish.single(
            topic,
            json.dumps(payload),
            hostname=MQTT_SCHOOL_BROKER,
            port=MQTT_SCHOOL_PORT,
            auth={"username": MQTT_SCHOOL_USER, "password": MQTT_SCHOOL_PASSWORD},
            tls={"ca_certs": None},
            qos=1
        )
        print(f"[MQTT School] Odesláno na školní broker: {topic}")
    except Exception as e:
        print(f"[MQTT School] Publish selhal ({topic}): {e}")