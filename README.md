# TradeJournal

A personal trading journal inspired by Tradezella. Track, analyze, and improve your stock trading.

## Features

- **Trade Import** — Upload Robinhood CSV exports, auto-groups buy/sell into round-trip trades
- **Dashboard** — Key stats at a glance: P&L, win rate, profit factor, drawdown
- **Trade Log** — Filterable/sortable table of all trades with detail views
- **Trade Detail** — TradingView chart embed, notes, mistakes, ratings, tags, setup linking
- **Analytics** — Equity curve, drawdown chart, P&L by ticker/day/setup
- **Calendar** — Monthly heat map showing green/red days
- **Journal** — Daily pre/post-market notes, mood tracking, lessons learned
- **Playbook** — Define your strategies with entry/exit rules
- **Tags** — Custom colored tags to categorize trades
- **Settings** — Account balance tracking, Discord integration (coming soon)

## Tech Stack

- **Frontend**: React 18 + Vite + TailwindCSS + Recharts
- **Backend**: Python FastAPI + SQLAlchemy
- **Database**: SQLite (local file)
- **Charts**: TradingView Advanced Charts Widget (embedded)

## Quick Start

### 1. Backend

```bash
cd tradejournal/backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 2. Frontend

```bash
cd tradejournal/frontend
npm install
npm run dev
```

App available at: http://localhost:5173

### 3. Import Trades

1. Export your trade history from Robinhood as CSV
2. Go to the Import page in the app
3. Upload your CSV file

## Project Structure

```
tradejournal/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI entry point
│   │   ├── database.py      # SQLite/SQLAlchemy config
│   │   ├── models.py        # Database models
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── routes/          # API route handlers
│   │   └── utils/           # CSV parser, helpers
│   ├── data/                # SQLite database file (auto-created)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           # React page components
│   │   ├── services/        # API client
│   │   └── App.jsx          # Main app with routing
│   ├── package.json
│   └── vite.config.js
└── README.md