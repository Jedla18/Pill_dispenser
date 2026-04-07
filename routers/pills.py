from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from collections import defaultdict
from datetime import date, timedelta

from database import get_db
from models import User, Pill, LoadedPill
from schemas import PillCreate
from auth import get_current_user
import mqtt

router = APIRouter(prefix="/api", tags=["pills"])


def expand_pills_to_slots(pills: list, max_slots: int):
    """
    Vygeneruje sloty pro dávkovač z listu Pill objektů.
    Vrací tuple (plan, skipped) — oba jsou listy dictů.

    Repeat typy:
      none   — jednorázový, uloží datum + čas
      daily  — každý den (7 slotů), jen HH:MM
      weekly — každý týden, formát "weekly:WEEKDAY:HH:MM" (0=Ne,1=Po..6=So)
    """
    today = date.today()
    # slot_map: { (day_offset, hhmm) -> {"pills": [...], "repeat": str} }
    slot_map: dict[tuple, dict] = {}

    def add_slot(key, pill_str, repeat):
        if key not in slot_map:
            slot_map[key] = {"pills": [], "repeat": repeat}
        slot_map[key]["pills"].append(pill_str)
        priority = {"daily": 2, "weekly": 1, "none": 0}
        if priority.get(repeat, 0) > priority.get(slot_map[key]["repeat"], 0):
            slot_map[key]["repeat"] = repeat

    for pill in pills:
        t        = pill.time
        pill_str = f"{pill.name} ({pill.dose})"

        if pill.repeat == "daily":
            if "T" in t: t = t.split("T")[1][:5]
            t = t[:5]
            for day_offset in range(max_slots):
                add_slot((day_offset, t), pill_str, "daily")

        elif pill.repeat == "weekly":
            parts = t.split(":")
            if len(parts) >= 4 and parts[0] == "weekly":
                # Upraveno pro podporu více dnů, např. "weekly:1,2:08:00"
                target_weekdays = [int(w) for w in parts[1].split(",")]
                hhmm = parts[2] + ":" + parts[3]
            else:
                target_weekdays = [today.weekday()]
                hhmm = t[:5] if len(t) >= 5 else "08:00"

            our_to_py = {0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5}
            
            for tw in target_weekdays:
                py_target = our_to_py.get(tw, 0)
                for week in range(max_slots):
                    days_until = (py_target - today.weekday()) % 7 + (week * 7)
                    add_slot((days_until, hhmm), pill_str, "weekly")

        else:
            # Jednorázový lék (none)
            if "T" in t:
                hhmm = t.split("T")[1][:5]
                try:
                    target_date = date.fromisoformat(t.split("T")[0])
                    # FILTRUJ ZASTARALÉ LÉKY - ignorovat ty v minulosti
                    if target_date < today:
                        continue  # Přeskočit starý lék
                    day_offset  = (target_date - today).days
                except Exception:
                    day_offset = 0
            else:
                hhmm      = t[:5]
                day_offset = 0
            add_slot((day_offset, hhmm), pill_str, "none")

    sorted_keys = sorted(slot_map.keys())
    plan    = []
    skipped = []

    for i, key in enumerate(sorted_keys):
        day_offset, hhmm = key
        target_date = today + timedelta(days=day_offset)
        time_label  = target_date.strftime("%Y-%m-%d") + "T" + hhmm

        if i < max_slots:
            layer       = (i // 7) + 1
            position    = (i % 7)  + 1
            compartment = ((position - 1 + layer) % 8) + 1
            plan.append({
                "layer":       layer,
                "position":    position,
                "compartment": compartment,
                "time":        time_label,
                "content":     ", ".join(slot_map[key]["pills"]),
                "repeat":      slot_map[key]["repeat"],
                "image_url":   f"/static/pill_position/L{layer}/L{layer}_P{position}.png"
            })
        else:
            skipped.append({
                "time":    time_label,
                "content": ", ".join(slot_map[key]["pills"]),
                "repeat":  slot_map[key]["repeat"],
            })

    return plan, skipped


# ── CRUD léků ────────────────────────────────────────────────────────────────

@router.get("/pills")
def get_pills(cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pills = db.query(Pill).filter(Pill.owner_id == cu.id).order_by(Pill.time).all()
    return {"pills": [{"id": p.id, "name": p.name, "time": p.time,
                       "dose": p.dose, "repeat": p.repeat} for p in pills]}


@router.post("/pills")
def add_pill(pill: PillCreate, cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    repeat = pill.repeat if pill.repeat in ("none", "daily", "weekly") else "none"
    db.add(Pill(name=pill.name, time=pill.time, dose=pill.dose,
                repeat=repeat, owner_id=cu.id))
    db.commit()
    return {"message": "Lék přidán"}


@router.delete("/pills/{pill_id}")
def delete_pill(pill_id: int, cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pill = db.query(Pill).filter(Pill.id == pill_id, Pill.owner_id == cu.id).first()
    if not pill:
        raise HTTPException(404, "Lék nenalezen")
    
    # Smazat lék z plánu
    db.delete(pill)
    
    # Smazat všechny odpovídající pilulky z dávkovače (LoadedPill)
    # Odstraníme ty, které obsahují jméno tohoto léku
    loaded_pills = db.query(LoadedPill).filter(LoadedPill.owner_id == cu.id).all()
    for lp in loaded_pills:
        # Pokud obsah obsahuje název léku, smazat
        if pill.name in lp.pills_content:
            db.delete(lp)
    
    # Poslat reload zprávu do MCU
    mqtt.send(f"dispenser/{cu.username}/reload", {
        "action": "reload", "message": "Lék byl smazán, načti nová data"
    })
    
    db.commit()
    return {"message": "Lék smazán z plánu a dávkovače"}


# ── Fill plan ────────────────────────────────────────────────────────────────

@router.get("/fill-plan")
def fill_plan(cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    all_pills = db.query(Pill).filter(Pill.owner_id == cu.id).order_by(Pill.time).all()
    if not all_pills:
        return {"message": "Zásobník je prázdný.", "plan": [], "skipped": []}

    max_slots       = cu.layers * 7
    plan, skipped   = expand_pills_to_slots(all_pills, max_slots)
    return {"plan": plan, "skipped": skipped, "total_slots": max_slots, "used_slots": len(plan)}


@router.post("/confirm-fill")
def confirm_fill(plan: list[dict], cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(LoadedPill).filter(LoadedPill.owner_id == cu.id).delete()
    for item in plan:
        db.add(LoadedPill(
            layer=item["layer"], position=item["position"],
            compartment=item.get("compartment", item["position"]),
            time=item["time"], pills_content=item["content"],
            owner_id=cu.id
        ))
    db.commit()
    mqtt.send(f"dispenser/{cu.username}/reload", {
        "action": "reload", "message": "Dávkovač naplněn, načti nová data"
    })
    return {"message": "Dávkovač naplněn a MCU upozorněn"}