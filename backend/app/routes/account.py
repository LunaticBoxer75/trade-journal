from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from ..database import get_db
from ..models import AccountSnapshot
from ..schemas import AccountSnapshotCreate, AccountSnapshotResponse

router = APIRouter(prefix="/api/account", tags=["account"])


@router.get("/snapshots", response_model=List[AccountSnapshotResponse])
def get_snapshots(
    limit: int = Query(90, ge=1, le=365),
    db: Session = Depends(get_db),
):
    """Get account balance snapshots."""
    return (
        db.query(AccountSnapshot)
        .order_by(AccountSnapshot.date.desc())
        .limit(limit)
        .all()
    )


@router.post("/snapshots", response_model=AccountSnapshotResponse)
def create_snapshot(snapshot: AccountSnapshotCreate, db: Session = Depends(get_db)):
    """Create or update an account snapshot."""
    existing = db.query(AccountSnapshot).filter(AccountSnapshot.date == snapshot.date).first()
    if existing:
        existing.balance = snapshot.balance
        existing.daily_pnl = snapshot.daily_pnl
        db.commit()
        db.refresh(existing)
        return existing

    db_snapshot = AccountSnapshot(
        date=snapshot.date,
        balance=snapshot.balance,
        daily_pnl=snapshot.daily_pnl,
    )
    db.add(db_snapshot)
    db.commit()
    db.refresh(db_snapshot)
    return db_snapshot


@router.get("/balance")
def get_current_balance(db: Session = Depends(get_db)):
    """Get the latest account balance."""
    snapshot = (
        db.query(AccountSnapshot)
        .order_by(AccountSnapshot.date.desc())
        .first()
    )
    if not snapshot:
        return {"balance": None, "date": None}
    return {"balance": snapshot.balance, "date": snapshot.date.isoformat()}