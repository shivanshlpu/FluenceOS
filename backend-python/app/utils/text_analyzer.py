"""Text analysis utilities for NLP processing"""


def analyze_vocabulary_complexity(text: str) -> dict:
    """Analyze vocabulary complexity of given text"""
    words = text.lower().split()
    unique_words = set(words)

    # Simple complexity heuristic based on word length
    long_words = [w for w in unique_words if len(w) > 7]
    avg_word_length = sum(len(w) for w in words) / max(len(words), 1)

    return {
        "totalWords": len(words),
        "uniqueWords": len(unique_words),
        "vocabularyRichness": round(len(unique_words) / max(len(words), 1), 3),
        "complexWords": len(long_words),
        "avgWordLength": round(avg_word_length, 1),
    }


def extract_key_phrases(text: str, n: int = 5) -> list:
    """Extract simple key phrases from text"""
    words = text.lower().split()
    # Get most common multi-word phrases (bigrams)
    bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words) - 1)]
    phrase_counts = {}
    for phrase in bigrams:
        phrase_counts[phrase] = phrase_counts.get(phrase, 0) + 1

    sorted_phrases = sorted(phrase_counts.items(), key=lambda x: x[1], reverse=True)
    return [phrase for phrase, count in sorted_phrases[:n]]
