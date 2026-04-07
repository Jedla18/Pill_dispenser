from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, WeightRecord
from auth import get_current_user
import mqtt
from schemas import WeightRecordOut, WeightRecordCreate
from typing import List
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/scale", tags=["scale"])

@router.get("/history", response_model=List[WeightRecordOut])
def get_weight_history(cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Vrátí historii vážení uživatele."""
    records = db.query(WeightRecord).filter(WeightRecord.owner_id == cu.id)\
                .order_by(WeightRecord.timestamp.desc()).all()
    return records

@router.post("/", response_model=WeightRecordOut)
def create_weight_record(weight_data: WeightRecordCreate, cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Vytvoří nový záznam váhy a odesílá na školní MQTT broker."""
    timestamp = datetime.utcnow() + timedelta(hours=2)
    
    new_record = WeightRecord(
        weight=weight_data.weight,
        owner_id=cu.id,
        timestamp=timestamp
    )
    
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    
    # Odeslaní na školní broker
    school_payload = {
        "user": cu.username,
        "weight": float(weight_data.weight),
        "timestamp": timestamp.isoformat(),
        "unit": "kg"
    }
    mqtt.send_to_school(f"student/{cu.username}/weight", school_payload)
    
    return new_record

@router.delete("/{record_id}")
def delete_weight_record(record_id: int, cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Smaže záznam váhy z databáze."""
    record = db.query(WeightRecord).filter(
        WeightRecord.id == record_id,
        WeightRecord.owner_id == cu.id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Záznam váhy nebyl nalezen")
    
    db.delete(record)
    db.commit()
    
    return {"status": "success", "message": "Záznam byl smazán"}

@router.get("/ping")
def ping_scale(cu: User = Depends(get_current_user)):
    """Zjistí, zda je váha online."""
    return mqtt.ping("scale", cu.username)


