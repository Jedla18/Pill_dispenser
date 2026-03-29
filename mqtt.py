import threading
import json
import time
import paho.mqtt.client as mqtt
import paho.mqtt.publish as mqtt_publish

MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT   = 1883

# Stav ping/pong
_pong_events:  dict[str, threading.Event] = {}
_pong_latency: dict[str, float]           = {}
_ping_sent_at: dict[str, float]           = {}


def _on_message(client, userdata, msg):
    if msg.topic.endswith("/pong"):
        username = msg.topic.split("/")[1]
        if username in _ping_sent_at:
            _pong_latency[username] = round((time.time() - _ping_sent_at[username]) * 1000, 1)
        if username in _pong_events:
            _pong_events[username].set()


def start_listener():
    """Spustí MQTT listener v background threadu — volá se při startu FastAPI."""
    client = mqtt.Client(client_id="fastapi_server")
    client.on_message = _on_message
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        client.subscribe("dispenser/+/pong")
        client.loop_forever()
    except Exception as e:
        print(f"[MQTT] Broker nedostupný: {e}")


def send(topic: str, payload: dict):
    """Odešle MQTT zprávu. Tiše selže pokud broker není dostupný."""
    try:
        mqtt_publish.single(topic, json.dumps(payload), hostname=MQTT_BROKER, port=MQTT_PORT, qos=1)
    except Exception as e:
        print(f"[MQTT] Publish selhal ({topic}): {e}")


def ping(username: str, timeout: int = 5) -> dict:
    """
    Odešle ping MCU a čeká na pong.
    Vrací { status: 'online'|'offline', latency_ms: float|None }
    """
    event = threading.Event()
    _pong_events[username]  = event
    _ping_sent_at[username] = time.time()

    send(f"dispenser/{username}/ping", {"action": "ping", "ts": time.time()})

    responded = event.wait(timeout=timeout)
    _pong_events.pop(username, None)

    if responded:
        return {"status": "online", "latency_ms": _pong_latency.pop(username, None)}

    _pong_latency.pop(username, None)
    return {"status": "offline", "latency_ms": None}