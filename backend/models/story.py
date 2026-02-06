from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

# Helper to handle MongoDB ObjectId as a string in Pydantic
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")

class Chapter(BaseModel):
    title: str
    content: List[str]  # The "Word Stream" for the RSVP engine
    word_count: int

class Story(BaseModel):
    # MongoDB setup: using alias to map '_id' to 'id'
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    title: str
    author: Optional[str] = "Unknown"
    
    # The processed content
    chapters: List[Chapter]
    total_words: int
    
    # UI elements
    cover_image: Optional[str] = None  # Base64 string for the ArchiveGrid
    
    # The "System" Progress Tracking (Lithium-inspired)
    current_chapter_index: int = 0
    current_word_index: int = 0
    
    # Metadata
    added_at: datetime = Field(default_factory=datetime.utcnow)
    last_read_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
        arbitrary_types_allowed = True

class StoryMetadata(BaseModel):
    """
    Used for the ArchiveGrid to list books without 
    downloading the entire content of every chapter.
    """
    id: str
    title: str
    author: str
    total_words: int
    current_progress: float  # (Total words read / total_words) * 100
    cover_image: Optional[str]
    last_read_at: datetime