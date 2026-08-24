"""
Multi-Component Scoring Engine for FluenceOS Reading Practice
Calculates distinct, mathematically rigorous scores (0-10 scale) for:
1. Word Accuracy
2. Pronunciation
3. Fluency & Flow
4. Speaking Speed (Pace & WPM)
5. Pauses & Rhythm
6. Technical Vocabulary Mastery
7. Overall Composite Score
Also provides Audio Quality Pre-validation & Gating.
"""

import math
from typing import Dict, Any, List, Optional
from app.services.alignment_service import align_speech_with_passage, FILLERS


def calculate_pace_score(wpm: float) -> float:
    """
    Score speaking speed on a 0-10 scale.
    - 120-160 WPM: 9.5 - 10.0 (Ideal technical reading pace)
    - 100-120 WPM: 8.0 - 9.4 (Deliberate, relaxed)
    - 160-185 WPM: 8.0 - 9.4 (Slightly rushed)
    - 75-100 WPM: 6.0 - 7.9 (Slow)
    - >185 WPM: 6.0 - 7.9 (Very rapid)
    - <75 WPM: 3.0 - 5.9 (Too slow)
    """
    if wpm <= 0:
        return 5.0
    if 125 <= wpm <= 155:
        return 10.0
    elif 115 <= wpm < 125 or 155 < wpm <= 165:
        return 9.2
    elif 100 <= wpm < 115 or 165 < wpm <= 180:
        return 8.5
    elif 85 <= wpm < 100 or 180 < wpm <= 200:
        return 7.2
    elif 65 <= wpm < 85 or 200 < wpm <= 225:
        return 5.8
    else:
        return max(2.0, round(10.0 - abs(wpm - 140) * 0.06, 1))


