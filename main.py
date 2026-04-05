import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import threading
import jinja2

from fastapi import FastAPI, Depends, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from starlette.templating import Jinja2Templates
from sqlalchemy.orm import Session

from database import get_db, engine
from models import Base, User, Pill, LoadedPill, Consumption, WeightRecord
from auth import verify_password, create_access_token, get_password_hash, get_current_user
import mqtt

from routers import pills, dispenser, consumption, device , scale
from datetime import datetime
import time

# Vytvoření tabulek (pokud neexistují)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Pill Dispenser API")

# Static files + templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# Registrace routerů
app.include_router(pills.router)
app.include_router(dispenser.router)
app.include_router(consumption.router)
app.include_router(device.router)
app.include_router(scale.router)


@app.on_event("startup")
def startup():
    threading.Thread(target=mqtt.start_listener, daemon=True).start()


# ── Auth endpointy (zůstávají v main — jsou obecné) ──────────────────────────

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse(request=request, name="index.html", context={"request": request})


@app.post("/register")
def register(username: str, password: str, layers: int = 1, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(400, "Uživatel již existuje")
    db.add(User(
        username=username,
        hashed_password=get_password_hash(password),
        layers=layers
    ))
    db.commit()
    return {"message": "Uživatel vytvořen"}


@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(400, "Nesprávné jméno nebo heslo")
    return {
        "access_token": create_access_token({"sub": user.username}),
        "token_type": "bearer"
    }


# ── DASHBOARD ENDPOINT ─────────────────────────────────────────────────────────

@app.get("/api/dashboard")
def dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Vrátí souhrn informací o dávkovači a plánech"""
    # Všechny léky v plánu
    all_pills = db.query(Pill).filter(Pill.owner_id == current_user.id).all()
    
    # Léky v dávkovači
    loaded_pills = db.query(LoadedPill).filter(LoadedPill.owner_id == current_user.id).all()
    
    return {
        "device": f"Dávkovač {current_user.username}",
        "layers": current_user.layers,
        "planned_pills": [
            {
                "id": p.id,
                "name": p.name,
                "time": p.time,
                "dose": p.dose,
                "repeat": p.repeat
            }
            for p in all_pills
        ],
        "loaded_pills": [
            {
                "id": lp.id,
                "layer": lp.layer,
                "position": lp.position,
                "compartment": lp.compartment,
                "time": lp.time,
                "content": lp.pills_content
            }
            for lp in loaded_pills
        ]
    }


# ── CONSUMPTION ENDPOINT ───────────────────────────────────────────────────────

@app.get("/api/consumption")
def get_consumption_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Vrátí historii užitých léků (kompatibilita s frontend)"""
    consumptions = db.query(Consumption).filter(
        Consumption.owner_id == current_user.id
    ).order_by(Consumption.date.desc(), Consumption.time.desc()).all()
    
    return {
        "consumed": [
            {
                "date": c.date,
                "time": c.time,
                "name": c.pill_name,
                "status": c.status
            }
            for c in consumptions
        ]
    }



