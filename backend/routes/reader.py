from fastapi import APIRouter, HTTPException
from database import get_database
from bson import ObjectId
from pydantic import BaseModel

router = APIRouter(prefix="/reader", tags=["Reader"])

class SyncRequest(BaseModel):
    story_id: str
    chapter_index: int
    word_index: int

@router.get("/{story_id}/chapter/{chapter_index}")
async def get_chapter(story_id: str, chapter_index: int):
    db = get_database()
    story = await db.stories.find_one({"_id": ObjectId(story_id)})
    
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    if chapter_index >= len(story["chapters"]):
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    return story["chapters"][chapter_index]

@router.post("/sync")
async def sync_progress(data: SyncRequest):
    db = get_database()
    result = await db.stories.update_one(
        {"_id": ObjectId(data.story_id)},
        {
            "$set": {
                "current_chapter_index": data.chapter_index,
                "current_word_index": data.word_index
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Story not found")
        
    return {"status": "synchronized"}