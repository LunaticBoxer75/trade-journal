from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date


# --- Tags ---
class TagBase(BaseModel):
    name: str
    color: str = "#3B82F6"

class TagCreate(TagBase):
    pass

class TagResponse(TagBase):
    id: int
    class Config:
        from_attributes = True


# --- Setups ---
class SetupBase(BaseModel):
    name: str
    description: Optional[str] = None
    rules: Optional[str] = None

class SetupCreate(SetupBase):
    pass

class SetupResponse(SetupBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# --- Trades ---
class TradeBase(BaseModel):
    ticker: str
    action: str
    quantity: float
    price: float
    total_amount: float
    trade_date: datetime
    fees: float = 0
    side: Optional[str] = None
    notes: Optional[str] = None

class TradeCreate(TradeBase):
    pass

class TradeResponse(TradeBase):
    id: int
    status: str
    group_id: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True


# --- Trade Groups ---
class TradeGroupBase(BaseModel):
    ticker: str
    side: str
    notes: Optional[str] = None
    mistakes: Optional[str] = None
    rating: Optional[int] = None
    setup_id: Optional[int] = None

class TradeGroupUpdate(BaseModel):
    notes: Optional[str] = None
    mistakes: Optional[str] = None
    rating: Optional[int] = None
    setup_id: Optional[int] = None
    stop_loss: Optional[float] = None
    tag_ids: Optional[List[int]] = None

class TradeGroupResponse(BaseModel):
    id: str
    ticker: str
    side: str
    entry_date: Optional[datetime] = None
    exit_date: Optional[datetime] = None
    entry_price: Optional[float] = None
    exit_price: Optional[float] = None
    quantity: Optional[float] = None
    pnl: Optional[float] = None
    pnl_percent: Optional[float] = None
    r_multiple: Optional[float] = None
    stop_loss: Optional[float] = None
    status: str
    setup_id: Optional[int] = None
    notes: Optional[str] = None
    mistakes: Optional[str] = None
    rating: Optional[int] = None
    created_at: datetime
    trades: List[TradeResponse] = []
    tags: List[TagResponse] = []
    setup: Optional[SetupResponse] = None
    class Config:
        from_attributes = True

class TradeGroupListResponse(BaseModel):
    id: str
    ticker: str
    side: str
    entry_date: Optional[datetime] = None
    exit_date: Optional[datetime] = None
    entry_price: Optional[float] = None
    exit_price: Optional[float] = None
    quantity: Optional[float] = None
    pnl: Optional[float] = None
    pnl_percent: Optional[float] = None
    r_multiple: Optional[float] = None
    stop_loss: Optional[float] = None
    status: str
    rating: Optional[int] = None
    tags: List[TagResponse] = []
    setup: Optional[SetupResponse] = None
    class Config:
        from_attributes = True


# --- Journal ---
class JournalEntryBase(BaseModel):
    date: date
    pre_market_notes: Optional[str] = None
    post_market_notes: Optional[str] = None
    mood: Optional[str] = None
    market_conditions: Optional[str] = None
    lessons_learned: Optional[str] = None

class JournalEntryCreate(JournalEntryBase):
    pass

class JournalEntryUpdate(BaseModel):
    pre_market_notes: Optional[str] = None
    post_market_notes: Optional[str] = None
    mood: Optional[str] = None
    market_conditions: Optional[str] = None
    lessons_learned: Optional[str] = None

class JournalEntryResponse(JournalEntryBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# --- Account Snapshots ---
class AccountSnapshotCreate(BaseModel):
    date: date
    balance: float
    daily_pnl: Optional[float] = None

class AccountSnapshotResponse(AccountSnapshotCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# --- Dashboard ---
class DashboardStats(BaseModel):
    total_trades: int
    total_pnl: float
    win_rate: float
    avg_win: float
    avg_loss: float
    profit_factor: float
    best_trade: float
    worst_trade: float
    current_balance: Optional[float] = None
    total_winning_trades: int
    total_losing_trades: int


# --- Import ---
class ImportResult(BaseModel):
    trades_imported: int
    groups_created: int
    errors: List[str] = []