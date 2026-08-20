export default function FeedbackCard({ evaluation, topic, transcript }) {
    if (!evaluation) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Score Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                    { label: 'Overall', score: evaluation.overallScore, emoji: '⭐' },
                    { label: 'Fluency', score: evaluation.fluencyScore, emoji: '💬' },
                    { label: 'Confidence', score: evaluation.confidenceScore, emoji: '💪' },
                ].map(({ label, score, emoji }) => (
                    <div key={label} style={{
                        background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)',
                        padding: '20px 16px', textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '24px', marginBottom: '4px' }}>{emoji}</div>
                        <div style={{ fontSize: '40px', fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>{score}</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '4px' }}>{label}/10</div>
                    </div>
                ))}
            </div>

            {/* Feedback */}
            <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                <h4 style={{ fontWeight: 700, marginBottom: '8px', fontSize: '14px' }}>💡 Detailed Feedback</h4>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '14px' }}>{evaluation.detailedFeedback}</p>
            </div>

            {/* Strengths & Improvements */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {evaluation.strengths?.length > 0 && (
                    <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                        <h4 style={{ fontWeight: 700, color: 'var(--success)', marginBottom: '12px', fontSize: '14px' }}>✅ Strengths</h4>
                        {evaluation.strengths.map((s, i) => (
                            <p key={i} style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px', display: 'flex', gap: '8px' }}>
                                <span style={{ color: 'var(--success)' }}>•</span> {s}
                            </p>
                        ))}
                    </div>
                )}
                {evaluation.improvements?.length > 0 && (
                    <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                        <h4 style={{ fontWeight: 700, color: 'var(--info)', marginBottom: '12px', fontSize: '14px' }}>🎯 To Improve</h4>
                        {evaluation.improvements.map((imp, i) => (
                            <p key={i} style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px', display: 'flex', gap: '8px' }}>
                                <span style={{ color: 'var(--info)' }}>•</span> {imp}
                            </p>
                        ))}
                    </div>
                )}
            </div>

            {/* Grammar Mistakes */}
            {evaluation.grammarMistakes?.length > 0 && (
                <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                    <h4 style={{ fontWeight: 700, color: 'var(--error)', marginBottom: '12px', fontSize: '14px' }}>❌ Grammar</h4>
                    {evaluation.grammarMistakes.map((item, i) => (
                        <div key={i} style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '12px', borderLeft: '3px solid var(--error)', marginBottom: '8px' }}>
                            <span style={{ color: 'var(--error)', textDecoration: 'line-through' }}>{item.mistake}</span>
                            <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>→</span>
                            <span style={{ color: 'var(--success)', fontWeight: 700 }}>{item.correction}</span>
                            {item.explanation && <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>{item.explanation}</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
