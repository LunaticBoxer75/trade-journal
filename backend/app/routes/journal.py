from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from ..database import get_db
from ..models import JournalEntry
from ..schemas import JournalEntryCreate, JournalEntryUpdate, JournalEntryResponse

router = APIRouter(prefix="/api/journal", tags=["journal"])


@router.get("/", response_model=List[JournalEntryResponse])
def get_journal_entries(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(30, ge=1, le=365),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Get journal entries with optional date filtering."""
    query = db.query(JournalEntry)

    if date_from:
        query = query.filter(JournalEntry.date >= date.fromisoformat(date_from))
    if date_to:
        query = query.filter(JournalEntry.date <= date.fromisoformat(date_to))

    entries = query.order_by(JournalEntry.date.desc()).offset(offset).limit(limit).all()
    return entries


@router.get("/{entry_date}", response_model=JournalEntryResponse)
def get_journal_entry(entry_date: str, db: Session = Depends(get_db)):
    """Get a journal entry for a specific date."""
    try:
        target_date = date.fromisoformat(entry_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    entry = db.query(JournalEntry).filter(JournalEntry.date == target_date).first()
    if not entry:
        raise HTTPException(status_code=404, detail="No journal entry for this date")
    return entry


@router.post("/", response_model=JournalEntryResponse)
def create_journal_entry(entry: JournalEntryCreate, db: Session = Depends(get_db)):
    """Create a new journal entry."""
    existing = db.query(JournalEntry).filter(JournalEntry.date == entry.date).first()
    if existing:
        raise HTTPException(status_code=400, detail="Journal entry already exists for this date. Use PUT to update.")

    db_entry = JournalEntry(
        date=entry.date,
        pre_market_notes=entry.pre_market_notes,
        post_market_notes=entry.post_market_notes,
        mood=entry.mood,
        market_conditions=entry.market_conditions,
        lessons_learned=entry.lessons_learned,
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry


@router.put("/{entry_date}", response_model=JournalEntryResponse)
def update_journal_entry(entry_date: str, update: JournalEntryUpdate, db: Session = Depends(get_db)):
    """Update a journal entry for a specific date. Creates it if it doesn't exist."""
    try:
        target_date = date.fromisoformat(entry_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    entry = db.query(JournalEntry).filter(JournalEntry.date == target_date).first()

    if not entry:
        # Create new entry
        entry = JournalEntry(date=target_date)
        db.add(entry)

    if update.pre_market_notes is not None:
        entry.pre_market_notes = update.pre_market_notes
    if update.post_market_notes is not None:
        entry.post_market_notes = update.post_market_notes
    if update.mood is not None:
        entry.mood = update.mood
    if update.market_conditions is not None:
        entry.market_conditions = update.market_conditions
    if update.lessons_learned is not None:
        entry.lessons_learned = update.lessons_learned

    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_date}")
def delete_journal_entry(entry_date: str, db: Session = Depends(get_db)):
    """Delete a journal entry."""
    try:
        target_date = date.fromisoformat(entry_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    entry = db.query(JournalEntry).filter(JournalEntry.date == target_date).first()
    if not entry:
        raise HTTPException(status_code=404, detail="No journal entry for this date")

    db.delete(entry)
    db.commit()
    return {"message": "Journal entry deleted"}