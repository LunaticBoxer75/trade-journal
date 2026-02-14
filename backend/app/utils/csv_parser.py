"""
Robinhood CSV Parser & Trade Grouping Logic

Robinhood CSV format typically has columns like:
- Activity Date, Process Date, Settle Date, Instrument, Description,
  Trans Code, Quantity, Price, Amount

This parser handles the import and groups buy/sell pairs into round-trip trades.
"""
import csv
import io
import uuid
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from collections import defaultdict


def parse_robinhood_csv(file_content: str) -> List[Dict]:
    """
    Parse a Robinhood CSV export and return a list of trade dicts.
    Handles multiple possible CSV formats from Robinhood.
    """
    trades = []
    reader = csv.DictReader(io.StringIO(file_content))

    # Normalize column names (Robinhood CSVs can vary)
    fieldnames = reader.fieldnames
    if not fieldnames:
        raise ValueError("CSV file appears to be empty or has no headers")

    # Map common column name variations
    col_map = _build_column_map(fieldnames)

    for row_num, row in enumerate(reader, start=2):
        try:
            trade = _parse_row(row, col_map)
            if trade:
                trade["_row_num"] = row_num  # Track CSV row order for sorting
                trades.append(trade)
        except Exception as e:
            trades.append({"error": f"Row {row_num}: {str(e)}"})

    return trades


def _build_column_map(fieldnames: List[str]) -> Dict[str, str]:
    """Map expected fields to actual CSV column names."""
    normalized = {f.strip().lower().replace(" ", "_"): f for f in fieldnames}

    col_map = {}

    # Date field
    for key in ["activity_date", "date", "trade_date", "process_date"]:
        if key in normalized:
            col_map["date"] = normalized[key]
            break

    # Ticker/Instrument
    for key in ["instrument", "symbol", "ticker"]:
        if key in normalized:
            col_map["ticker"] = normalized[key]
            break

    # Description
    for key in ["description", "desc"]:
        if key in normalized:
            col_map["description"] = normalized[key]
            break

    # Transaction code/type
    for key in ["trans_code", "transaction_code", "type", "action", "side"]:
        if key in normalized:
            col_map["trans_code"] = normalized[key]
            break

    # Quantity
    for key in ["quantity", "qty", "shares"]:
        if key in normalized:
            col_map["quantity"] = normalized[key]
            break

    # Price
    for key in ["price", "avg_price", "average_price"]:
        if key in normalized:
            col_map["price"] = normalized[key]
            break

    # Amount
    for key in ["amount", "total", "total_amount", "net_amount"]:
        if key in normalized:
            col_map["amount"] = normalized[key]
            break

    return col_map


def _parse_row(row: Dict, col_map: Dict[str, str]) -> Optional[Dict]:
    """Parse a single CSV row into a trade dict."""
    # Get transaction code to determine if it's a buy/sell
    trans_code = row.get(col_map.get("trans_code", ""), "").strip().upper()
    description = row.get(col_map.get("description", ""), "").strip().upper()

    # Determine action (BUY/SELL)
    action = _determine_action(trans_code, description)
    if not action:
        return None  # Skip non-trade rows (dividends, transfers, etc.)

    # Parse ticker
    ticker = row.get(col_map.get("ticker", ""), "").strip().upper()
    if not ticker:
        # Try to extract from description
        ticker = _extract_ticker_from_description(description)
    if not ticker:
        return None

    # Parse date
    date_str = row.get(col_map.get("date", ""), "").strip()
    trade_date = _parse_date(date_str)

    # Parse numeric fields
    quantity = _parse_number(row.get(col_map.get("quantity", ""), "0"))
    price = _parse_number(row.get(col_map.get("price", ""), "0"))
    amount = _parse_number(row.get(col_map.get("amount", ""), "0"))

    # Calculate total if not provided
    if amount == 0 and quantity and price:
        amount = abs(quantity * price)

    quantity = abs(quantity)  # Ensure positive

    return {
        "ticker": ticker,
        "action": action,
        "quantity": quantity,
        "price": price,
        "total_amount": abs(amount),
        "trade_date": trade_date,
        "fees": 0,
        "side": "LONG" if action == "BUY" else "LONG",  # Default; grouping determines actual side
    }


