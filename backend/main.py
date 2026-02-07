import sys
import os

# This tells Python to look in the folder this file is in for other files like database.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, UploadFile, File
# Now this import will actually work on Vercel
from database import connect_to_mongo, close_mongo_connection 
# ... the rest of your imports



from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import connect_to_mongo, close_mongo_connection
from routes import archive, reader

app = FastAPI(title="AeroRead System API")

# Allow your React frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lifecycle management
@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

# Include our modular routes
app.include_router(archive.router)
app.include_router(reader.router)

@app.get("/")
async def root():
    return {"status": "System Online", "version": "1.0.0"}