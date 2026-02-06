from pydantic import BaseModel
from datetime import datetime

class UserProgress(BaseModel):
    story_id: str
    last_chapter: int
    last_word: int
    updated_at: datetime = datetime.utcnow()