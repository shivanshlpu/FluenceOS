"""Speech evaluation helper utilities"""


def count_filler_words(text: str) -> int:
    fillers = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'so', 'well', 'right']
    count = 0
    lower_text = text.lower()
    for filler in fillers:
        count += lower_text.count(filler)
    return count


def calculate_basic_metrics(transcript: str) -> dict:
    words = transcript.strip().split()
    sentences = [s.strip() for s in transcript.split('.') if s.strip()]

    return {
        "wordCount": len(words),
        "sentenceCount": len(sentences),
        "avgWordsPerSentence": len(words) // max(len(sentences), 1),
        "uniqueWords": len(set(w.lower() for w in words)),
        "fillerCount": count_filler_words(transcript),
    }
