from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from .database import engine, Base
from .routes import trades, dashboard, tags, setups, journal, account

# Create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TradeJournal API",
    description="Personal trading journal backend — track, analyze, and improve your trading.",
    version="1.0.0",
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(trades.router)
app.include_router(dashboard.router)
app.include_router(tags.router)
app.include_router(setups.router)
app.include_router(journal.router)
app.include_router(account.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve built frontend
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "frontend", "dist")
FRONTEND_DIR = os.path.abspath(FRONTEND_DIR)

if os.path.exists(FRONTEND_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="static")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(FRONTEND_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
else:
    @app.get("/")
    def root():
        return {"message": "TradeJournal API is running. Build frontend with: cd frontend && npm run build", "docs": "/docs"}
