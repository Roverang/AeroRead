from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from database import get_database
from utils import parse_id
from datetime import datetime, timezone

router = APIRouter(prefix="/reader", tags=["Reader"])


class SyncRequest(BaseModel):
    story_id: str
    chapter_index: int = Field(ge=0)
    word_index: int = Field(ge=0)


@router.get("/{story_id}/chapter/{chapter_index}")
async def get_chapter(story_id: str, chapter_index: int):
    db = await get_database()
    oid = parse_id(story_id)
    story = await db.stories.find_one({"_id": oid}, {"chapter_count": 1})

    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    if "chapter_count" in story:
        total = story["chapter_count"]
        chapter = None
        if 0 <= chapter_index < total:
            chapter = await db.chapters.find_one(
                {"story_id": oid, "index": chapter_index},
                {"_id": 0, "title": 1, "text": 1, "word_count": 1},
            )
    else:
        # Legacy layout: chapters embedded as word arrays on the story.
        # Pull just the one chapter plus the count, not the whole book.
        rows = await db.stories.aggregate([
            {"$match": {"_id": oid}},
            {"$project": {
                "total": {"$size": {"$ifNull": ["$chapters", []]}},
                "chapter": {"$arrayElemAt": [{"$ifNull": ["$chapters", []]}, chapter_index]},
            }},
        ]).to_list(1)
        total = rows[0]["total"] if rows else 0
        old = rows[0].get("chapter") if rows and 0 <= chapter_index < total else None
        chapter = old and {"title": old["title"], "text": " ".join(old["content"]), "word_count": old["word_count"]}

    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    return {**chapter, "index": chapter_index, "total_chapters": total}


@router.post("/sync")
async def sync_progress(data: SyncRequest):
    db = await get_database()
    result = await db.stories.update_one(
        {"_id": parse_id(data.story_id)},
        {
            "$set": {
                "current_chapter_index": data.chapter_index,
                "current_word_index": data.word_index,
                "last_read_at": datetime.now(timezone.utc),
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Story not found")

    return {"status": "synchronized"}
