from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.config import settings
from app.database import Base, engine, get_db, SessionLocal
from app.models import Achievement, Challenge, ChallengeAttempt, LearningSession, Progress, Topic, User
from app.schemas import EvaluateRequest, GenerateRequest, HintRequest, ProgressUpdate, ThinkRequest
from app.services import evaluate_answer, evaluate_reasoning, fallback_lesson, generate_lesson

@asynccontextmanager
async def lifespan(_: FastAPI):
    seed_database()
    yield


app = FastAPI(title="LearnForge API", version="1.0.0", description="Understand. Connect. Apply. Think.", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
WEIGHTS = {"understanding": .25, "connections": .20, "application": .35, "thinking": .20}


def mastery_score(values: dict) -> float:
    return round(sum(max(0, min(100, float(values.get(key, 0)))) * weight for key, weight in WEIGHTS.items()))


def record_activity(progress: Progress, title: str, kind: str):
    now = datetime.now().astimezone()
    activity = list(progress.recent_activity or [])
    activity.insert(0, {"title": title, "time": now.strftime("%b %d · %I:%M %p"), "timestamp": now.isoformat(), "kind": kind})
    progress.recent_activity = activity[:20]


def activity_by_day(activity: list) -> list[dict]:
    today = date.today()
    days = [today - timedelta(days=offset) for offset in reversed(range(7))]
    counts = {day: 0 for day in days}
    for item in activity:
        timestamp = item.get("timestamp")
        try:
            event_day = datetime.fromisoformat(timestamp).astimezone().date() if timestamp else None
        except (TypeError, ValueError):
            event_day = None
        if event_day is None:
            label = str(item.get("time", ""))
            event_day = today if label.startswith("Today") else today - timedelta(days=1) if label.startswith("Yesterday") else None
        if event_day in counts:
            counts[event_day] += 1
    return [{"day": day.strftime("%a"), "value": counts[day]} for day in days]


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.get(User, 1) is None:
            db.add(User(id=1, name="Demo Learner"))
        if db.get(Progress, 1) is None:
            db.add(Progress(user_id=1, streak=7, topics_completed=3, challenges_attempted=12, challenge_accuracy=78, hints_used=4, thinking_completed=8, mastery=68, skill_breakdown={"Python":82,"SQL":61,"Machine Learning":42}, recent_activity=[{"title":"Completed Python Functions","time":"Today · 10:42 AM","kind":"complete"},{"title":"Used a hint on SQL Basics","time":"Yesterday · 4:18 PM","kind":"hint"},{"title":"Started Machine Learning Basics","time":"Yesterday · 2:05 PM","kind":"start"}]))
        db.commit()
        for name in ("Python Loops", "Python Lists", "Python Functions", "SQL Basics", "Machine Learning Basics"):
            topic = db.scalar(select(Topic).where(Topic.title == name))
            if topic is None:
                data = fallback_lesson(name, "beginner")
                topic = Topic(title=name, category="Programming" if name.startswith("Python") else ("Data" if name.startswith("SQL") else "AI"), level="beginner", content=data)
                db.add(topic)
                db.flush()
                db.add(Challenge(topic_id=topic.id, prompt=data["apply"]["challenge"], difficulty=data["apply"]["difficulty"], hints=data["apply"]["hints"]))
        if not db.scalar(select(Achievement).where(Achievement.user_id == 1)):
            db.add_all([Achievement(user_id=1,title="First Spark",description="Completed your first learning path",icon="sparkles"), Achievement(user_id=1,title="7-day streak",description="Showed up to learn for a full week",icon="flame"), Achievement(user_id=1,title="Curious Connector",description="Explored 10 concept relationships",icon="share-2")])
        db.commit()
    finally:
        db.close()


@app.get("/")
def root():
    return {"name": "LearnForge API", "version": "1.0.0", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "ok", "ai_provider": settings.ai_provider, "ai_configured": settings.ai_provider.lower() not in {"demo", "fallback", ""}}


@app.post("/api/teach")
async def teach(payload: GenerateRequest, db: Session = Depends(get_db)):
    return await generate_endpoint(payload, db)


@app.post("/api/topic/generate")
async def generate_endpoint(payload: GenerateRequest, db: Session = Depends(get_db)):
    content, source = await generate_lesson(payload.topic, payload.level)
    content["source"] = source
    topic = db.scalar(select(Topic).where(Topic.title == content["topic"]))
    if topic is None:
        topic = Topic(title=content["topic"], category="Learning", level=payload.level, content=content)
        db.add(topic)
        db.flush()
    else:
        topic.content = content
        topic.level = payload.level
    session = LearningSession(topic_id=topic.id)
    db.add(session)
    db.flush()
    challenge = db.scalar(select(Challenge).where(Challenge.topic_id == topic.id))
    if challenge is None:
        db.add(Challenge(topic_id=topic.id, prompt=content["apply"]["challenge"], difficulty=content["apply"].get("difficulty", payload.level), hints=content["apply"].get("hints", [])))
    record_activity(db.get(Progress, 1), f"Started {topic.title}", "start")
    db.commit()
    content["session_id"] = session.id
    return content


@app.get("/api/topics")
def topics(db: Session = Depends(get_db)):
    rows = db.scalars(select(Topic).order_by(Topic.title)).all()
    return [{"id": row.id, "title": row.title, "category": row.category, "level": row.level} for row in rows]


@app.get("/api/progress")
def get_progress(db: Session = Depends(get_db)):
    progress = db.get(Progress, 1)
    sessions = db.execute(select(LearningSession, Topic.title).join(Topic).order_by(LearningSession.updated_at.desc()).limit(50)).all()
    return {"name": "Demo Learner", "streak": progress.streak, "topics_completed": progress.topics_completed, "challenges_attempted": progress.challenges_attempted, "challenge_accuracy": progress.challenge_accuracy, "hints_used": progress.hints_used, "thinking_completed": progress.thinking_completed, "mastery": progress.mastery, "skill_breakdown": progress.skill_breakdown, "recent_activity": progress.recent_activity, "activity_by_day": activity_by_day(progress.recent_activity or []), "sessions": [{"id": s.id,"topic_id":s.topic_id,"topic":topic_title,"mastery":s.mastery,"understanding":s.understanding,"connections":s.connections,"application":s.application,"thinking":s.thinking,"status":s.status,"updated_at":s.updated_at.isoformat()} for s, topic_title in sessions], "achievements": [{"title": a.title,"description":a.description,"icon":a.icon} for a in db.scalars(select(Achievement).where(Achievement.user_id == 1)).all()]}


def session_or_404(db: Session, session_id: int | None):
    if session_id is None:
        return None
    session = db.get(LearningSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Learning session not found")
    return session


def update_session(session: LearningSession, dimension: str, score: float, completed: bool = False):
    setattr(session, dimension, max(getattr(session, dimension), score))
    values = {key: getattr(session, key) for key in WEIGHTS}
    session.mastery = mastery_score(values)
    session.updated_at = datetime.now(timezone.utc)
    if completed or session.mastery >= 75:
        session.status = "completed" if session.mastery >= 75 else session.status


def update_topic_mastery(progress: Progress, topic: Topic, session: LearningSession):
    topic_name = topic.title.lower()
    skill = "Python" if topic_name.startswith("python") else "SQL" if topic_name.startswith("sql") else "Machine Learning" if "machine learning" in topic_name else None
    if skill:
        scores = dict(progress.skill_breakdown or {})
        scores[skill] = max(float(scores.get(skill, 0)), round(session.mastery))
        progress.skill_breakdown = scores


@app.post("/api/progress")
def update_progress(payload: ProgressUpdate, db: Session = Depends(get_db)):
    session = session_or_404(db, payload.session_id)
    update_session(session, payload.dimension, payload.score, payload.completed)
    progress = db.get(Progress, 1)
    progress.mastery = round((progress.mastery * .75) + (session.mastery * .25))
    topic = db.get(Topic, session.topic_id)
    update_topic_mastery(progress, topic, session)
    event_title = f"Progressed in {topic.title} · {payload.dimension.title()}"
    record_activity(progress, event_title, "progress")
    if session.status == "completed":
        progress.topics_completed = max(progress.topics_completed, 3 + sum(1 for s in db.scalars(select(LearningSession)).all() if s.status == "completed"))
    db.commit()
    return {"session_id": session.id, "mastery": session.mastery, "overall_mastery": progress.mastery, "status": session.status}


@app.post("/api/challenge/evaluate")
async def challenge_evaluate(payload: EvaluateRequest, db: Session = Depends(get_db)):
    result = await evaluate_answer(payload.topic, payload.prompt, payload.answer)
    session = session_or_404(db, payload.session_id)
    progress = db.get(Progress, 1)
    progress.challenges_attempted += 1
    progress.challenge_accuracy = round((progress.challenge_accuracy * .8) + (result["score"] * .2))
    if session:
        update_session(session, "application", result["score"])
        update_topic_mastery(progress, db.get(Topic, session.topic_id), session)
        progress.mastery = round(progress.mastery * .8 + session.mastery * .2)
    challenge = db.scalar(select(Challenge).join(Topic).where(Topic.title == payload.topic.title()))
    if challenge:
        attempt = ChallengeAttempt(challenge_id=challenge.id, answer=payload.answer, score=result["score"], feedback=result)
        db.add(attempt)
    record_activity(progress, f"Submitted a challenge in {payload.topic.title()}", "challenge")
    db.commit()
    return result


@app.post("/api/challenge/hint")
def challenge_hint(payload: HintRequest, db: Session = Depends(get_db)):
    if payload.hint_index >= len(payload.hints):
        raise HTTPException(status_code=404, detail="No more hints available. Try explaining your approach first.")
    progress = db.get(Progress, 1)
    progress.hints_used += 1
    record_activity(progress, f"Used a hint on {payload.topic.title()}", "hint")
    session = session_or_404(db, payload.session_id)
    if session:
        update_session(session, "application", max(session.application, 15))
    db.commit()
    return {"hint": payload.hints[payload.hint_index], "hint_index": payload.hint_index, "remaining": len(payload.hints) - payload.hint_index - 1}


@app.post("/api/think/evaluate")
async def think_evaluate(payload: ThinkRequest, db: Session = Depends(get_db)):
    result = await evaluate_reasoning(payload.topic, payload.question, payload.response)
    progress = db.get(Progress, 1)
    progress.thinking_completed += 1
    record_activity(progress, f"Reflected on {payload.topic.title()}", "think")
    session = session_or_404(db, payload.session_id)
    if session:
        update_session(session, "thinking", result["score"])
        update_topic_mastery(progress, db.get(Topic, session.topic_id), session)
        progress.mastery = round(progress.mastery * .8 + session.mastery * .2)
    db.commit()
    return result


@app.get("/api/recommendations")
def recommendations(db: Session = Depends(get_db)):
    progress = db.get(Progress, 1)
    skill = progress.skill_breakdown or {}
    weakest = min(skill, key=skill.get) if skill else "Python"
    return [{"title":"Python Lists","category":"Programming","reason":"Build on your loop skills by working with the collections they process.","level":"Beginner","duration":"12 min","icon":"brackets"},{"title":"SQL Basics","category":"Data","reason":f"Strengthen your foundations while your {weakest} skills keep growing.","level":"Beginner","duration":"15 min","icon":"database"},{"title":"Machine Learning Basics","category":"AI","reason":"Connect algorithms, data, and real-world predictions.","level":"Intermediate","duration":"18 min","icon":"brain"}]


@app.get("/api/sessions/{session_id}")
def session_detail(session_id: int, db: Session = Depends(get_db)):
    session = session_or_404(db, session_id)
    topic = db.get(Topic, session.topic_id)
    return {"session_id": session.id, "topic": topic.title, "mastery": session.mastery, "understanding": session.understanding, "connections": session.connections, "application": session.application, "thinking": session.thinking, "status": session.status}
