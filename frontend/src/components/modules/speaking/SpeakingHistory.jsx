import { useEffect, useState } from 'react';
import { speakingService } from '../../../services/speakingService';
import { formatDate, formatDuration } from '../../../utils/formatters';
import { Clock, TrendingUp, MessageSquare } from 'lucide-react';

export default function SpeakingHistory() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadHistory(); }, []);
    const loadHistory = async () => {
        try { const data = await speakingService.getHistory(10); setSessions(Array.isArray(data) ? data : []); }
        catch { setSessions([]); }
        setLoading(false);
    };

    if (loading) return (
        <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '32px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading history...</p>
        </div>
    );

    if (!sessions.length) return (
        <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '32px', textAlign: 'center' }}>
            <MessageSquare size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>No sessions yet</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Complete a practice to see history</p>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Clock size={16} color="var(--accent)" /> Recent Sessions
            </h3>
            {sessions.map((session, i) => (
                <div key={session._id || i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 16px', borderRadius: 'var(--radius-md)',
                    cursor: 'pointer', transition: 'background var(--transition-fast)',
                }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <div style={{
                        width: '40px', height: '40px', borderRadius: 'var(--radius-xs)',
                        background: 'var(--accent-subtle)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                    }}>🎤</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.topic}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {formatDate(session.createdAt)} • {formatDuration(session.duration)}
                        </div>
                    </div>
                    <span style={{
                        padding: '3px 10px', borderRadius: 'var(--radius-pill)',
                        fontSize: '12px', fontWeight: 700,
                        background: 'var(--accent-subtle)', color: 'var(--accent)',
                    }}>
                        {session.evaluation?.overallScore || '—'}/10
                    </span>
                </div>
            ))}
        </div>
    );
}