def calculate_reading_scores(
    expected_paragraph: str,
    spoken_text: str,
    duration_seconds: int = 0,
    stt_confidence: float = 1.0,
    audio_quality_metrics: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Compute comprehensive independent scoring components.
    """
    alignment = align_speech_with_passage(expected_paragraph, spoken_text)

    total_expected = max(1, alignment["totalExpectedWords"])
    correct = alignment["correctCount"]
    mispronounced = alignment["mispronouncedCount"]
    omitted = alignment["omittedCount"]
    extra = alignment["extraCount"]
    repeated = alignment["repeatedCount"]
    tech_total = max(1, alignment["technicalVocabTotal"])
    tech_correct = alignment["technicalVocabCorrect"]

    # 1. Word Accuracy Score (0 - 10)
    # Measures the proportion of the passage successfully delivered
    accuracy_ratio = (correct + (0.5 * mispronounced)) / total_expected
    accuracy_score = round(min(10.0, max(0.0, accuracy_ratio * 10.0)), 1)

    # 2. Pronunciation Score (0 - 10)
    # Measures phonological clarity, enunciation on multi-syllable terms, and STT confidence
    words_attempted = correct + mispronounced
    if words_attempted > 0:
        clean_pronunciation_ratio = correct / words_attempted
        # Multi-syllable / technical enunciation weight
        vocab_pronunciation_ratio = tech_correct / max(1, min(words_attempted, tech_total))
        raw_pronunciation = (clean_pronunciation_ratio * 7.0) + (vocab_pronunciation_ratio * 3.0)
        # Apply STT confidence weighting if available
        if 0 < stt_confidence < 1.0:
            raw_pronunciation = (raw_pronunciation * 0.85) + (stt_confidence * 10.0 * 0.15)
        pronunciation_score = round(min(10.0, max(1.0, raw_pronunciation)), 1)
    else:
        pronunciation_score = 0.0

    # 3. Fluency & Flow Score (0 - 10)
    # Penalizes filler sounds (um, uh), stuttered repetitions, and excessive breaks
    filler_count = sum(1 for w in alignment["extraWords"] if w.lower() in FILLERS)
    raw_fluency = 10.0 - (filler_count * 0.6) - (repeated * 0.5) - ((omitted / total_expected) * 2.5)
    fluency_score = round(min(10.0, max(1.0, raw_fluency)), 1)

    # 4. Speaking Pace & WPM (0 - 10)
    duration = max(1, duration_seconds)
    words_spoken_count = len(spoken_text.split())
    wpm = round((words_spoken_count / duration) * 60) if duration_seconds > 0 else 135
    pace_score = calculate_pace_score(wpm)

    # 5. Pauses & Rhythm Score (0 - 10)
    # Measures expected sentence pacing
    sentence_count = max(1, len([s for s in expected_paragraph.split('.') if s.strip()]))
    avg_words_per_sentence = total_expected / sentence_count
    words_per_second = words_spoken_count / duration
    expected_wps = 140 / 60 # ~2.33 words/sec
    rhythm_ratio = min(words_per_second / expected_wps, expected_wps / max(0.1, words_per_second))
    pause_score = round(min(10.0, max(2.0, (rhythm_ratio * 7.0) + (fluency_score * 0.3))), 1)

    # 6. Technical Vocabulary Mastery Score (0 - 10)
    # Evaluates specifically how well the user articulated domain terms
    if alignment["technicalVocabTotal"] > 0:
        vocab_ratio = tech_correct / alignment["technicalVocabTotal"]
        vocabulary_score = round(min(10.0, max(0.0, vocab_ratio * 10.0)), 1)
    else:
        vocabulary_score = accuracy_score

    # 7. Overall Composite Score (0 - 10)
    # Weighted balance of all core competencies
    overall_score = round(
        (accuracy_score * 0.28) +
        (pronunciation_score * 0.24) +
        (fluency_score * 0.20) +
        (pace_score * 0.12) +
        (vocabulary_score * 0.16),
        1
    )

    # Extract missed words and mispronounced words list for UI
    missed_list = [t["word"] for t in alignment["wordsAnalysis"] if t["status"] == "omitted"]
    mispronounced_list = [t["word"] for t in alignment["wordsAnalysis"] if t["status"] == "mispronounced"]

    return {
        "overallScore": overall_score,
        "accuracyScore": accuracy_score,
        "pronunciationScore": pronunciation_score,
        "fluencyScore": fluency_score,
        "paceScore": pace_score,
        "pauseScore": pause_score,
        "vocabularyScore": vocabulary_score,
        "wpm": wpm,
        "wordsCorrect": correct,
        "wordsTotal": total_expected,
        "missedWords": missed_list[:12],
        "mispronounced": mispronounced_list[:10],
        "extraWords": alignment["extraWords"][:8],
        "repeatedWords": alignment["repeatedWords"][:6],
        "wordsAnalysis": alignment["wordsAnalysis"],
        "technicalVocabStats": {
            "total": alignment["technicalVocabTotal"],
            "correct": alignment["technicalVocabCorrect"],
            "score": vocabulary_score
        }
    }


def validate_audio_quality(quality_metrics: Optional[Dict[str, Any]], spoken_text: str, duration: int) -> Dict[str, Any]:
    """
    Validates whether audio quality meets minimum acceptable standards before scoring.
    Returns:
        Dict: {"isAcceptable": bool, "rejectionReason": str or None, "message": str or None}
    """
    words = spoken_text.strip().split()
    
    if not spoken_text.strip() or len(words) == 0:
        return {
            "isAcceptable": False,
            "rejectionReason": "no_speech",
            "message": "No clear speech detected. Please check your microphone and speak clearly."
        }

    if quality_metrics:
        snr = quality_metrics.get("snrDb", 20)
        noise_floor = quality_metrics.get("avgNoiseFloorDb", -50)
        speech_rms = quality_metrics.get("avgSpeechRmsDb", -25)
        clipping_ratio = quality_metrics.get("clippingRatio", 0.0)
        speech_ratio = quality_metrics.get("speechRatio", 0.5)

        if snr < 4.0 or noise_floor > -24.0:
            return {
                "isAcceptable": False,
                "rejectionReason": "noise_too_high",
                "message": "Your surroundings are too noisy (fan, air conditioner, or background chatter). Please move closer to the microphone and try again."
            }

        if speech_rms < -43.0:
            return {
                "isAcceptable": False,
                "rejectionReason": "too_quiet",
                "message": "Your voice was too quiet or faint. Please speak louder and adjust your microphone volume."
            }

        if clipping_ratio > 0.08:
            return {
                "isAcceptable": False,
                "rejectionReason": "clipped",
                "message": "Your microphone audio was distorted or clipping. Please move slightly further from the microphone."
            }

        if duration > 3 and speech_ratio < 0.10:
            return {
                "isAcceptable": False,
                "rejectionReason": "insufficient_speech",
                "message": "Speech duration was too short compared to the passage. Please read the passage completely."
            }

    return {
        "isAcceptable": True,
        "rejectionReason": None,
        "message": None
    }
