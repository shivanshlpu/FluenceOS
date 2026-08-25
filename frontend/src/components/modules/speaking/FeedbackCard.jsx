export default function FeedbackCard({ evaluation, topic, transcript }) {
    if (!evaluation) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
            {/* Score Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '10px' }}>
                {[
                    { label: 'Overall', score: evaluation.overallScore, emoji: '⭐' },
                    { label: 'Fluency', score: evaluation.fluencyScore, emoji: '💬' },
                    { label: 'Confidence', score: evaluation.confidenceScore, emoji: '💪' },
                ].map(({ label, score, emoji }) => (
                    <div key={label} style={{
                        background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)',
                        padding: '16px 12px', textAlign: 'center',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}>
                        <div style={{ fontSize: '22px', marginBottom: '4px' }}>{emoji}</div>
                        <div style={{ fontSize: 'clamp(28px, 6vw, 36px)', fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>{score}</div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: '6px' }}>{label}/10</div>
                    </div>
                ))}
            </div>

            {/* Feedback */}
            <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '18px 16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <h4 style={{ fontWeight: 800, marginBottom: '8px', fontSize: '14px', color: '#fff' }}>💡 Detailed Feedback</h4>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '13.5px', margin: 0 }}>{evaluation.detailedFeedback}</p>
            </div>

            {/* Strengths & Improvements */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                {evaluation.strengths?.length > 0 && (
                    <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '18px 16px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <h4 style={{ fontWeight: 800, color: 'var(--success, #10b981)', marginBottom: '10px', fontSize: '13.5px' }}>✅ Strengths</h4>
                        {evaluation.strengths.map((s, i) => (
                            <p key={i} style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px', display: 'flex', gap: '8px', lineHeight: 1.4 }}>
                                <span style={{ color: 'var(--success, #10b981)', fontWeight: 800 }}>•</span>
                                <span>{s}</span>
                            </p>
                        ))}
                    </div>
                )}
                {evaluation.improvements?.length > 0 && (
                    <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '18px 16px', border: '1px solid rgba(96, 165, 250, 0.2)' }}>
                        <h4 style={{ fontWeight: 800, color: 'var(--info, #60a5fa)', marginBottom: '10px', fontSize: '13.5px' }}>🎯 To Improve</h4>
                        {evaluation.improvements.map((imp, i) => (
                            <p key={i} style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px', display: 'flex', gap: '8px', lineHeight: 1.4 }}>
                                <span style={{ color: 'var(--info, #60a5fa)', fontWeight: 800 }}>•</span>
                                <span>{imp}</span>
                            </p>
                        ))}
                    </div>
                )}
            </div>

            {/* Grammar Mistakes */}
            {evaluation.grammarMistakes?.length > 0 && (
                <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '18px 16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <h4 style={{ fontWeight: 800, color: 'var(--error, #ef4444)', marginBottom: '10px', fontSize: '13.5px' }}>❌ Grammar Corrections</h4>
                    {evaluation.grammarMistakes.map((item, i) => (
                        <div key={i} style={{ background: 'var(--bg-surface)', borderRadius: '10px', padding: '12px', borderLeft: '3px solid var(--error, #ef4444)', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                <span style={{ color: 'var(--error, #ef4444)', textDecoration: 'line-through', fontSize: '13.5px' }}>{item.mistake}</span>
                                <span style={{ color: 'var(--text-muted)' }}>→</span>
                                <span style={{ color: 'var(--success, #10b981)', fontWeight: 700, fontSize: '13.5px' }}>{item.correction}</span>
                            </div>
                            {item.explanation && <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginTop: '4px', margin: '4px 0 0' }}>{item.explanation}</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
