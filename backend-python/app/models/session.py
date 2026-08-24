from pydantic import BaseModel, Field
from typing import List, Optional


class SpeakingRequest(BaseModel):
    topic: str
    transcript: str
    duration: int = 0
    model: Optional[str] = "auto"



class GrammarMistake(BaseModel):
    mistake: str
    correction: str
    explanation: str


class VocabSuggestion(BaseModel):
    word: str
    betterAlternatives: List[str] = []
    context: str = ""


class EvaluationResult(BaseModel):
    grammarMistakes: List[GrammarMistake] = []
    vocabularySuggestions: List[VocabSuggestion] = []
    fluencyScore: float = 0
    confidenceScore: float = 0
    overallScore: float = 0
    detailedFeedback: str = ""
    strengths: List[str] = []
    improvements: List[str] = []
    fillerWordsCount: int = 0
    avgSentenceLength: int = 0
