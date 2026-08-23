import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, BookOpen, TrendingUp, Map, ArrowRight, Zap, Target, Brain, Clock, AlertCircle, Flame, FileText, Sparkles } from 'lucide-react';
import { pythonAPI } from '../services/api';
import ProgressChart from '../components/modules/speaking/ProgressChart';
import RecentSessions from '../components/modules/speaking/RecentSessions';
import { useActiveTimeTracker, formatTimeCompact } from '../hooks/useActiveTimeTracker';

const quickItems = [

    { emoji: '🎤', label: 'AI Voice Coach', path: '/speaking', color: '#4a1d96' },
    { emoji: '📰', label: 'Daily AI News', path: '/knowledge', color: '#1a3a6b' },
    { emoji: '🔥', label: 'Habit Tracker', path: '/tracker', color: '#6b2a1a' },
    { emoji: '📄', label: 'CV & Resume Maker', path: '/cv-maker', color: '#1a4a4a' },
    { emoji: '💼', label: 'Job Market', path: '/market', color: '#6b1a1a' },
    { emoji: '🗺️', label: 'Skill Roadmap', path: '/roadmap', color: '#1a4a2e' },
];

const moduleCards = [
    { icon: Mic, title: 'AI Speaking Coach', desc: 'Real-time 2-way AI voice conversation, CEFR level & pronunciation feedback', path: '/speaking', gradient: 'linear-gradient(135deg, #4a1d96, #7c3aed)' },
    { icon: BookOpen, title: 'Daily AI News Feed', desc: 'Curated breakthroughs, venture funding, tips & videos via free DataCube API', path: '/knowledge', gradient: 'linear-gradient(135deg, #1a3a6b, #3b82f6)' },
    { icon: Flame, title: 'Growth & Habit Tracker', desc: 'Daily speaking streaks, 365-day activity heatmap & goal checklist', path: '/tracker', gradient: 'linear-gradient(135deg, #7c2d12, #ea580c)' },
    { icon: FileText, title: 'AI CV / Resume Maker', desc: 'ATS-optimized bullet points, live preview & vector PDF export', path: '/cv-maker', gradient: 'linear-gradient(135deg, #065f46, #10b981)' },
    { icon: TrendingUp, title: 'Market Analyzer', desc: 'Analyze job market trends and in-demand skills', path: '/market', gradient: 'linear-gradient(135deg, #6b1a1a, #ef4444)' },
    { icon: Map, title: 'Skill Roadmap', desc: 'AI-generated personalized learning paths with YouTube resources', path: '/roadmap', gradient: 'linear-gradient(135deg, #1a4a2e, #10b981)' },
];

