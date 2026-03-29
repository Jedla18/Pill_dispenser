from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"
    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    layers          = Column(Integer, default=1)

    pills        = relationship("Pill",        back_populates="owner")
    consumptions = relationship("Consumption", back_populates="owner")
    loaded_pills = relationship("LoadedPill",  back_populates="owner")


class Pill(Base):
    __tablename__ = "pills"
    id       = Column(Integer, primary_key=True, index=True)
    name     = Column(String, index=True)
    time     = Column(String)
    dose     = Column(String)
    repeat   = Column(String, default="none")  # "none" | "daily" | "weekly"
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="pills")


class LoadedPill(Base):
    __tablename__ = "loaded_pills"
    id            = Column(Integer, primary_key=True, index=True)
    layer         = Column(Integer)
    position      = Column(Integer)    # pořadový slot 1-7
    compartment   = Column(Integer)    # fyzická přihrádka na kole 1-8
    time          = Column(String)
    pills_content = Column(String)
    owner_id      = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="loaded_pills")


class Consumption(Base):
    __tablename__ = "consumptions"
    id        = Column(Integer, primary_key=True, index=True)
    date      = Column(String)
    time      = Column(String)
    pill_name = Column(String)
    status    = Column(String)   # "Vzato" | "Vynecháno" | "Vysypáno"
    owner_id  = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="consumptions")