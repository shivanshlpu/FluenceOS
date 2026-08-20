export const analyzeText = (text) => {
    if (!text) return { wordCount: 0, sentenceCount: 0, avgWordsPerSentence: 0, fillerCount: 0 };

    const words = text.trim().split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(Boolean);
    const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'so', 'well'];

    const fillerCount = fillerWords.reduce((count, filler) => {
        const regex = new RegExp(`\\b${filler}\\b`, 'gi');
        return count + (text.match(regex) || []).length;
    }, 0);

    return {
        wordCount: words.length,
        sentenceCount: sentences.length,
        avgWordsPerSentence: sentences.length ? Math.round(words.length / sentences.length) : 0,
        fillerCount,
        wordsPerMinute: 0,
        uniqueWords: new Set(words.map((w) => w.toLowerCase())).size,
    };
};
