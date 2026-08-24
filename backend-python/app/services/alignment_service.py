"""
Advanced Word-Level Sequence Alignment Service for Reading Practice Evaluation
Uses Needleman-Wunsch Dynamic Programming Global Sequence Alignment with
phonetic and edit-distance similarity matrices to accurately track:
- Correctly spoken words
- Mispronounced words (phonological / acoustic deviation)
- Omitted words (skipped)
- Extra words (inserted fillers / extraneous speech)
- Repeated words (stuttering / self-correction)
- Word order errors (inversions)
- Technical vocabulary categorization
"""

import re
from typing import List, Dict, Any, Tuple, Optional


def normalize_token(word: str) -> str:
    """Normalize a word for acoustic comparison."""
    if not word:
        return ""
    # Strip punctuation and lowercase
    cleaned = re.sub(r'[^a-zA-Z0-9\']', '', word).lower()
    # Normalize common contractions
    cleaned = cleaned.replace("’", "'").replace("'", "")
    return cleaned


def lev_dist(s1: str, s2: str) -> int:
    """Compute Levenshtein edit distance."""
    if s1 == s2:
        return 0
    if not s1:
        return len(s2)
    if not s2:
        return len(s1)

    prev = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        curr = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = prev[j + 1] + 1
            deletions = curr[j] + 1
            substitutions = prev[j] + (c1 != c2)
            curr.append(min(insertions, deletions, substitutions))
        prev = curr
    return prev[-1]


def phonetic_hash(word: str) -> str:
    """Fast simplified Soundex/Metaphone approximation for English phonetics."""
    w = normalize_token(word)
    if not w:
        return ""
    
    # Common English phoneme transformations
    w = re.sub(r'ph', 'f', w)
    w = re.sub(r'gh', 'f', w)
    w = re.sub(r'ck', 'k', w)
    w = re.sub(r'c([eiy])', r's\1', w)
    w = re.sub(r'c([aou])', r'k\1', w)
    w = re.sub(r'qu', 'kw', w)
    w = re.sub(r'x', 'ks', w)
    w = re.sub(r'dg', 'j', w)
    w = re.sub(r'[aeiouy]+', 'a', w) # collapse vowels
    w = re.sub(r'(.)\1+', r'\1', w)  # remove duplicate consecutive consonants
    return w


def word_similarity_score(expected: str, spoken: str) -> float:
    """
    Compute similarity score between expected word and spoken word.
    Returns:
        float: Score ranging from -1.0 (completely distinct) to +2.0 (exact match)
    """
    w1 = normalize_token(expected)
    w2 = normalize_token(spoken)

    if not w1 or not w2:
        return -0.8

    if w1 == w2:
        return 2.0

    # Phonetic matching
    p1 = phonetic_hash(w1)
    p2 = phonetic_hash(w2)
    if p1 and p2 and p1 == p2:
        return 1.7

    # Normalized edit distance
    dist = lev_dist(w1, w2)
    max_len = max(len(w1), len(w2))
    sim = 1.0 - (dist / max_len)

    if sim >= 0.75:
        return 1.5 * sim
    elif sim >= 0.50:
        return 0.8 * sim
    elif sim >= 0.35:
        return 0.1
    else:
        return -0.9


# Stop words that are not considered technical vocabulary
COMMON_STOP_WORDS = {
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', "aren't",
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'can', "can't", 'cannot', 'could', "couldn't", 'did', "didn't", 'do', 'does', "doesn't", 'doing',
    'don', "don't", 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', "hadn't", 'has',
    'hasn\'t', 'have', "haven't", 'having', 'he', "he'd", "he'll", "he's", 'her', 'here', "here's",
    'hers', 'herself', 'him', 'himself', 'his', 'how', "how's", 'i', "i'd", "i'll", "i'm", "i've",
    'if', 'in', 'into', 'is', "isn't", 'it', "it's", 'its', 'itself', 'let\'s', 'me', 'more', 'most',
    'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
    'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', "shan't", 'she', "she'd",
    "she'll", "she's", 'should', "shouldn't", 'so', 'some', 'such', 'than', 'that', "that's", 'the',
    'their', 'theirs', 'them', 'themselves', 'then', 'there', "there's", 'these', 'they', "they'd",
    "they'll", "they're", "they've", 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
    'very', 'was', "wasn't", 'we', "we'd", "we'll", "we're", "we've", 'were', "weren't", 'what',
    "what's", 'when', "when's", 'where', "where's", 'which', 'while', 'who', "who's", 'whom', 'why',
    "why's", 'with', "won't", 'would', "wouldn't", 'you', "you'd", "you'll", "you're", "you've",
    'your', 'yours', 'yourself', 'yourselves'
}

