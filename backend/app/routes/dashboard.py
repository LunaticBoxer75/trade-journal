from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional
from datetime import datetime, date, timedelta

from ..database import get_db
from ..models import TradeGroup, AccountSnapshot
from ..schemas import DashboardStats

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    date_from: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    """Get overall trading statistics."""
    query = db.query(TradeGroup).filter(TradeGroup.status == "CLOSED")

    if date_from:
        query = query.filter(TradeGroup.entry_date >= datetime.strptime(date_from, "%Y-%m-%d"))
    if date_to:
        query = query.filter(TradeGroup.entry_date <= datetime.strptime(date_to, "%Y-%m-%d"))

    groups = query.all()

    if not groups:
        return DashboardStats(
            total_trades=0,
            total_pnl=0,
            win_rate=0,
            avg_win=0,
            avg_loss=0,
            profit_factor=0,
            best_trade=0,
            worst_trade=0,
            current_balance=None,
            total_winning_trades=0,
            total_losing_trades=0,
        )

    winning = [g for g in groups if g.pnl and g.pnl > 0]
    losing = [g for g in groups if g.pnl and g.pnl < 0]
    breakeven = [g for g in groups if g.pnl is not None and g.pnl == 0]

    total_pnl = sum(g.pnl for g in groups if g.pnl)
    total_wins = sum(g.pnl for g in winning)
    total_losses = abs(sum(g.pnl for g in losing))

    win_rate = (len(winning) / len(groups) * 100) if groups else 0
    avg_win = (total_wins / len(winning)) if winning else 0
    avg_loss = (total_losses / len(losing)) if losing else 0
    profit_factor = (total_wins / total_losses) if total_losses > 0 else float("inf") if total_wins > 0 else 0

    pnl_values = [g.pnl for g in groups if g.pnl is not None]
    best_trade = max(pnl_values) if pnl_values else 0
    worst_trade = min(pnl_values) if pnl_values else 0

    # Get latest account balance
    latest_snapshot = (
        db.query(AccountSnapshot)
        .order_by(AccountSnapshot.date.desc())
        .first()
    )

    return DashboardStats(
        total_trades=len(groups),
        total_pnl=round(total_pnl, 2),
        win_rate=round(win_rate, 2),
        avg_win=round(avg_win, 2),
        avg_loss=round(avg_loss, 2),
        profit_factor=round(profit_factor, 2) if profit_factor != float("inf") else 999.99,
        best_trade=round(best_trade, 2),
        worst_trade=round(worst_trade, 2),
        current_balance=latest_snapshot.balance if latest_snapshot else None,
        total_winning_trades=len(winning),
        total_losing_trades=len(losing),
    )


def _compute_daily_pnl(db: Session, date_from: Optional[str] = None, date_to: Optional[str] = None):
    """Internal helper: compute daily P&L data."""
    query = db.query(TradeGroup).filter(TradeGroup.status == "CLOSED")

    if date_from:
        query = query.filter(TradeGroup.exit_date >= datetime.strptime(date_from, "%Y-%m-%d"))
    if date_to:
        query = query.filter(TradeGroup.exit_date <= datetime.strptime(date_to, "%Y-%m-%d"))

    groups = query.order_by(TradeGroup.exit_date.asc()).all()

    # Aggregate by date
    daily = {}
    for g in groups:
        if g.exit_date and g.pnl is not None:
            day = g.exit_date.strftime("%Y-%m-%d")
            if day not in daily:
                daily[day] = {"date": day, "pnl": 0, "trades": 0, "wins": 0, "losses": 0}
            daily[day]["pnl"] += g.pnl
            daily[day]["trades"] += 1
            if g.pnl > 0:
                daily[day]["wins"] += 1
            elif g.pnl < 0:
                daily[day]["losses"] += 1

    # Round pnl values
    for day in daily.values():
        day["pnl"] = round(day["pnl"], 2)

    return sorted(daily.values(), key=lambda x: x["date"])


