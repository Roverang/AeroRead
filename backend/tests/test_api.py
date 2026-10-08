import asyncio
import gzip
import json
import os
import sys

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database  # noqa: E402
from main import app  # noqa: E402


@pytest.fixture
def db():
    client = AsyncMongoMockClient()
    database.db_connection.client = client
    database.db_connection.db = client.aeroread
    database.db_connection.indexes_ready = False
    yield client.aeroread
    database.db_connection.client = None
    database.db_connection.db = None


@pytest.fixture
def api(db):
    return TestClient(app)


def book(n_chapters=2):
    return {
        "title": "Test Book",
        "author": "Someone",
        "type": "epub",
        "chapters": [{"title": f"Ch {i}", "text": "word " * (10 + i)} for i in range(n_chapters)],
    }


def test_create_story_plain_json(api):
    res = api.post("/api/archive/stories", json=book())
    assert res.status_code == 200
    body = res.json()
    assert body["total_words"] == 21
    assert body["chapter_word_counts"] == [10, 11]
    assert body["chapter_count"] == 2


def test_create_story_gzip(api):
    payload = gzip.compress(json.dumps(book(3)).encode())
    res = api.post(
        "/api/archive/stories",
        content=payload,
        headers={"Content-Type": "application/json", "Content-Encoding": "gzip"},
    )
    assert res.status_code == 200
    assert res.json()["chapter_count"] == 3


def test_create_story_rejects_bad_body(api):
    assert api.post("/api/archive/stories", json={"title": "x", "chapters": []}).status_code == 422
    bad_gzip = api.post(
        "/api/archive/stories",
        content=b"not gzip",
        headers={"Content-Type": "application/json", "Content-Encoding": "gzip"},
    )
    assert bad_gzip.status_code == 400


def test_create_story_rejects_empty_text(api):
    data = book(1)
    data["chapters"][0]["text"] = "   "
    assert api.post("/api/archive/stories", json=data).status_code == 422


def test_get_chapter_and_bounds(api):
    story_id = api.post("/api/archive/stories", json=book()).json()["id"]
    res = api.get(f"/api/reader/{story_id}/chapter/1")
    assert res.status_code == 200
    assert res.json() == {"title": "Ch 1", "text": " ".join(["word"] * 11), "word_count": 11,
                          "index": 1, "total_chapters": 2}
    assert api.get(f"/api/reader/{story_id}/chapter/2").status_code == 404
    assert api.get(f"/api/reader/{story_id}/chapter/-1").status_code == 404


def test_legacy_embedded_chapters(api, db):
    oid = ObjectId()
    asyncio.run(db.stories.insert_one({
        "_id": oid,
        "title": "Old",
        "chapters": [{"title": "A", "content": ["one", "two"], "word_count": 2},
                     {"title": "B", "content": ["three"], "word_count": 1}],
    }))
    res = api.get(f"/api/reader/{oid}/chapter/1")
    assert res.status_code == 200
    assert res.json() == {"title": "B", "text": "three", "word_count": 1, "index": 1, "total_chapters": 2}
    assert api.get(f"/api/reader/{oid}/chapter/2").status_code == 404


def test_invalid_ids_return_400(api):
    assert api.get("/api/reader/not-an-id/chapter/0").status_code == 400
    assert api.delete("/api/archive/delete/not-an-id").status_code == 400
    assert api.post("/api/reader/sync", json={"story_id": "bad", "chapter_index": 0, "word_index": 0}).status_code == 400


def test_sync_and_delete(api):
    story_id = api.post("/api/archive/stories", json=book()).json()["id"]
    assert api.post("/api/reader/sync", json={"story_id": story_id, "chapter_index": 1, "word_index": 5}).status_code == 200
    library = api.get("/api/archive/library").json()
    assert library[0]["current_chapter_index"] == 1
    assert "chapters" not in library[0]

    assert api.delete(f"/api/archive/delete/{story_id}").status_code == 200
    assert api.get(f"/api/reader/{story_id}/chapter/0").status_code == 404
    assert api.delete(f"/api/archive/delete/{story_id}").status_code == 404


def test_upload_rejects_unsupported_format(api):
    res = api.post("/api/archive/upload", files={"file": ("notes.docx", b"abc")})
    assert res.status_code == 400
