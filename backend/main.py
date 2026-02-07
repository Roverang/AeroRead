import sys
import os

# 1. FIX IMPORT PATHS (Must be at the very top)
# This allows Vercel to find database.py, routes, etc.
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# These imports now work because of the sys.path fix above
from database import connect_to_mongo, close_mongo_connection
from routes import archive, reader

app = FastAPI(title="AeroRead System API")

# 2. CORS CONFIGURATION
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. LIFECYCLE MANAGEMENT
@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

# 4. MODULAR ROUTES WITH VERCEL PREFIX
# We add prefix="/api" here so FastAPI matches the Vercel rewrite
app.include_router(archive.router, prefix="/api")
app.include_router(reader.router, prefix="/api")

@app.get("/api")
async def root():
    return {"status": "System Online", "version": "1.0.0"}

# Fallback for the base domain
@app.get("/")
async def health():
    return {"status": "AeroEngine Pulse Active"}