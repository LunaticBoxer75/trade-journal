from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import yfinance as yf

from ..database import get_db
from ..models import Trade, TradeGroup, Tag, trade_group_tags
from ..schemas import (
    TradeResponse, TradeGroupResponse, TradeGroupListResponse,
    TradeGroupUpdate, ImportResult
)
from ..utils.csv_parser import parse_robinhood_csv, group_trades_into_round_trips

router = APIRouter(prefix="/api/trades", tags=["trades"])


@router.post("/import", response_model=ImportResult)
async def import_trades(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Import trades from a Robinhood CSV file."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = await file.read()
    file_content = content.decode("utf-8")

    # Parse CSV
    parsed_trades = parse_robinhood_csv(file_content)

    # Separate errors from valid trades
    errors = [t["error"] for t in parsed_trades if "error" in t]
    valid_trades = [t for t in parsed_trades if "error" not in t]

    if not valid_trades:
        raise HTTPException(status_code=400, detail=f"No valid trades found. Errors: {errors}")

    # Group into round trips
    groups = group_trades_into_round_trips(valid_trades)

    # Duplicate detection: per ticker, find the latest existing trade date.
    # Only import trades newer than that date. If no existing trades for a ticker, import all.
    from sqlalchemy import func
    latest_dates = dict(
        db.query(Trade.ticker, func.max(Trade.trade_date))
        .group_by(Trade.ticker)
        .all()
    )

    # Save to database, skipping trades at or before the latest existing date per ticker
    trades_imported = 0
    trades_skipped = 0
    groups_created = 0

    for group_data in groups:
        ticker = group_data["ticker"]
        cutoff = latest_dates.get(ticker)

        # Filter to only trades newer than what we already have
        new_trades = []
        for trade_data in group_data["trades"]:
            if cutoff and trade_data["trade_date"] <= cutoff:
                trades_skipped += 1
            else:
                new_trades.append(trade_data)

        if not new_trades:
            continue  # All trades already exist

        # Create TradeGroup
        trade_group = TradeGroup(
            id=group_data["group_id"],
            ticker=group_data["ticker"],
            side=group_data["side"],
            entry_date=group_data["entry_date"],
            exit_date=group_data["exit_date"],
            entry_price=group_data["entry_price"],
            exit_price=group_data["exit_price"],
            quantity=group_data["quantity"],
            pnl=group_data["pnl"],
            pnl_percent=group_data["pnl_percent"],
            status=group_data["status"],
        )
        db.add(trade_group)
        groups_created += 1

        # Create individual trades (only non-duplicates)
        for trade_data in new_trades:
            trade = Trade(
                ticker=trade_data["ticker"],
                action=trade_data["action"],
                quantity=trade_data["quantity"],
                price=trade_data["price"],
                total_amount=trade_data["total_amount"],
                trade_date=trade_data["trade_date"],
                fees=trade_data.get("fees", 0),
                side=trade_data.get("side", "LONG"),
                status="CLOSED" if group_data["status"] == "CLOSED" else "OPEN",
                group_id=group_data["group_id"],
            )
            db.add(trade)
            trades_imported += 1

    db.commit()

    return ImportResult(
        trades_imported=trades_imported,
        groups_created=groups_created,
        errors=errors if not trades_skipped else errors + [f"{trades_skipped} existing trades skipped"],
    )


@router.get("/groups", response_model=List[TradeGroupListResponse])
def get_trade_groups(
    status: Optional[str] = Query(None, description="Filter by status: OPEN or CLOSED"),
    ticker: Optional[str] = Query(None, description="Filter by ticker symbol"),
    side: Optional[str] = Query(None, description="Filter by side: LONG or SHORT"),
    sort_by: str = Query("entry_date", description="Sort field"),
    sort_dir: str = Query("desc", description="Sort direction: asc or desc"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Get all trade groups with filtering and sorting."""
    query = db.query(TradeGroup).options(
        joinedload(TradeGroup.tags),
        joinedload(TradeGroup.setup),
    )

    # Apply filters
    if status:
        query = query.filter(TradeGroup.status == status.upper())
    if ticker:
        query = query.filter(TradeGroup.ticker == ticker.upper())
    if side:
        query = query.filter(TradeGroup.side == side.upper())

    # Apply sorting
    sort_column = getattr(TradeGroup, sort_by, TradeGroup.entry_date)
    if sort_dir.lower() == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Apply pagination
    groups = query.offset(offset).limit(limit).all()
    return groups


@router.get("/groups/{group_id}", response_model=TradeGroupResponse)
def get_trade_group(group_id: str, db: Session = Depends(get_db)):
    """Get a single trade group with all its trades."""
    group = (
        db.query(TradeGroup)
        .options(
            joinedload(TradeGroup.trades),
            joinedload(TradeGroup.tags),
            joinedload(TradeGroup.setup),
        )
        .filter(TradeGroup.id == group_id)
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Trade group not found")
    return group


@router.put("/groups/{group_id}", response_model=TradeGroupResponse)
def update_trade_group(
    group_id: str,
    update: TradeGroupUpdate,
    db: Session = Depends(get_db),
):
    """Update a trade group (notes, mistakes, rating, setup, tags)."""
    group = db.query(TradeGroup).filter(TradeGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Trade group not found")

    if update.notes is not None:
        group.notes = update.notes
    if update.mistakes is not None:
        group.mistakes = update.mistakes
    if update.rating is not None:
        group.rating = update.rating
    if update.setup_id is not None:
        group.setup_id = update.setup_id

    # Update tags
    if update.tag_ids is not None:
        tags = db.query(Tag).filter(Tag.id.in_(update.tag_ids)).all()
        group.tags = tags

    db.commit()
    db.refresh(group)

    # Reload with relationships
    group = (
        db.query(TradeGroup)
        .options(
            joinedload(TradeGroup.trades),
            joinedload(TradeGroup.tags),
            joinedload(TradeGroup.setup),
        )
        .filter(TradeGroup.id == group_id)
        .first()
    )
    return group


@router.delete("/groups/{group_id}")
def delete_trade_group(group_id: str, db: Session = Depends(get_db)):
    """Delete a trade group and its trades."""
    group = db.query(TradeGroup).filter(TradeGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Trade group not found")

    # Delete associated trades
    db.query(Trade).filter(Trade.group_id == group_id).delete()
    # Delete tag associations
    db.execute(trade_group_tags.delete().where(trade_group_tags.c.trade_group_id == group_id))
    # Delete group
    db.delete(group)
    db.commit()
    return {"message": "Trade group deleted"}


@router.put("/executions/{trade_id}")
def update_trade_execution(trade_id: int, db: Session = Depends(get_db)):
    """Update an individual trade execution's date/time."""
    import json
    from starlette.requests import Request
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade


@router.put("/executions/{trade_id}/datetime")
def update_trade_datetime(
    trade_id: int,
    body: dict,
    db: Session = Depends(get_db),
):
    """Update the trade_date of an individual execution."""
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    new_date_str = body.get("trade_date")
    if not new_date_str:
        raise HTTPException(status_code=400, detail="trade_date is required")

    try:
        new_date = datetime.fromisoformat(new_date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format: YYYY-MM-DDTHH:MM:SS")

    trade.trade_date = new_date
    db.commit()

    # Recalculate group metrics if trade belongs to a group
    if trade.group_id:
        _recalculate_group_metrics(trade.group_id, db)
        db.commit()

    return {"message": "Trade date updated", "trade_id": trade_id, "trade_date": new_date.isoformat()}


@router.get("/tickers", response_model=List[str])
def get_unique_tickers(db: Session = Depends(get_db)):
    """Get all unique ticker symbols."""
    tickers = db.query(TradeGroup.ticker).distinct().order_by(TradeGroup.ticker).all()
    return [t[0] for t in tickers]


@router.post("/groups/{group_id}/split", response_model=TradeGroupResponse)
def split_trade_group(
    group_id: str,
    trade_ids: List[int],
    db: Session = Depends(get_db),
):
    """Split selected executions from a trade group into a new trade group."""
    # Load original group
    original = (
        db.query(TradeGroup)
        .options(joinedload(TradeGroup.trades))
        .filter(TradeGroup.id == group_id)
        .first()
    )
    if not original:
        raise HTTPException(status_code=404, detail="Trade group not found")

    # Validate trade_ids
    original_trade_ids = {t.id for t in original.trades}
    selected_ids = set(trade_ids)

    if not selected_ids:
        raise HTTPException(status_code=400, detail="Must select at least one execution")
    if not selected_ids.issubset(original_trade_ids):
        raise HTTPException(status_code=400, detail="Some trade IDs don't belong to this group")
    if selected_ids == original_trade_ids:
        raise HTTPException(status_code=400, detail="Cannot move all executions. Use delete instead.")

    # Create new group
    new_group_id = str(uuid.uuid4())
    new_group = TradeGroup(
        id=new_group_id,
        ticker=original.ticker,
        side=original.side,
        status="OPEN",
    )
    db.add(new_group)

    # Move selected trades to new group
    for trade in original.trades:
        if trade.id in selected_ids:
            trade.group_id = new_group_id

    db.flush()

    # Recalculate metrics for both groups
    _recalculate_group_metrics(new_group_id, db)
    _recalculate_group_metrics(group_id, db)

    db.commit()

    # Return new group
    new_group = (
        db.query(TradeGroup)
        .options(
            joinedload(TradeGroup.trades),
            joinedload(TradeGroup.tags),
            joinedload(TradeGroup.setup),
        )
        .filter(TradeGroup.id == new_group_id)
        .first()
    )
    return new_group


def _recalculate_group_metrics(group_id: str, db: Session):
    """Recalculate P&L and other metrics for a trade group based on its current trades."""
    group = db.query(TradeGroup).filter(TradeGroup.id == group_id).first()
    if not group:
        return

    trades = db.query(Trade).filter(Trade.group_id == group_id).order_by(Trade.trade_date).all()
    if not trades:
        db.delete(group)
        return

    entry_trades = [t for t in trades if t.action == "BUY"] if group.side == "LONG" else [t for t in trades if t.action == "SELL"]
    exit_trades = [t for t in trades if t.action == "SELL"] if group.side == "LONG" else [t for t in trades if t.action == "BUY"]

    # Weighted average entry price
    total_entry_shares = sum(t.quantity for t in entry_trades) if entry_trades else 0
    total_entry_cost = sum(t.quantity * t.price for t in entry_trades) if entry_trades else 0
    entry_price = total_entry_cost / total_entry_shares if total_entry_shares > 0 else 0

    # Weighted average exit price
    total_exit_shares = sum(t.quantity for t in exit_trades) if exit_trades else 0
    total_exit_cost = sum(t.quantity * t.price for t in exit_trades) if exit_trades else 0
    exit_price = total_exit_cost / total_exit_shares if total_exit_shares > 0 else 0

    # Dates
    group.entry_date = min(t.trade_date for t in entry_trades) if entry_trades else None
    group.exit_date = max(t.trade_date for t in exit_trades) if exit_trades else None

    # Prices
    group.entry_price = round(entry_price, 4)
    group.exit_price = round(exit_price, 4) if exit_price else None
    group.quantity = total_entry_shares

    # P&L
    matched_shares = min(total_entry_shares, total_exit_shares)
    if group.side == "LONG":
        pnl = (exit_price - entry_price) * matched_shares if exit_trades else 0
    else:
        pnl = (entry_price - exit_price) * matched_shares if exit_trades else 0

    total_fees = sum(t.fees or 0 for t in trades)
    group.pnl = round(pnl - total_fees, 2)
    group.pnl_percent = round((pnl / (entry_price * total_entry_shares) * 100), 2) if (entry_price and total_entry_shares) else 0

    # Status
    if total_exit_shares >= total_entry_shares and exit_trades:
        group.status = "CLOSED"
    else:
        group.status = "OPEN"


@router.get("/groups/{group_id}/chart")
def get_trade_chart_data(
    group_id: str,
    interval: str = Query("1d", description="Chart interval: 1m, 5m, 15m, 30m, 1h, 4h, 1d"),
    db: Session = Depends(get_db),
):
    """Get OHLCV candle data for a trade group's ticker, plus execution markers."""
    VALID_INTERVALS = {"5m", "15m", "30m", "1h", "4h", "1d"}
    if interval not in VALID_INTERVALS:
        raise HTTPException(status_code=400, detail=f"Invalid interval. Must be one of: {', '.join(sorted(VALID_INTERVALS))}")

    group = (
        db.query(TradeGroup)
        .options(joinedload(TradeGroup.trades))
        .filter(TradeGroup.id == group_id)
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Trade group not found")

    # Determine date range with padding based on interval
    trade_dates = [t.trade_date for t in group.trades if t.trade_date]
    if not trade_dates:
        raise HTTPException(status_code=400, detail="No trade dates found")

    min_date = min(trade_dates)
    max_date = max(trade_dates)

    # Intraday intervals: Yahoo limits to ~60 days, need tighter range
    is_intraday = interval != "1d"
    if is_intraday:
        # For intraday, use smaller padding and limit range
        # Yahoo Finance limits: 1m=7days, 5m/15m/30m=60days, 1h/4h=730days
        if interval == "1m":
            pad_before = timedelta(days=2)
            pad_after = timedelta(days=1)
        elif interval in ("5m", "15m", "30m"):
            pad_before = timedelta(days=5)
            pad_after = timedelta(days=2)
        else:  # 1h, 4h
            pad_before = timedelta(days=10)
            pad_after = timedelta(days=5)
    else:
        pad_before = timedelta(days=30)
        pad_after = timedelta(days=15)

    start = (min_date - pad_before).strftime("%Y-%m-%d")
    end = (max_date + pad_after).strftime("%Y-%m-%d")

    # Map interval for yfinance (4h not directly supported, use 1h and aggregate isn't needed — yfinance does support some)
    # yfinance valid intervals: 1m,2m,5m,15m,30m,60m,90m,1h,1d,5d,1wk,1mo,3mo
    yf_interval = interval
    if interval == "4h":
        yf_interval = "1h"  # fetch 1h and we'll aggregate to 4h

    # Fetch data from Yahoo Finance
    try:
        ticker = yf.Ticker(group.ticker)
        df = ticker.history(start=start, end=end, interval=yf_interval)
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No price data found for {group.ticker} at interval {interval}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch price data: {str(e)}")

    # Aggregate to 4h if needed
    if interval == "4h" and not df.empty:
        df = df.resample("4h").agg({
            "Open": "first",
            "High": "max",
            "Low": "min",
            "Close": "last",
            "Volume": "sum",
        }).dropna(subset=["Open"])

    # Convert to candle format
    candles = []
    for idx, row in df.iterrows():
        if is_intraday:
            # For intraday, use Unix timestamp
            ts = int(idx.timestamp())
            candles.append({
                "time": ts,
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]) if not pandas_isna(row["Volume"]) else 0,
            })
        else:
            candles.append({
                "time": idx.strftime("%Y-%m-%d"),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]) if not pandas_isna(row["Volume"]) else 0,
            })

    # Build markers from executions
    markers = []
    for t in sorted(group.trades, key=lambda x: x.trade_date):
        if is_intraday:
            # For intraday, find the closest candle timestamp
            trade_ts = int(t.trade_date.timestamp())
            # Snap to nearest candle time
            closest_time = trade_ts
            if candles:
                closest_time = min(candles, key=lambda c: abs(c["time"] - trade_ts))["time"]
            markers.append({
                "time": closest_time,
                "position": "belowBar" if t.action == "BUY" else "aboveBar",
                "color": "#22c55e" if t.action == "BUY" else "#ef4444",
                "shape": "arrowUp" if t.action == "BUY" else "arrowDown",
                "text": "",
            })
        else:
            markers.append({
                "time": t.trade_date.strftime("%Y-%m-%d"),
                "position": "belowBar" if t.action == "BUY" else "aboveBar",
                "color": "#22c55e" if t.action == "BUY" else "#ef4444",
                "shape": "arrowUp" if t.action == "BUY" else "arrowDown",
                "text": "",
            })

    return {"candles": candles, "markers": markers, "ticker": group.ticker, "interval": interval}


def pandas_isna(val):
    """Check if a value is NaN (works without importing pandas directly)."""
    try:
        import math
        return math.isnan(float(val))
    except (ValueError, TypeError):
        return False


@router.delete("/all")
def delete_all_trades(db: Session = Depends(get_db)):
    """Delete all trades and groups. Use with caution."""
    db.execute(trade_group_tags.delete())
    db.query(Trade).delete()
    db.query(TradeGroup).delete()
    db.commit()
    return {"message": "All trades deleted"}