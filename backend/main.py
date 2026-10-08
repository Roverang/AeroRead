import sys
import os
from contextlib import asynccontextmanager

# 1. FIX IMPORT PATHS (Must be at the very top)
# This allows Vercel to find database.py, routes, etc.
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# These imports now work because of the sys.path fix above
from database import close_mongo_connection
from routes import archive, reader


# 2. LIFECYCLE MANAGEMENT
# The database connects lazily on first request (see database.get_database),
# since serverless platforms don't reliably run startup hooks.
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_mongo_connection()


app = FastAPI(title="AeroRead System API", lifespan=lifespan)

# 3. CORS CONFIGURATION
# Production requests are same-origin; this list covers local development
# and any extra origins set in ALLOWED_ORIGINS (comma separated).
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "https://aeroread.vercel.app,http://localhost:8080,http://127.0.0.1:8080",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS if o.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Content-Encoding"],
)

# 4. MODULAR ROUTES WITH VERCEL PREFIX
# We add prefix="/api" here so FastAPI matches the Vercel rewrite
app.include_router(archive.router, prefix="/api")
app.include_router(reader.router, prefix="/api")


@app.get("/api")
async def root():
    return {"status": "System Online", "version": "1.1.0"}


# Fallback for the base domain
@app.get("/")
async def health():
    return {"status": "AeroEngine Pulse Active"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
