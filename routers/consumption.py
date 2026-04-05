from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import User, Consumption
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["consumption"])


@router.get("/consumption")
def get_consumption(cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Consumption).filter(Consumption.owner_id == cu.id)\
             .order_by(Consumption.date.desc(), Consumption.time.desc()).all()
    return {
        "consumed": [
            {"date": c.date, "time": c.time, "name": c.pill_name, "status": c.status}
            for c in rows
        ]
    }