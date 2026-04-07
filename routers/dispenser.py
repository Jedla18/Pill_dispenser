from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date

from database import get_db
from models import User, LoadedPill, Consumption
from schemas import DispenseConfirm
from auth import get_current_user
import mqtt

router = APIRouter(prefix="/api", tags=["dispenser"])


@router.get("/loaded-pills")
def get_loaded_pills(cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    loaded = db.query(LoadedPill).filter(LoadedPill.owner_id == cu.id)\
               .order_by(LoadedPill.time).all()
    return {
        "layers":     cu.layers,
        "total_slots": cu.layers * 7,
        "used_slots":  len(loaded),
        "loaded": [
            {"id": lp.id, "layer": lp.layer, "position": lp.position,
             "compartment": lp.compartment, "time": lp.time, "content": lp.pills_content}
            for lp in loaded
        ]
    }


@router.delete("/loaded-pills/{loaded_pill_id}")
def delete_loaded_pill(
    loaded_pill_id: int,
    cu: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Smaže lék z dávkovače (LoadedPill)."""
    pill = db.query(LoadedPill).filter(
        LoadedPill.id == loaded_pill_id,
        LoadedPill.owner_id == cu.id
    ).first()
    if not pill:
        raise HTTPException(404, "Lék v dávkovači nenalezen")
    
    pill_content = pill.pills_content
    db.delete(pill)
    db.commit()
    
    # Poslat reload zprávu do MCU
    mqtt.send(f"dispenser/{cu.username}/reload", {
        "action": "reload", "message": "Lék byl smazán z dávkovače, načti nová data"
    })
    
    return {"message": f"Lék '{pill_content}' smazán z dávkovače"}


@router.post("/dispense-confirm")
def dispense_confirm(
    body: DispenseConfirm,
    cu:   User    = Depends(get_current_user),
    db:   Session = Depends(get_db)
):
    """MCU volá po fyzickém vydání léku. Smaže z loaded_pills, přidá do consumptions."""
    pill = db.query(LoadedPill).filter(
        LoadedPill.id == body.loaded_pill_id,
        LoadedPill.owner_id == cu.id
    ).first()
    if not pill:
        raise HTTPException(404, "Záznam nenalezen")

    db.add(Consumption(
        date=body.timestamp[:10], time=pill.time,
        pill_name=pill.pills_content, status="Vzato",
        owner_id=cu.id
    ))
    db.delete(pill)
    db.commit()
    return {"message": "OK", "pill_name": pill.pills_content}


@router.post("/skip-pill")
def skip_pill(
    body: DispenseConfirm,
    cu:   User    = Depends(get_current_user),
    db:   Session = Depends(get_db)
):
    """Označí lék jako vynechaný (čas vypršel)."""
    pill = db.query(LoadedPill).filter(
        LoadedPill.id == body.loaded_pill_id,
        LoadedPill.owner_id == cu.id
    ).first()
    if not pill:
        raise HTTPException(404, "Záznam nenalezen")

    db.add(Consumption(
        date=body.timestamp[:10], time=pill.time,
        pill_name=pill.pills_content, status="Vynecháno",
        owner_id=cu.id
    ))
    db.delete(pill)
    db.commit()
    return {"message": "Označeno jako vynecháno"}


@router.post("/empty-dispenser")
def empty_dispenser(cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Vysype dávkovač — přesune vše do consumptions se statusem 'Vysypáno'."""
    loaded = db.query(LoadedPill).filter(LoadedPill.owner_id == cu.id).all()
    count  = len(loaded)
    today  = date.today().isoformat()

    for lp in loaded:
        db.add(Consumption(
            date=today, time=lp.time,
            pill_name=lp.pills_content, status="Vysypáno",
            owner_id=cu.id
        ))
        db.delete(lp)

    db.commit()
    mqtt.send(f"dispenser/{cu.username}/reload", {
        "action": "emptied", "message": "Dávkovač byl vysypán"
    })
    return {"message": f"Dávkovač vysypán, odstraněno {count} dávek"}