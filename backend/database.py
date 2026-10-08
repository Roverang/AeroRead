import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from dotenv import load_dotenv

load_dotenv()

# Get the connection string from .env
MONGO_URL = os.getenv("MONGO_URL")


class Database:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None
    indexes_ready: bool = False


db_connection = Database()


async def connect_to_mongo():
    """Initializes the connection to MongoDB (safe to call more than once)."""
    if db_connection.client is not None:
        return
    if not MONGO_URL:
        raise RuntimeError("MONGO_URL is not set.")
    db_connection.client = AsyncIOMotorClient(MONGO_URL)
    # We name our database 'aeroread'
    db_connection.db = db_connection.client.aeroread
    print("Successfully connected to the AeroRead Archives (MongoDB).")


async def close_mongo_connection():
    """Closes the connection."""
    if db_connection.client is not None:
        db_connection.client.close()
        db_connection.client = None
        db_connection.db = None
        print("Closed connection to the Archives.")


async def get_database() -> AsyncIOMotorDatabase:
    """
    Returns the db instance, connecting lazily on first use.
    Serverless platforms don't reliably run startup hooks, so every
    request goes through here instead of relying on them.
    """
    await connect_to_mongo()
    if not db_connection.indexes_ready:
        await db_connection.db.chapters.create_index(
            [("story_id", 1), ("index", 1)], unique=True
        )
        db_connection.indexes_ready = True
    return db_connection.db
