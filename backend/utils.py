from bson import ObjectId
from fastapi import HTTPException


def parse_id(story_id: str) -> ObjectId:
    """Converts a path id to an ObjectId, rejecting malformed ids with a 400."""
    if not ObjectId.is_valid(story_id):
        raise HTTPException(status_code=400, detail="Invalid story id.")
    return ObjectId(story_id)