export default function Dashboard() {
    const navigate = useNavigate();
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const { todaySeconds, todayMinutes } = useActiveTimeTracker();

    useEffect(() => {
        pythonAPI.get('/api/speaking/stats')
            .then(data => setStats(data))
            .catch(() => setStats(null))
            .finally(() => setLoadingStats(false));

        // Auto-log daily visit for streak tracking
        pythonAPI.post('/api/tracker/log-activity', {
            activityType: 'checkin',
            durationMinutes: 5,
            title: 'Daily Growth Visit'
        }).catch(() => {});
    }, []);

    const statCards = [
        {
            icon: Zap, color: '#a855f7',
            value: loadingStats ? '—' : (stats?.totalSessions ?? 0),
            label: 'Sessions Done'
        },
        {
            icon: Target, color: '#1ed760',
            value: loadingStats ? '—' : (stats?.avgScore ? stats.avgScore.toFixed(1) : '0.0'),
            label: 'Avg Score /10'
        },
        {
            icon: Clock, color: '#60a5fa',
            value: formatTimeCompact(todaySeconds || (stats?.totalMinutes ? stats.totalMinutes * 60 : 300)),
            label: 'Today Active Time'
        },
        {
            icon: Brain, color: '#fbbf24',
            value: loadingStats ? '—' : (stats?.lastScore ? stats.lastScore.toFixed(1) : '—'),
            label: 'Last Session Score'
        },
    ];


    return (
        <div>
            {/* Gradient header */}
            <div className="page-header-container" style={{
                padding: '40px 24px 20px',
                background: 'linear-gradient(180deg, var(--grad-dashboard) 0%, transparent 100%)',
            }}>
                <h1 className="page-header-title" style={{ fontSize: '32px', fontWeight: 900, marginBottom: '6px' }}>{greeting} 👋</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Welcome back to your personal AI growth OS</p>
            </div>

            {/* Quick Access Grid */}
            <div className="responsive-quick-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', padding: '0 24px 24px' }}>
                {quickItems.map(({ emoji, label, path, color }) => (
                    <div
                        key={label}
                        onClick={() => navigate(path)}
                        style={{
                            display: 'flex', alignItems: 'center',
                            background: 'var(--bg-elevated-2)', borderRadius: 'var(--radius-md)',
                            height: '64px', cursor: 'pointer', overflow: 'hidden',
                            transition: 'background var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated-3)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-elevated-2)'}
                    >
                        <div style={{
                            width: '54px', height: '64px', background: color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '22px', flexShrink: 0,
                        }}>{emoji}</div>
                        <span style={{ padding: '0 12px', fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                    </div>
                ))}
            </div>

            {/* Live Stats row */}
            <div className="responsive-stat-grid" style={{ padding: '0 24px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                {statCards.map(({ icon: Icon, value, label, color }) => (
                    <div key={label} style={{
                        background: 'var(--bg-elevated-1)',
                        borderRadius: 'var(--radius-md)', padding: '18px',
                    }}>
                        <Icon size={20} color={color} style={{ marginBottom: '8px' }} />
                        <div style={{ fontSize: '26px', fontWeight: 900, lineHeight: 1, color: 'var(--text-primary)' }}>{value}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{label}</div>
                    </div>
                ))}
            </div>

            {/* Progress Chart + Mistakes */}
            <div className="responsive-two-col" style={{ padding: '0 24px 24px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(240px, 280px)', gap: '16px' }}>
                <ProgressChart sessionScores={stats?.sessionScores} />

                {/* Top Grammar Mistakes */}
                <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)' }}>
                        ⚠️ Common Mistakes
                    </p>
                    {(!stats?.topMistakes || stats.topMistakes.length === 0) ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '24px' }}>
                            <AlertCircle size={20} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                            No mistakes tracked yet
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {stats.topMistakes.map((m, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '8px 10px', background: 'var(--bg-elevated-2)', borderRadius: 'var(--radius-md)',
                                }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.mistake}</span>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', flexShrink: 0, marginLeft: '8px' }}>×{m.count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Sessions */}
            <div style={{ padding: '0 24px 24px' }}>
                <RecentSessions sessions={stats?.recentSessions} />
            </div>

            {/* Section: Modules */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px 16px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 900 }}>Your Modules</h2>
            </div>

            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '24px', padding: '0 24px 48px',
            }}>
                {moduleCards.map(({ icon: Icon, title, desc, path, gradient }) => (
                    <div
                        key={title}
                        onClick={() => navigate(path)}
                        style={{
                            background: 'var(--bg-elevated-1)',
                            borderRadius: 'var(--radius-md)',
                            padding: '16px', cursor: 'pointer',
                            transition: 'background var(--transition-normal)',
                            position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-elevated-2)';
                            e.currentTarget.querySelector('.play-btn').style.opacity = '1';
                            e.currentTarget.querySelector('.play-btn').style.transform = 'translateY(0)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--bg-elevated-1)';
                            e.currentTarget.querySelector('.play-btn').style.opacity = '0';
                            e.currentTarget.querySelector('.play-btn').style.transform = 'translateY(8px)';
                        }}
                    >
                        <div style={{
                            width: '100%', aspectRatio: '1/1', borderRadius: 'var(--radius-xs)',
                            background: gradient,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '16px', boxShadow: 'var(--shadow-image)',
                            position: 'relative',
                        }}>
                            <Icon size={48} color="rgba(255,255,255,0.8)" />
                            <div className="play-btn" style={{
                                position: 'absolute', bottom: '8px', right: '8px',
                                width: '48px', height: '48px', borderRadius: '50%',
                                background: 'var(--accent)', boxShadow: 'var(--shadow-accent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: 0, transform: 'translateY(8px)',
                                transition: 'all var(--transition-bounce)',
                            }}>
                                <ArrowRight size={20} color="#fff" />
                            </div>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{title}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{desc}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
