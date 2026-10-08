from typing import Literal
from pydantic import BaseModel, Field, ConfigDict

Level = Literal["beginner", "intermediate", "advanced"]


class GenerateRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=120)
    level: Level = "beginner"


class LearningContent(BaseModel):
    topic: str
    level: Level
    understand: dict
    connect: dict
    apply: dict
    think: dict
    source: Literal["ai", "demo"] = "demo"
    session_id: int | None = None


class EvaluateRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=120)
    prompt: str = Field(min_length=1, max_length=1600)
    answer: str = Field(min_length=1, max_length=5000)
    session_id: int | None = None


class HintRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=120)
    hint_index: int = Field(ge=0, le=10)
    hints: list[str] = Field(default_factory=list, max_length=10)
    session_id: int | None = None


class ProgressUpdate(BaseModel):
    session_id: int = Field(gt=0)
    dimension: Literal["understanding", "connections", "application", "thinking"]
    score: float = Field(ge=0, le=100)
    completed: bool = False


class ThinkRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=120)
    question: str = Field(min_length=1, max_length=1200)
    response: str = Field(min_length=1, max_length=3000)
    session_id: int | None = None
