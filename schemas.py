from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PillCreate(BaseModel):
    """Schema pro vytvoření nového léku"""
    name: str = Field(..., min_length=1, description="Název léku")
    time: str = Field(..., description="Čas podání (HH:MM nebo ISO datetime)")
    dose: str = Field(..., min_length=1, description="Dávka (počet tablet, ml, atd.)")
    repeat: Optional[str] = Field(default="none", description="Opakování: none, daily, weekly")


class PillResponse(BaseModel):
    """Schema pro odpověď s lékem"""
    id: int
    name: str
    time: str
    dose: str
    repeat: str

    class Config:
        from_attributes = True


class FillPlanItem(BaseModel):
    """Schema pro položku plánu plnění"""
    layer: int = Field(..., ge=1, le=8, description="Vrstva (1-8)")
    position: int = Field(..., ge=1, le=7, description="Pozice v vrstvě (1-7)")
    compartment: int = Field(..., ge=1, le=8, description="Fyzická přihrádka")
    time: str = Field(..., description="Čas podání")
    content: str = Field(..., description="Obsah (léky)")
    repeat: str = Field(default="none", description="Typ opakování")
    image_url: str = Field(..., description="URL obrázku pozice")


class DispenseConfirm(BaseModel):
    """Schema pro potvrzení vydání léku MCU"""
    loaded_pill_id: int = Field(..., description="ID vydaného léku")
    timestamp: str = Field(..., description="Čas vydání (ISO format)")


class UserUpdate(BaseModel):
    """Schema pro aktualizaci nastavení uživatele"""
    layers: int = Field(..., ge=1, le=8, description="Počet vrstev (1-8)")


class WeightRecordOut(BaseModel):
    """Jeden záznam z vážení."""
    id: int
    timestamp: datetime
    weight: float = Field(..., description="Hmotnost v kg")

    class Config:
        from_attributes = True


class WeightRecordCreate(BaseModel):
    """Schema pro vytvoření nového záznamu váhy."""
    weight: float = Field(..., gt=0, description="Hmotnost v kg (musí být kladná)")
    
    class Config:
        from_attributes = True
