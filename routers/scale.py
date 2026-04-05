from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, WeightRecord
from auth import get_current_user
import mqtt
from schemas import WeightRecordOut
from typing import List

router = APIRouter(prefix="/api/scale", tags=["scale"])

@router.get("/history", response_model=List[WeightRecordOut])
def get_weight_history(cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Vrátí historii vážení uživatele."""
    records = db.query(WeightRecord).filter(WeightRecord.owner_id == cu.id)\
                .order_by(WeightRecord.timestamp.desc()).all()
    return records

@router.get("/ping")
def ping_scale(cu: User = Depends(get_current_user)):
    """Zjistí, zda je váha online."""
    return mqtt.ping("scale", cu.username)


