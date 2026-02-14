from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Setup
from ..schemas import SetupCreate, SetupResponse

router = APIRouter(prefix="/api/setups", tags=["setups"])


@router.get("/", response_model=List[SetupResponse])
def get_setups(db: Session = Depends(get_db)):
    """Get all setups/strategies."""
    return db.query(Setup).order_by(Setup.name).all()


@router.post("/", response_model=SetupResponse)
def create_setup(setup: SetupCreate, db: Session = Depends(get_db)):
    """Create a new setup/strategy."""
    existing = db.query(Setup).filter(Setup.name == setup.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Setup with this name already exists")

    db_setup = Setup(name=setup.name, description=setup.description, rules=setup.rules)
    db.add(db_setup)
    db.commit()
    db.refresh(db_setup)
    return db_setup


@router.get("/{setup_id}", response_model=SetupResponse)
def get_setup(setup_id: int, db: Session = Depends(get_db)):
    """Get a single setup."""
    setup = db.query(Setup).filter(Setup.id == setup_id).first()
    if not setup:
        raise HTTPException(status_code=404, detail="Setup not found")
    return setup


@router.put("/{setup_id}", response_model=SetupResponse)
def update_setup(setup_id: int, setup: SetupCreate, db: Session = Depends(get_db)):
    """Update a setup."""
    db_setup = db.query(Setup).filter(Setup.id == setup_id).first()
    if not db_setup:
        raise HTTPException(status_code=404, detail="Setup not found")

    db_setup.name = setup.name
    db_setup.description = setup.description
    db_setup.rules = setup.rules
    db.commit()
    db.refresh(db_setup)
    return db_setup


@router.delete("/{setup_id}")
def delete_setup(setup_id: int, db: Session = Depends(get_db)):
    """Delete a setup."""
    db_setup = db.query(Setup).filter(Setup.id == setup_id).first()
    if not db_setup:
        raise HTTPException(status_code=404, detail="Setup not found")

    db.delete(db_setup)
    db.commit()
    return {"message": "Setup deleted"}