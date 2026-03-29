from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Pill, LoadedPill
from auth import get_current_user
import mqtt

router = APIRouter(prefix="/api", tags=["device"])


@router.get("/dashboard")
def dashboard(cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pills  = db.query(Pill).filter(Pill.owner_id == cu.id).order_by(Pill.time).all()
    loaded = db.query(LoadedPill).filter(LoadedPill.owner_id == cu.id)\
               .order_by(LoadedPill.time).all()
    return {
        "status":  "Aktivní",
        "device":  cu.username,
        "layers":  cu.layers,
        "planned_pills": [
            {"time": p.time, "name": p.name, "dose": p.dose, "repeat": p.repeat}
            for p in pills
        ],
        "loaded_pills": [
            {"id": lp.id, "layer": lp.layer, "position": lp.position,
             "compartment": lp.compartment, "time": lp.time, "content": lp.pills_content}
            for lp in loaded
        ]
    }


@router.get("/ping-device")
def ping_device(cu: User = Depends(get_current_user), timeout: int = 5):
    """Odešle MQTT ping MCU a čeká na pong. Vrací status a latenci."""
    return mqtt.ping(cu.username, timeout=timeout)


@router.put("/user/layers")
def update_layers(
    layers: int,
    cu:     User    = Depends(get_current_user),
    db:     Session = Depends(get_db)
):
    if not 1 <= layers <= 8:
        raise HTTPException(400, "Hodnota musí být 1–8")
    cu.layers = layers
    db.commit()
    return {"message": f"Vrstvy aktualizovány na {layers}"}