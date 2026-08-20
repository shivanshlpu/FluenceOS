import { Target, Zap, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';

export default function ReadingFeedbackCard({ evaluation, topic }) {
    if (!evaluation) return null;

    const { accuracyScore, fluencyScore, overallScore, wordsCorrect, wordsTotal,
        missedWords, mispronounced, extraWords, detailedFeedback, strengths, improvements } = evaluation;

    const getColor = (score) => {
        if (score >= 8) return '#1ed760';
        if (score >= 6) return '#fbbf24';
        return '#ef4444';
    };

    const pct = wordsTotal ? Math.round((wordsCorrect / wordsTotal) * 100) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Score trio */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                    { label: 'Accuracy', score: accuracyScore, emoji: '🎯', icon: Target, color: getColor(accuracyScore) },
                    { label: 'Fluency', score: fluencyScore, emoji: '🗣️', icon: Zap, color: getColor(fluencyScore) },
                    { label: 'Overall', score: overallScore, emoji: '⭐', icon: TrendingUp, color: getColor(overallScore) },
                ].map(({ label, score, emoji, color }) => (
                    <div key={label} style={{
                        background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)',
                        padding: '20px 16px', textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '22px', marginBottom: '4px' }}>{emoji}</div>
                        <div style={{ fontSize: '38px', fontWeight: 900, color, lineHeight: 1 }}>{score}</div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '4px' }}>{label}/10</div>
                    </div>
                ))}
            </div>

            {/* Words progress bar */}
            <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>📊 Words Read</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: getColor(pct / 10) }}>{wordsCorrect}/{wordsTotal} words ({pct}%)</span>
                </div>
                <div style={{ height: '8px', background: 'var(--bg-elevated-3)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: getColor(pct / 10), borderRadius: '4px', transition: 'width 0.8s ease' }} />
                </div>
            </div>

            {/* Detailed Feedback */}
            <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                <h4 style={{ fontWeight: 700, marginBottom: '8px', fontSize: '14px' }}>💡 Detailed Feedback</h4>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '14px' }}>{detailedFeedback}</p>
            </div>

            {/* Missed Words + Mispronounced */}
            {((missedWords?.length > 0) || (mispronounced?.length > 0)) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {missedWords?.length > 0 && (
                        <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                            <h4 style={{ fontWeight: 700, color: 'var(--error)', marginBottom: '10px', fontSize: '13px' }}>❌ Missed Words</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {missedWords.map((w, i) => (
                                    <span key={i} style={{ padding: '3px 10px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-pill)', fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>{w}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {mispronounced?.length > 0 && (
                        <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                            <h4 style={{ fontWeight: 700, color: '#fbbf24', marginBottom: '10px', fontSize: '13px' }}>⚠️ Hard to Say</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {mispronounced.map((w, i) => (
                                    <span key={i} style={{ padding: '3px 10px', background: 'rgba(251,191,36,0.1)', borderRadius: 'var(--radius-pill)', fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>{w}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Strengths + Improvements */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {strengths?.length > 0 && (
                    <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                        <h4 style={{ fontWeight: 700, color: 'var(--success)', marginBottom: '10px', fontSize: '13px' }}>✅ Great Job</h4>
                        {strengths.map((s, i) => (
                            <p key={i} style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px', display: 'flex', gap: '8px' }}>
                                <span style={{ color: 'var(--success)' }}>•</span> {s}
                            </p>
                        ))}
                    </div>
                )}
                {improvements?.length > 0 && (
                    <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                        <h4 style={{ fontWeight: 700, color: '#60a5fa', marginBottom: '10px', fontSize: '13px' }}>🎯 Practice More</h4>
                        {improvements.map((imp, i) => (
                            <p key={i} style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px', display: 'flex', gap: '8px' }}>
                                <span style={{ color: '#60a5fa' }}>•</span> {imp}
                            </p>
                        ))}
                    </div>
                )}
            </div>

            {/* Filler words */}
            {extraWords?.length > 0 && (
                <div style={{ background: 'rgba(251,191,36,0.06)', borderRadius: 'var(--radius-md)', padding: '14px 16px', border: '1px solid rgba(251,191,36,0.15)' }}>
                    <p style={{ fontSize: '13px', color: '#fbbf24', fontWeight: 700 }}>🚫 Filler words to avoid: {extraWords.join(', ')}</p>
                </div>
            )}
        </div>
    );
}