def _determine_action(trans_code: str, description: str) -> Optional[str]:
    """Determine if a row is a BUY or SELL action."""
    buy_indicators = ["BUY", "BOUGHT", "B"]
    sell_indicators = ["SELL", "SOLD", "S", "SLD"]

    # Check trans_code first
    for indicator in buy_indicators:
        if trans_code == indicator or trans_code.startswith(indicator):
            return "BUY"
    for indicator in sell_indicators:
        if trans_code == indicator or trans_code.startswith(indicator):
            return "SELL"

    # Check description
    for indicator in buy_indicators:
        if indicator in description:
            return "BUY"
    for indicator in sell_indicators:
        if indicator in description:
            return "SELL"

    return None


def _extract_ticker_from_description(description: str) -> str:
    """Try to extract a ticker symbol from a description string."""
    # Common patterns: "Sold 10 shares of AAPL", "Buy AAPL"
    words = description.split()
    for i, word in enumerate(words):
        if word in ("OF", "SHARES"):
            if i + 1 < len(words):
                return words[i + 1].strip(".,;:")
    # If description is short, it might just be the ticker
    if len(words) == 1 and len(words[0]) <= 5:
        return words[0]
    return ""


def _parse_date(date_str: str) -> datetime:
    """Parse various date formats from broker CSVs."""
    # Strip whitespace
    date_str = date_str.strip()

    # Formats with time first (most specific)
    formats = [
        "%Y-%m-%dT%H:%M:%S.%f%z",   # ISO with microseconds + tz
        "%Y-%m-%dT%H:%M:%S%z",       # ISO with tz
        "%Y-%m-%dT%H:%M:%S.%f",      # ISO with microseconds
        "%Y-%m-%dT%H:%M:%S",         # ISO basic
        "%m/%d/%Y %I:%M:%S %p",      # 01/15/2025 02:30:45 PM
        "%m/%d/%Y %H:%M:%S",         # 01/15/2025 14:30:45
        "%m/%d/%Y %I:%M %p",         # 01/15/2025 02:30 PM
        "%m/%d/%Y %H:%M",            # 01/15/2025 14:30
        "%Y-%m-%d %H:%M:%S.%f",      # 2025-01-15 14:30:45.123
        "%Y-%m-%d %H:%M:%S",         # 2025-01-15 14:30:45
        "%Y-%m-%d %H:%M",            # 2025-01-15 14:30
        "%m/%d/%Y",                   # 01/15/2025 (date only)
        "%Y-%m-%d",                   # 2025-01-15 (date only)
        "%m-%d-%Y",                   # 01-15-2025
        "%m/%d/%y",                   # 01/15/25
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.replace(tzinfo=None) if dt.tzinfo else dt
        except ValueError:
            continue
    raise ValueError(f"Cannot parse date: {date_str}")


def _parse_number(value: str) -> float:
    """Parse a number string, handling currency symbols and commas."""
    if not value:
        return 0.0
    cleaned = value.strip().replace("$", "").replace(",", "").replace("(", "-").replace(")", "")
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def group_trades_into_round_trips(trades: List[Dict]) -> List[Dict]:
    """
    Group individual buy/sell trades into round-trip trade groups.

    Logic:
    - Sort trades by date
    - For each ticker, track open position
    - When position goes to zero (or reverses), close the group
    - Uses FIFO (First In, First Out) matching
    """
    # Sort by date ASC, then row_num DESC (reverses Robinhood's newest-first CSV order for same-date trades)
    sorted_trades = sorted(trades, key=lambda t: (t["trade_date"], -t.get("_row_num", 0)))

    # Track open positions per ticker
    # Each entry: {"shares": float, "trades": [list of trade dicts], "group_id": str}
    open_positions: Dict[str, List[Dict]] = defaultdict(list)
    completed_groups = []

    for trade in sorted_trades:
        if "error" in trade:
            continue

        ticker = trade["ticker"]
        action = trade["action"]
        quantity = trade["quantity"]

        # Find or create position
        if not open_positions[ticker]:
            # New position
            group_id = str(uuid.uuid4())
            position = {
                "group_id": group_id,
                "ticker": ticker,
                "side": "LONG" if action == "BUY" else "SHORT",
                "remaining_shares": quantity if action == "BUY" else -quantity,
                "trades": [trade],
                "entry_trades": [trade] if action == "BUY" else [],
                "exit_trades": [trade] if action == "SELL" else [],
            }
            trade["group_id"] = group_id
            trade["side"] = position["side"]
            open_positions[ticker].append(position)
        else:
            # Try to match with existing position
            matched = False
            for position in open_positions[ticker]:
                is_closing = (
                    (position["side"] == "LONG" and action == "SELL")
                    or (position["side"] == "SHORT" and action == "BUY")
                )

                if is_closing:
                    trade["group_id"] = position["group_id"]
                    trade["side"] = position["side"]
                    position["trades"].append(trade)
                    position["exit_trades"].append(trade)

                    if position["side"] == "LONG":
                        position["remaining_shares"] -= quantity
                    else:
                        position["remaining_shares"] += quantity

                    # Check if position is closed
                    if abs(position["remaining_shares"]) < 0.0001:
                        completed_groups.append(_finalize_group(position))
                        open_positions[ticker].remove(position)

                    matched = True
                    break

            if not matched:
                # Adding to same direction or new position
                # Check if there's an open position in the same direction
                same_dir = None
                for position in open_positions[ticker]:
                    if (position["side"] == "LONG" and action == "BUY") or \
                       (position["side"] == "SHORT" and action == "SELL"):
                        same_dir = position
                        break

                if same_dir:
                    trade["group_id"] = same_dir["group_id"]
                    trade["side"] = same_dir["side"]
                    same_dir["trades"].append(trade)
                    same_dir["entry_trades"].append(trade)
                    if action == "BUY":
                        same_dir["remaining_shares"] += quantity
                    else:
                        same_dir["remaining_shares"] -= quantity
                else:
                    # New position
                    group_id = str(uuid.uuid4())
                    position = {
                        "group_id": group_id,
                        "ticker": ticker,
                        "side": "LONG" if action == "BUY" else "SHORT",
                        "remaining_shares": quantity if action == "BUY" else -quantity,
                        "trades": [trade],
                        "entry_trades": [trade] if action == "BUY" else [],
                        "exit_trades": [trade] if action == "SELL" else [],
                    }
                    trade["group_id"] = group_id
                    trade["side"] = position["side"]
                    open_positions[ticker].append(position)

    # Finalize any remaining open positions
    for ticker, positions in open_positions.items():
        for position in positions:
            if position["trades"]:
                group = _finalize_group(position, is_open=True)
                completed_groups.append(group)

    return completed_groups


def _finalize_group(position: Dict, is_open: bool = False) -> Dict:
    """Calculate final metrics for a trade group."""
    entry_trades = position["entry_trades"]
    exit_trades = position["exit_trades"]

    # Calculate weighted average entry price
    total_entry_shares = sum(t["quantity"] for t in entry_trades) if entry_trades else 0
    total_entry_cost = sum(t["quantity"] * t["price"] for t in entry_trades) if entry_trades else 0
    entry_price = total_entry_cost / total_entry_shares if total_entry_shares > 0 else 0

    # Calculate weighted average exit price
    total_exit_shares = sum(t["quantity"] for t in exit_trades) if exit_trades else 0
    total_exit_cost = sum(t["quantity"] * t["price"] for t in exit_trades) if exit_trades else 0
    exit_price = total_exit_cost / total_exit_shares if total_exit_shares > 0 else 0

    # Entry and exit dates
    entry_date = min(t["trade_date"] for t in entry_trades) if entry_trades else None
    exit_date = max(t["trade_date"] for t in exit_trades) if exit_trades else None

    # Calculate P&L
    quantity = total_entry_shares
    if position["side"] == "LONG":
        pnl = (exit_price - entry_price) * min(total_entry_shares, total_exit_shares) if exit_trades else 0
    else:
        pnl = (entry_price - exit_price) * min(total_entry_shares, total_exit_shares) if exit_trades else 0

    # P&L percentage
    pnl_percent = (pnl / (entry_price * quantity) * 100) if (entry_price and quantity) else 0

    # Total fees
    total_fees = sum(t.get("fees", 0) for t in position["trades"])

    return {
        "group_id": position["group_id"],
        "ticker": position["ticker"],
        "side": position["side"],
        "entry_date": entry_date,
        "exit_date": exit_date,
        "entry_price": round(entry_price, 4),
        "exit_price": round(exit_price, 4) if exit_price else None,
        "quantity": quantity,
        "pnl": round(pnl - total_fees, 2),
        "pnl_percent": round(pnl_percent, 2),
        "status": "OPEN" if is_open else "CLOSED",
        "trades": position["trades"],
    }