@router.get("/daily-pnl")
def get_daily_pnl(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get daily P&L for calendar and equity curve."""
    return _compute_daily_pnl(db, date_from, date_to)


@router.get("/equity-curve")
def get_equity_curve(
    starting_balance: float = Query(0, description="Starting account balance"),
    db: Session = Depends(get_db),
):
    """Get cumulative P&L data for equity curve chart."""
    return _compute_equity_curve(starting_balance, db)


def _compute_equity_curve(starting_balance: float, db: Session):
    """Internal helper: compute equity curve."""
    daily_pnl = _compute_daily_pnl(db)

    cumulative = starting_balance
    curve = []
    peak = starting_balance

    for day in daily_pnl:
        cumulative += day["pnl"]
        if cumulative > peak:
            peak = cumulative
        drawdown = ((peak - cumulative) / peak * 100) if peak > 0 else 0

        curve.append({
            "date": day["date"],
            "balance": round(cumulative, 2),
            "daily_pnl": day["pnl"],
            "drawdown_pct": round(drawdown, 2),
            "peak": round(peak, 2),
        })

    return curve


@router.get("/drawdown")
def get_drawdown_metrics(
    starting_balance: float = Query(0, description="Starting account balance"),
    db: Session = Depends(get_db),
):
    """Get current and max drawdown metrics."""
    curve = _compute_equity_curve(starting_balance, db)

    if not curve:
        return {
            "current_drawdown": 0,
            "current_drawdown_pct": 0,
            "max_drawdown": 0,
            "max_drawdown_pct": 0,
            "max_drawdown_date": None,
            "drawdown_duration_days": 0,
            "in_drawdown": False,
        }

    max_dd_pct = 0
    max_dd_amount = 0
    max_dd_date = None
    current_dd_start = None

    for point in curve:
        dd_pct = point["drawdown_pct"]
        dd_amount = point["peak"] - point["balance"]

        if dd_pct > max_dd_pct:
            max_dd_pct = dd_pct
            max_dd_amount = dd_amount
            max_dd_date = point["date"]

    latest = curve[-1] if curve else None
    current_dd_pct = latest["drawdown_pct"] if latest else 0
    current_dd_amount = (latest["peak"] - latest["balance"]) if latest else 0

    # Calculate drawdown duration
    dd_duration = 0
    if current_dd_pct > 0:
        for point in reversed(curve):
            if point["drawdown_pct"] > 0:
                dd_duration += 1
            else:
                break

    return {
        "current_drawdown": round(current_dd_amount, 2),
        "current_drawdown_pct": round(current_dd_pct, 2),
        "max_drawdown": round(max_dd_amount, 2),
        "max_drawdown_pct": round(max_dd_pct, 2),
        "max_drawdown_date": max_dd_date,
        "drawdown_duration_days": dd_duration,
        "in_drawdown": current_dd_pct > 0,
    }


@router.get("/performance-by-ticker")
def get_performance_by_ticker(db: Session = Depends(get_db)):
    """Get performance breakdown by ticker."""
    groups = db.query(TradeGroup).filter(TradeGroup.status == "CLOSED").all()

    by_ticker = {}
    for g in groups:
        if g.ticker not in by_ticker:
            by_ticker[g.ticker] = {"ticker": g.ticker, "trades": 0, "pnl": 0, "wins": 0, "losses": 0}
        by_ticker[g.ticker]["trades"] += 1
        by_ticker[g.ticker]["pnl"] += g.pnl or 0
        if g.pnl and g.pnl > 0:
            by_ticker[g.ticker]["wins"] += 1
        elif g.pnl and g.pnl < 0:
            by_ticker[g.ticker]["losses"] += 1

    for t in by_ticker.values():
        t["pnl"] = round(t["pnl"], 2)
        t["win_rate"] = round(t["wins"] / t["trades"] * 100, 2) if t["trades"] > 0 else 0

    return sorted(by_ticker.values(), key=lambda x: x["pnl"], reverse=True)


@router.get("/performance-by-day-of-week")
def get_performance_by_day(db: Session = Depends(get_db)):
    """Get performance breakdown by day of week."""
    groups = db.query(TradeGroup).filter(
        TradeGroup.status == "CLOSED",
        TradeGroup.entry_date.isnot(None),
    ).all()

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    by_day = {d: {"day": d, "trades": 0, "pnl": 0, "wins": 0, "losses": 0} for d in days}

    for g in groups:
        if g.entry_date:
            day_name = days[g.entry_date.weekday()]
            by_day[day_name]["trades"] += 1
            by_day[day_name]["pnl"] += g.pnl or 0
            if g.pnl and g.pnl > 0:
                by_day[day_name]["wins"] += 1
            elif g.pnl and g.pnl < 0:
                by_day[day_name]["losses"] += 1

    result = []
    for d in days:
        entry = by_day[d]
        entry["pnl"] = round(entry["pnl"], 2)
        entry["win_rate"] = round(entry["wins"] / entry["trades"] * 100, 2) if entry["trades"] > 0 else 0
        result.append(entry)

    return result


@router.get("/performance-by-setup")
def get_performance_by_setup(db: Session = Depends(get_db)):
    """Get performance breakdown by setup/strategy."""
    from ..models import Setup

    groups = (
        db.query(TradeGroup)
        .filter(TradeGroup.status == "CLOSED", TradeGroup.setup_id.isnot(None))
        .all()
    )

    by_setup = {}
    for g in groups:
        setup_id = g.setup_id
        if setup_id not in by_setup:
            setup = db.query(Setup).filter(Setup.id == setup_id).first()
            by_setup[setup_id] = {
                "setup_id": setup_id,
                "setup_name": setup.name if setup else "Unknown",
                "trades": 0,
                "pnl": 0,
                "wins": 0,
                "losses": 0,
            }
        by_setup[setup_id]["trades"] += 1
        by_setup[setup_id]["pnl"] += g.pnl or 0
        if g.pnl and g.pnl > 0:
            by_setup[setup_id]["wins"] += 1
        elif g.pnl and g.pnl < 0:
            by_setup[setup_id]["losses"] += 1

    for s in by_setup.values():
        s["pnl"] = round(s["pnl"], 2)
        s["win_rate"] = round(s["wins"] / s["trades"] * 100, 2) if s["trades"] > 0 else 0

    return sorted(by_setup.values(), key=lambda x: x["pnl"], reverse=True)