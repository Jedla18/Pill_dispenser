from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "postgresql://jed0061:pswjed0061@158.196.134.95:5433/pill_dispenser_postgres"

#lokalni db v případě potřeby odkomentovat a zakomentovat tu vzdálenou
#DATABASE_URL = "sqlite:///./pill_dispenser.db"


engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()