from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from models.story import Story
from processors.epub_engine import process_epub
from processors.pdf_engine import process_pdf
from database import get_database
from bson import ObjectId
import datetime

router = APIRouter(prefix="/archive", tags=["Archive"])

@router.post("/upload")
async def upload_book(file: UploadFile = File(...)):
    """
    Receives a book file, shreds it using the specific engine, 
    and stores it in the MongoDB Archives.
    """
    db = get_database()
    filename = file.filename.lower()
    
    try:
        content = await file.read()
        
        # 1. Choose the correct "Shredder" based on file type
        if filename.endswith('.epub'):
            chapters, total_words = process_epub(content)
        elif filename.endswith('.pdf'):
            chapters, total_words = process_pdf(content)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use EPUB or PDF.")

        # 2. Construct the Story Document (Lithium Style)
        # We strip the extension for the title
        clean_title = file.filename.rsplit('.', 1)[0].replace('_', ' ').replace('-', ' ')
        
        new_story = {
            "title": clean_title,
            "author": "Unknown Author", # Future: Extract from EPUB metadata
            "chapters": chapters,
            "total_words": total_words,
            "current_chapter_index": 0,
            "current_word_index": 0,
            "added_at": datetime.datetime.utcnow(),
            "last_read_at": datetime.datetime.utcnow(),
            "cover_image": None # Future: Extract cover art
        }

        # 3. Insert into MongoDB
        result = await db.stories.insert_one(new_story)
        
        return {
            "id": str(result.inserted_id),
            "title": clean_title,
            "status": "Archived Successfully"
        }

    except Exception as e:
        print(f"Ingestion Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"System failed to process file: {str(e)}")

@router.get("/library")
async def get_library():
    """
    Fetches the list of all stories. 
    Crucial: We exclude the 'chapters' field to keep this response tiny.
    """
    db = get_database()
    stories = []
    # Projecting {"chapters": 0} makes the list load instantly
    cursor = db.stories.find({}, {"chapters": 0}).sort("last_read_at", -1)
    
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        stories.append(doc)
        
    return stories

@router.delete("/delete/{story_id}")
async def delete_story(story_id: str):
    db = get_database()
    result = await db.stories.delete_one({"_id": ObjectId(story_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Story not found in archives.")
        
    return {"message": "Story purged from system."}