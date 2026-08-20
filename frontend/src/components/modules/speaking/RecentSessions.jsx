import { Mic, Star } from 'lucide-react';

export default function RecentSessions({ sessions = [] }) {
    if (!sessions || sessions.length === 0) {
        return (
            <div style={{
                background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)',
                padding: '24px', textAlign: 'center', color: 'var(--text-muted)',
            }}>
                <Mic size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                <p style={{ fontSize: '13px', fontWeight: 600 }}>No sessions yet</p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>Practice speaking to see sessions here</p>
            </div>
        );
    }

    const getScoreColor = (score) => {
        if (score >= 8) return '#1ed760';
        if (score >= 6) return '#fbbf24';
        return '#ef4444';
    };

    return (
        <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)' }}>
                🎤 Recent Sessions
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sessions.slice(0, 5).map((s, i) => (
                    <div key={s.id || i} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 12px',
                        background: 'var(--bg-elevated-2)',
                        borderRadius: 'var(--radius-md)',
                    }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: `${getScoreColor(s.score)}22`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Mic size={14} color={getScoreColor(s.score)} />
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {s.topic || 'Speaking Session'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.date}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                            <Star size={12} color={getScoreColor(s.score)} fill={getScoreColor(s.score)} />
                            <span style={{ fontSize: '13px', fontWeight: 700, color: getScoreColor(s.score) }}>{s.score}/10</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
