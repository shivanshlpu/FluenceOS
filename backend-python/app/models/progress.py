from pydantic import BaseModel
from typing import List, Optional


class RoadmapRequest(BaseModel):
    skill: str
    level: str = "Beginner"


class ProgressUpdate(BaseModel):
    skillId: str
    phase: int
    completed: bool
