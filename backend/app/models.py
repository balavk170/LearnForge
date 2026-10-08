from datetime import datetime, timezone
from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), default="Demo Learner")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Topic(Base):
    __tablename__ = "topics"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(80), default="Learning")
    level: Mapped[str] = mapped_column(String(30), default="beginner")
    content: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class LearningSession(Base):
    __tablename__ = "learning_sessions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), default=1)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id"))
    status: Mapped[str] = mapped_column(String(24), default="in_progress")
    understanding: Mapped[float] = mapped_column(Float, default=0)
    connections: Mapped[float] = mapped_column(Float, default=0)
    application: Mapped[float] = mapped_column(Float, default=0)
    thinking: Mapped[float] = mapped_column(Float, default=0)
    mastery: Mapped[float] = mapped_column(Float, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Progress(Base):
    __tablename__ = "progress"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, default=1)
    streak: Mapped[int] = mapped_column(Integer, default=7)
    topics_completed: Mapped[int] = mapped_column(Integer, default=3)
    challenges_attempted: Mapped[int] = mapped_column(Integer, default=12)
    challenge_accuracy: Mapped[float] = mapped_column(Float, default=78)
    hints_used: Mapped[int] = mapped_column(Integer, default=4)
    thinking_completed: Mapped[int] = mapped_column(Integer, default=8)
    mastery: Mapped[float] = mapped_column(Float, default=68)
    skill_breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
    recent_activity: Mapped[list] = mapped_column(JSON, default=list)


class Challenge(Base):
    __tablename__ = "challenges"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id"))
    prompt: Mapped[str] = mapped_column(Text)
    difficulty: Mapped[str] = mapped_column(String(30), default="beginner")
    hints: Mapped[list] = mapped_column(JSON, default=list)


class ChallengeAttempt(Base):
    __tablename__ = "challenge_attempts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    challenge_id: Mapped[int] = mapped_column(ForeignKey("challenges.id"))
    answer: Mapped[str] = mapped_column(Text)
    score: Mapped[float] = mapped_column(Float, default=0)
    feedback: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Achievement(Base):
    __tablename__ = "achievements"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), default=1)
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(240))
    icon: Mapped[str] = mapped_column(String(40), default="sparkles")
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
