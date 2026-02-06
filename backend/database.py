import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Get the connection string from .env
MONGO_URL = os.getenv("MONGO_URL")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_connection = Database()

async def connect_to_mongo():
    """Initializes the connection to MongoDB."""
    db_connection.client = AsyncIOMotorClient(MONGO_URL)
    # We name our database 'aeroread'
    db_connection.db = db_connection.client.aeroread
    print("Successfully connected to the AeroRead Archives (MongoDB).")

async def close_mongo_connection():
    """Closes the connection."""
    db_connection.client.close()
    print("Closed connection to the Archives.")

def get_database():
    """Helper function to return the db instance."""
    return db_connection.db