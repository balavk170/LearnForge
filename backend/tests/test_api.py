import os
os.environ["DATABASE_URL"] = "sqlite:///./test_learnforge.db"
os.environ["AI_PROVIDER"] = "demo"
import pytest
from fastapi.testclient import TestClient
from app.main import app, mastery_score
from app.config import settings



@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_mastery_weighting():
    assert mastery_score({"understanding": 100, "connections": 100, "application": 100, "thinking": 100}) == 100
    assert mastery_score({"understanding": 100}) == 25


def test_generate_fallback_lesson(client):
    response = client.post("/api/topic/generate", json={"topic": "Python Loops", "level": "beginner"})
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "demo"
    assert all(key in body for key in ("understand", "connect", "apply", "think", "session_id"))
    assert len(body["connect"]["concepts"]) >= 3


def test_unavailable_ai_provider_uses_labeled_demo_fallback(client, monkeypatch):
    monkeypatch.setattr(settings, "ai_provider", "openai-compatible")
    monkeypatch.setattr(settings, "ai_base_url", "http://127.0.0.1:1/v1")
    response = client.post("/api/topic/generate", json={"topic": "Python Loops", "level": "beginner"})
    assert response.status_code == 200
    assert response.json()["source"] == "demo"


def test_hint_and_evaluate_journey(client):
    lesson = client.post("/api/topic/generate", json={"topic": "Python Loops", "level": "beginner"}).json()
    sid = lesson["session_id"]
    hint = client.post("/api/challenge/hint", json={"topic":"Python Loops","hint_index":0,"hints":lesson["apply"]["hints"],"session_id":sid})
    assert hint.status_code == 200 and hint.json()["hint"]
    result = client.post("/api/challenge/evaluate", json={"topic":"Python Loops","prompt":lesson["apply"]["challenge"],"answer":"for price in prices: total += price","session_id":sid})
    assert result.status_code == 200 and 0 <= result.json()["score"] <= 100
    update = client.post("/api/progress", json={"session_id":sid,"dimension":"understanding","score":80})
    assert update.status_code == 200
    dashboard = client.get("/api/progress").json()
    assert len(dashboard["activity_by_day"]) == 7
    assert sum(item["value"] for item in dashboard["activity_by_day"]) > 0


def test_think_and_recommendations(client):
    lesson = client.post("/api/topic/generate", json={"topic": "Python Lists", "level": "beginner"}).json()
    result = client.post("/api/think/evaluate", json={"topic":"Python Lists","question":"When useful?","response":"Lists keep values in order so we can process them.","session_id":lesson["session_id"]})
    assert result.status_code == 200 and "score" in result.json()
    assert len(client.get("/api/recommendations").json()) >= 2


def test_session_mastery_updates_topic_skill_and_exposes_topic(client):
    lesson = client.post("/api/topic/generate", json={"topic": "Machine Learning Basics", "level": "beginner"}).json()
    session_id = lesson["session_id"]
    for dimension in ("understanding", "connections", "application", "thinking"):
        response = client.post("/api/progress", json={"session_id": session_id, "dimension": dimension, "score": 100})
        assert response.status_code == 200

    progress = client.get("/api/progress").json()
    session = next(item for item in progress["sessions"] if item["id"] == session_id)
    assert session["topic"] == "Machine Learning Basics"
    assert progress["skill_breakdown"]["Machine Learning"] == 100
