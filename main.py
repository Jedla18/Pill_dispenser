import threading
import jinja2

from fastapi import FastAPI, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from starlette.templating import Jinja2Templates
from sqlalchemy.orm import Session

from database import get_db, engine
from models import Base
from auth import verify_password, create_access_token, get_password_hash
from models import User
import mqtt

from routers import pills, dispenser, consumption, device
from fastapi import HTTPException

# Vytvoření tabulek (pokud neexistují)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Pill Dispenser API")

# Static files + templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(env=jinja2.Environment(
    loader=jinja2.FileSystemLoader("templates"),
    auto_reload=True,
    cache_size=0
))

# Registrace routerů
app.include_router(pills.router)
app.include_router(dispenser.router)
app.include_router(consumption.router)
app.include_router(device.router)


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