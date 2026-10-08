from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from pydantic import BaseModel, Field, ValidationError
from processors.epub_engine import process_epub
from processors.pdf_engine import process_pdf
from database import get_database
from utils import parse_id
from datetime import datetime, timezone
import zlib

router = APIRouter(prefix="/archive", tags=["Archive"])

# Vercel rejects request bodies over 4.5 MB, so stay just under it.
MAX_UPLOAD_BYTES = 4 * 1024 * 1024
# Cap on the decompressed JSON body, to stop gzip bombs.
MAX_JSON_BYTES = 50 * 1024 * 1024


class ChapterIn(BaseModel):
    title: str = Field(max_length=500)
    text: str


class StoryIn(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    author: str = Field(default="Unknown Author", max_length=500)
    type: str = Field(default="epub", pattern="^(epub|pdf|txt)$")
    chapters: list[ChapterIn] = Field(min_length=1)


async def store_story(db, title: str, author: str, type_: str, chapters: list[dict]) -> dict:
    """
    Stores story metadata and its chapters as separate documents, so a
    long book never hits MongoDB's 16 MB per-document limit.
    `chapters` is a list of {"title": str, "words": list[str]}.
    """
    chapters = [c for c in chapters if c["words"]]
    if not chapters:
        raise HTTPException(status_code=422, detail="No readable text found in this file.")

    word_counts = [len(c["words"]) for c in chapters]
    now = datetime.now(timezone.utc)
    result = await db.stories.insert_one({
        "title": title,
        "author": author,
        "type": type_,
        "chapter_count": len(chapters),
        "chapter_word_counts": word_counts,
        "total_words": sum(word_counts),
        "current_chapter_index": 0,
        "current_word_index": 0,
        "added_at": now,
        "last_read_at": now,
        "cover_image": None,  # Future: Extract cover art
    })
    await db.chapters.insert_many([
        {
            "story_id": result.inserted_id,
            "index": i,
            "title": c["title"],
            "text": " ".join(c["words"]),
            "word_count": len(c["words"]),
        }
        for i, c in enumerate(chapters)
    ])
    return {
        "id": str(result.inserted_id),
        "title": title,
        "chapter_count": len(chapters),
        "chapter_word_counts": word_counts,
        "total_words": sum(word_counts),
        "status": "Archived Successfully",
    }


@router.post("/stories")
async def create_story(request: Request):
    """
    Receives a book the browser has already split into chapters.
    The body is JSON, optionally sent with `Content-Encoding: gzip`
    so large books fit under the platform's request size limit.
    """
    body = await request.body()
    if len(body) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Book is too large to upload.")

    if request.headers.get("content-encoding", "").lower() == "gzip":
        try:
            decompressor = zlib.decompressobj(wbits=16 + zlib.MAX_WBITS)
            body = decompressor.decompress(body, MAX_JSON_BYTES)
            if decompressor.unconsumed_tail:
                raise HTTPException(status_code=413, detail="Book is too large to upload.")
        except zlib.error:
            raise HTTPException(status_code=400, detail="Invalid gzip body.")

    try:
        story = StoryIn.model_validate_json(body)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=e.errors(include_url=False))

    db = await get_database()
    chapters = [{"title": c.title.strip() or f"Chapter {i + 1}", "words": c.text.split()}
                for i, c in enumerate(story.chapters)]
    return await store_story(db, story.title.strip(), story.author.strip(), story.type, chapters)


@router.post("/upload")
async def upload_book(file: UploadFile = File(...)):
    """
    Receives a book file, shreds it using the specific engine,
    and stores it in the MongoDB Archives.
    """
    filename = (file.filename or "").lower()
    if not filename.endswith(('.epub', '.pdf')):
        raise HTTPException(status_code=400, detail="Unsupported file format. Use EPUB or PDF.")

    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is too large to upload.")

    try:
        # 1. Choose the correct "Shredder" based on file type
        if filename.endswith('.epub'):
            chapters, _ = process_epub(content)
        else:
            chapters, _ = process_pdf(content)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        print(f"Ingestion Error: {e}")
        raise HTTPException(status_code=500, detail="System failed to process file.")

    # We strip the extension for the title
    clean_title = file.filename.rsplit('.', 1)[0].replace('_', ' ').replace('-', ' ')
    db = await get_database()
    return await store_story(
        db,
        clean_title,
        "Unknown Author",  # Future: Extract from EPUB metadata
        filename.rsplit('.', 1)[1],
        [{"title": c["title"], "words": c["content"]} for c in chapters],
    )


@router.get("/library")
async def get_library():
    """
    Fetches the list of all stories.
    Crucial: We exclude the 'chapters' field (present on older stories)
    to keep this response tiny.
    """
    db = await get_database()
    stories = []
    cursor = db.stories.find({}, {"chapters": 0}).sort("last_read_at", -1)

    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        stories.append(doc)

    return stories


@router.delete("/delete/{story_id}")
async def delete_story(story_id: str):
    db = await get_database()
    oid = parse_id(story_id)
    result = await db.stories.delete_one({"_id": oid})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Story not found in archives.")

    await db.chapters.delete_many({"story_id": oid})
    return {"message": "Story purged from system."}
