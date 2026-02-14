hfrom sqlalchemy import (
    Column, Integer, String, Float, DateTime, Date, Text, ForeignKey, Table, Boolean
)
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

# Association table for trade_groups <-> tags
trade_group_tags = Table(
    "trade_group_tags",
    Base.metadata,
    Column("trade_group_id", String, ForeignKey("trade_groups.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
)


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, nullable=False, index=True)
    action = Column(String, nullable=False)  # BUY, SELL
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    trade_date = Column(DateTime, nullable=False, index=True)
    fees = Column(Float, default=0)
    side = Column(String)  # LONG, SHORT
    status = Column(String, default="OPEN")  # OPEN, CLOSED
    group_id = Column(String, ForeignKey("trade_groups.id"), nullable=True, index=True)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    group = relationship("TradeGroup", back_populates="trades")


class TradeGroup(Base):
    __tablename__ = "trade_groups"

    id = Column(String, primary_key=True)  # UUID
    ticker = Column(String, nullable=False, index=True)
    side = Column(String, nullable=False)  # LONG, SHORT
    entry_date = Column(DateTime)
    exit_date = Column(DateTime)
    entry_price = Column(Float)
    exit_price = Column(Float)
    quantity = Column(Float)
    pnl = Column(Float)
    pnl_percent = Column(Float)
    r_multiple = Column(Float)
    stop_loss = Column(Float)
    status = Column(String, default="OPEN")  # OPEN, CLOSED
    setup_id = Column(Integer, ForeignKey("setups.id"), nullable=True)
    notes = Column(Text)
    mistakes = Column(Text)
    rating = Column(Integer)  # 1-5
    created_at = Column(DateTime, default=datetime.utcnow)

    trades = relationship("Trade", back_populates="group", order_by="Trade.trade_date")
    setup = relationship("Setup", back_populates="trade_groups")
    tags = relationship("Tag", secondary=trade_group_tags, back_populates="trade_groups")


class Setup(Base):
    __tablename__ = "setups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text)
    rules = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    trade_groups = relationship("TradeGroup", back_populates="setup")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    color = Column(String, default="#3B82F6")

    trade_groups = relationship("TradeGroup", secondary=trade_group_tags, back_populates="tags")


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, nullable=False, index=True)
    pre_market_notes = Column(Text)
    post_market_notes = Column(Text)
    mood = Column(String)
    market_conditions = Column(Text)
    lessons_learned = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class AccountSnapshot(Base):
    __tablename__ = "account_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    balance = Column(Float, nullable=False)
    daily_pnl = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)