import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { pythonAPI } from '../../services/api';
import { LayoutDashboard, Mic, BookOpen, TrendingUp, Map, LogOut, Library, Mic2, Clock, Flame, FileText } from 'lucide-react';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Mic, label: 'Speaking Coach', path: '/speaking' },
    { icon: BookOpen, label: 'AI News & Feed', path: '/knowledge' },
    { icon: Flame, label: 'Habit Tracker', path: '/tracker' },
    { icon: FileText, label: 'CV / Resume Maker', path: '/cv-maker' },
    { icon: TrendingUp, label: 'Market Analyzer', path: '/market' },
    { icon: Map, label: 'Skill Roadmap', path: '/roadmap' },
];

const DAILY_GOAL = 5; // sessions per day

function timeAgo(iso) {
    if (!iso) return '';
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function Sidebar() {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const [stats, setStats] = useState(null);

    const handleLogout = () => { logout(); navigate('/auth'); };

    // Fetch live stats on mount and refresh every 2 minutes
    useEffect(() => {
        const load = async () => {
            try {
                const data = await pythonAPI.get('/api/speaking/stats');
                setStats(data);
            } catch { /* silently fail */ }
        };
        load();
        const timer = setInterval(load, 2 * 60 * 1000);
        return () => clearInterval(timer);
    }, []);

    // Today's session count — from recentSessions with today's date
    const todaySessions = stats?.recentSessions?.filter(s => {
        const d = new Date(s.date || s.createdAt);
        const today = new Date();
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
    }).length ?? 0;

    const dailyPct = Math.min(100, (todaySessions / DAILY_GOAL) * 100);
    const totalSessions = stats?.totalSessions ?? 0;
    const avgScore = stats?.avgScore ?? 0;
    const recentSessions = stats?.recentSessions?.slice(0, 3) ?? [];

    return (
        <aside style={{
            gridArea: 'sidebar',
            background: 'var(--bg-sidebar)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '8px',
            overflowY: 'auto',
        }}>
            {/* Top nav panel */}
            <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '12px 8px' }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 12px 16px' }}>
                    <img src="/logo.png" alt="FluenceOS Logo" style={{ width: '34px', height: '34px', borderRadius: '8px', objectFit: 'cover' }} />
                    <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>FluenceOS</span>
                </div>

                {/* Nav links */}
                {navItems.map(({ icon: Icon, label, path }) => (
                    <NavLink key={path} to={path} end={path === '/'}
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '16px',
                            padding: '10px 12px', borderRadius: 'var(--radius-md)',
                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontSize: '14px', fontWeight: 700,
                            textDecoration: 'none', transition: 'color var(--transition-fast)',
                            background: 'transparent',
                        })}>
                        <Icon size={22} />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </div>

            {/* Live Daily Progress */}
            <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '16px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>⚡ Daily Progress</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{todaySessions} sessions · Goal: {DAILY_GOAL}</span>
                </div>
                <div style={{ height: '6px', background: 'var(--bg-elevated-3)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%', width: `${dailyPct}%`,
                        background: dailyPct >= 100 ? 'var(--accent)' : 'linear-gradient(90deg, #60a5fa, var(--accent))',
                        borderRadius: '3px', transition: 'width 0.6s ease',
                    }} />
                </div>
                {/* Mini stats row */}
                {stats && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                        {[
                            { label: 'Total', value: totalSessions },
                            { label: 'Avg Score', value: `${avgScore}/10` },
                        ].map(({ label, value }) => (
                            <div key={label} style={{ flex: 1, background: 'var(--bg-elevated-2)', borderRadius: 'var(--radius-md)', padding: '8px 10px', textAlign: 'center' }}>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent)' }}>{value}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Library / Recent Activity */}
            <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '12px 8px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px 12px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 700 }}>
                    <Library size={22} />
                    <span>Recent Sessions</span>
                </div>

                {recentSessions.length === 0 ? (
                    <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                        <Mic2 size={20} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                        No sessions yet — start speaking!
                    </div>
                ) : (
                    recentSessions.map((s, i) => (
                        <div key={i}
                            onClick={() => navigate('/speaking')}
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'background var(--transition-fast)' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated-2)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-elevated-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                                {s.type === 'reading' ? '📖' : '🎤'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.topic || 'Practice'}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                    <Clock size={10} />
                                    {timeAgo(s.date || s.createdAt)}
                                    {s.score && <span style={{ marginLeft: '4px', color: 'var(--accent)', fontWeight: 700 }}>·  {s.score}/10</span>}
                                </div>
                            </div>
                        </div>
                    ))
                )}

                <div style={{ flex: 1 }} />

                {/* User section */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderTop: '1px solid var(--border-subtle)', marginTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                            {(user?.name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{user?.name || 'User'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ready to learn</div>
                        </div>
                    </div>
                    <button onClick={handleLogout}
                        style={{ background: 'transparent', color: 'var(--text-muted)', padding: '4px', display: 'flex', transition: 'color var(--transition-fast)' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