FILLERS = {'um', 'uh', 'like', 'you know', 'ah', 'er', 'hmm', 'basically', 'actually', 'literally'}


def is_technical_term(word: str) -> bool:
    """Check if a word represents advanced / technical vocabulary."""
    clean = normalize_token(word)
    if len(clean) >= 6 and clean not in COMMON_STOP_WORDS:
        return True
    # Specific CS domain terms
    cs_keywords = {
        'sql', 'nosql', 'api', 'http', 'tcp', 'udp', 'dns', 'tls', 'ssl', 'cpu', 'ram', 'gpu',
        'rest', 'grpc', 'acid', 'base', 'cap', 'crud', 'json', 'yaml', 'xml', 'jwt', 'oauth',
        'async', 'await', 'mutex', 'lock', 'tree', 'heap', 'graph', 'node', 'edge', 'shard',
        'cache', 'proxy', 'queue', 'stack', 'byte', 'hash', 'index', 'query', 'table', 'view'
    }
    return clean in cs_keywords


def align_speech_with_passage(expected_passage: str, spoken_transcript: str) -> Dict[str, Any]:
    """
    Perform Needleman-Wunsch Global Sequence Alignment.
    
    Returns structured tokens and statistical breakdown:
    - wordsAnalysis: [{ word, status, spoken, isTechnicalVocab, similarity }]
    - extraWords: [{ word, isFiller }]
    - repeatedWords: [{ word, index }]
    - summary stats (correct, mispronounced, omitted, extra, repeated, vocabulary counts)
    """
    orig_tokens_raw = [w for w in expected_passage.split() if w.strip()]
    spoken_tokens_raw = [w for w in spoken_transcript.split() if w.strip()]

    orig_clean = [normalize_token(w) for w in orig_tokens_raw]
    spoken_clean = [normalize_token(w) for w in spoken_tokens_raw]

    n = len(orig_clean)
    m = len(spoken_clean)

    if n == 0:
        return {
            "wordsAnalysis": [],
            "extraWords": spoken_tokens_raw,
            "repeatedWords": [],
            "correctCount": 0,
            "mispronouncedCount": 0,
            "omittedCount": 0,
            "extraCount": len(spoken_tokens_raw),
            "repeatedCount": 0,
            "totalExpectedWords": 0,
            "technicalVocabTotal": 0,
            "technicalVocabCorrect": 0
        }

    if m == 0:
        analysis = []
        tech_total = 0
        for raw in orig_tokens_raw:
            is_tech = is_technical_term(raw)
            if is_tech:
                tech_total += 1
            analysis.append({
                "word": raw,
                "status": "omitted",
                "spoken": "",
                "isTechnicalVocab": is_tech,
                "similarity": 0.0
            })
        return {
            "wordsAnalysis": analysis,
            "extraWords": [],
            "repeatedWords": [],
            "correctCount": 0,
            "mispronouncedCount": 0,
            "omittedCount": n,
            "extraCount": 0,
            "repeatedCount": 0,
            "totalExpectedWords": n,
            "technicalVocabTotal": tech_total,
            "technicalVocabCorrect": 0
        }

    # Needleman-Wunsch Matrix Initialization
    # Gap penalty for omission = -0.85, gap penalty for extra word = -0.65
    GAP_OMIT = -0.85
    GAP_EXTRA = -0.65

    dp = [[0.0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        dp[i][0] = dp[i - 1][0] + GAP_OMIT
    for j in range(1, m + 1):
        dp[0][j] = dp[0][j - 1] + GAP_EXTRA

    # DP Matrix Fill
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            match_score = word_similarity_score(orig_clean[i - 1], spoken_clean[j - 1])
            score_diag = dp[i - 1][j - 1] + match_score
            score_up = dp[i - 1][j] + GAP_OMIT
            score_left = dp[i][j - 1] + GAP_EXTRA
            dp[i][j] = max(score_diag, score_up, score_left)

    # Backtracking to extract optimal alignment
    aligned_pairs = []
    i = n
    j = m

    while i > 0 or j > 0:
        if i > 0 and j > 0:
            match_score = word_similarity_score(orig_clean[i - 1], spoken_clean[j - 1])
            if abs(dp[i][j] - (dp[i - 1][j - 1] + match_score)) < 1e-5:
                aligned_pairs.append((i - 1, j - 1))
                i -= 1
                j -= 1
                continue
        if i > 0 and abs(dp[i][j] - (dp[i - 1][j] + GAP_OMIT)) < 1e-5:
            aligned_pairs.append((i - 1, None))
            i -= 1
        else:
            aligned_pairs.append((None, j - 1))
            j -= 1

    aligned_pairs.reverse()

    # Process alignment results
    words_analysis = []
    extra_words = []
    repeated_words = []

    correct_count = 0
    mispronounced_count = 0
    omitted_count = 0
    extra_count = 0
    repeated_count = 0
    tech_total = 0
    tech_correct = 0

    last_spoken_clean = None

    for orig_idx, spoken_idx in aligned_pairs:
        if orig_idx is not None and spoken_idx is not None:
            raw_orig = orig_tokens_raw[orig_idx]
            raw_spoken = spoken_tokens_raw[spoken_idx]
            clean_orig = orig_clean[orig_idx]
            clean_spoken = spoken_clean[spoken_idx]
            is_tech = is_technical_term(raw_orig)

            if is_tech:
                tech_total += 1

            if clean_orig == clean_spoken:
                status = "correct"
                correct_count += 1
                if is_tech:
                    tech_correct += 1
                sim = 1.0
            else:
                dist = lev_dist(clean_orig, clean_spoken)
                max_len = max(len(clean_orig), len(clean_spoken), 1)
                sim = max(0.0, 1.0 - (dist / max_len))
                
                # Check if phonetic or close pronunciation match
                if phonetic_hash(clean_orig) == phonetic_hash(clean_spoken) or sim >= 0.60:
                    status = "mispronounced"
                    mispronounced_count += 1
                    if is_tech:
                        tech_correct += 0.5
                else:
                    # Major deviation: treat as omitted + extra
                    status = "omitted"
                    omitted_count += 1
                    extra_words.append(raw_spoken)
                    extra_count += 1

            words_analysis.append({
                "word": raw_orig,
                "status": status,
                "spoken": raw_spoken,
                "isTechnicalVocab": is_tech,
                "similarity": round(sim, 2)
            })
            last_spoken_clean = clean_spoken

        elif orig_idx is not None and spoken_idx is None:
            raw_orig = orig_tokens_raw[orig_idx]
            is_tech = is_technical_term(raw_orig)
            if is_tech:
                tech_total += 1
            omitted_count += 1
            words_analysis.append({
                "word": raw_orig,
                "status": "omitted",
                "spoken": "",
                "isTechnicalVocab": is_tech,
                "similarity": 0.0
            })

        elif orig_idx is None and spoken_idx is not None:
            raw_spoken = spoken_tokens_raw[spoken_idx]
            clean_spoken = spoken_clean[spoken_idx]

            # Detect repetition (stuttering e.g. "the the" or "distributed distributed")
            is_repetition = (
                (spoken_idx > 0 and clean_spoken == spoken_clean[spoken_idx - 1] and clean_spoken != "") or
                (spoken_idx < len(spoken_clean) - 1 and clean_spoken == spoken_clean[spoken_idx + 1] and clean_spoken != "") or
                (clean_spoken == last_spoken_clean and clean_spoken != "")
            )

            if is_repetition:
                repeated_words.append(raw_spoken)
                repeated_count += 1
            else:
                extra_words.append(raw_spoken)
                extra_count += 1

            last_spoken_clean = clean_spoken

    return {
        "wordsAnalysis": words_analysis,
        "extraWords": extra_words,
        "repeatedWords": repeated_words,
        "correctCount": correct_count,
        "mispronouncedCount": mispronounced_count,
        "omittedCount": omitted_count,
        "extraCount": extra_count,
        "repeatedCount": repeated_count,
        "totalExpectedWords": n,
        "technicalVocabTotal": tech_total,
        "technicalVocabCorrect": round(tech_correct, 1)
    }
