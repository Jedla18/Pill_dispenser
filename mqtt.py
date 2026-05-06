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
        print(f"[MQTT] 📨 Zpráva přijata - Topic: {msg.topic}, Payload: {msg.payload.decode()}")

        # Topic formát: "typ_zarizeni/uzivatel/akce"
        # Např: "scale/admin/data" nebo "dispenser/admin/pong"
        parts = msg.topic.split("/")
        if len(parts) < 3:
            print(f"[MQTT] ⚠️  Neplatný formát topicu: {msg.topic}")
            return

        device_type = parts[0]  # "dispenser" nebo "scale"
        username = parts[1]
        action = parts[2]

        print(f"[MQTT] 🔍 Parsováno - Device: {device_type}, User: {username}, Action: {action}")

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

        # --- LOGIKA PRO DÁVKOVAČ ---
        elif device_type == "dispenser":
            payload = json.loads(msg.payload.decode())
            print(f"[MQTT] Dispenser zpráva: action={action}, payload={payload}")
            if action == "request_pills":
                _handle_request_pills(username)
            elif action == "dispense_confirm":
                print(f"[MQTT] Volám _handle_dispense_confirm")
                _handle_dispense_confirm(username, payload)
            elif action == "cycle_result":
                print(f"[MQTT] Volám _handle_cycle_result")
                _handle_cycle_result(username, payload)
            else:
                print(f"[MQTT]  Neznámá action: {action}")

    except Exception as e:
        import traceback
        print(f"[MQTT] Chyba: {e}")
        print(f"[MQTT] Traceback: {traceback.format_exc()}")


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
    """
    dispense_confirm nyní JENOM potvrzuje, že Arduino zahájil operaci.
    Záznam se vytvoří až když přijde cycle_result (SUCCESS nebo ERROR).
    """
    # Logging pro debug, ale nic se neuloží do DB
    loaded_pill_id = int(payload.get("loaded_pill_id"))
    timestamp = payload.get("timestamp")
    print(f"[MQTT] dispense_confirm přijat: lék ID {loaded_pill_id}, čas {timestamp}")
    print(f"[MQTT] Záznam se vytvoří až v cycle_result")

def _handle_cycle_result(username: str, payload: dict):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            return

        pill_id = int(payload.get("pill_id"))
        status = payload.get("status")
        error_code = payload.get("error_code", 0)
        timestamp = payload.get("timestamp")

        print(f"[MQTT] cycle_result: pill_id={pill_id}, status={status}, error_code={error_code}")

        consumption = db.query(Consumption).filter(
            Consumption.pill_id == pill_id,
            Consumption.owner_id == user.id
        ).first()

        loaded_pill = db.query(LoadedPill).filter(
            LoadedPill.id == pill_id,
            LoadedPill.owner_id == user.id
        ).first()

        if status == "SUCCESS":
            #SUCCESS → AKTUALIZUJ na "Vydáno" a PONECH v DB
            if consumption:
                consumption.status = "Vydáno"
                print(f"[MQTT] SUCCESS: Lék ID {pill_id} aktualizován → Vydáno")
            else:
                # Vytvoř nový záznam s SUCCESS
                if loaded_pill:
                    pill_time = loaded_pill.time[-5:] if loaded_pill.time and len(loaded_pill.time) >= 5 else "00:00"
                    pill_name = loaded_pill.pills_content
                else:
                    pill_time = timestamp[11:16] if timestamp and len(timestamp) > 10 else "00:00"
                    pill_name = f"Lék ID {pill_id}"

                new_consumption = Consumption(
                    date=timestamp[:10] if timestamp else time.strftime("%Y-%m-%d"),
                    time=pill_time,
                    pill_name=pill_name,
                    status="Vydáno",
                    pill_id=pill_id,
                    owner_id=user.id
                )
                db.add(new_consumption)
                print(f"[MQTT SUCCESS: Nový záznam pro lék ID {pill_id} → Vydáno")

            # Smaž jen z loaded_pills, ne z consumptions!
            if loaded_pill:
                db.delete(loaded_pill)
                print(f"[MQTT] Lék ID {pill_id} smazán z loaded_pills")

            db.commit()

        elif status == "ERROR":
            # ERROR → PONECHAT jako varovný záznam
            final_status = f"ERROR: {error_code}"

            if consumption:
                # Aktualizuj stav na ERROR
                consumption.status = final_status
                print(f"[MQTT] ERROR: Lék ID {pill_id} aktualizován → {final_status}")
            else:
                # Vytvoř nový záznam s ERROR
                if loaded_pill:
                    pill_time = loaded_pill.time[-5:] if loaded_pill.time and len(loaded_pill.time) >= 5 else "00:00"
                    pill_name = loaded_pill.pills_content
                else:
                    pill_time = timestamp[11:16] if timestamp and len(timestamp) > 10 else "00:00"
                    pill_name = f"Lék ID {pill_id}"

                new_consumption = Consumption(
                    date=timestamp[:10] if timestamp else time.strftime("%Y-%m-%d"),
                    time=pill_time,
                    pill_name=pill_name,
                    status=final_status,
                    pill_id=pill_id,
                    owner_id=user.id
                )
                db.add(new_consumption)
                print(f"[MQTT] ERROR: Nový záznam pro lék ID {pill_id} → {final_status}")

            # Vždy smaž z loaded_pills pokud existuje
            if loaded_pill:
                db.delete(loaded_pill)
                print(f"[MQTT] Lék ID {pill_id} smazán z loaded_pills")

            db.commit()

    except Exception as e:
        db.rollback()
        print(f"[MQTT] Chyba: {e}")
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
        print("[MQTT] Listener běží na ŠKOLNÍM brokeru a poslouchá na 'dispenser/#' a 'scale/#'")
        client.loop_forever()
    except Exception as e:
        print(f"[MQTT] Broker nedostupný: {e}")


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