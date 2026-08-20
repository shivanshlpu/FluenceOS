import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Mic, BookOpen, Flame, FileText, Map, Zap, Volume2 } from 'lucide-react';

const mobileNavItems = [
    { icon: LayoutDashboard, label: 'Home', path: '/' },
    { icon: Mic, label: 'Speaking', path: '/speaking' },
    { icon: BookOpen, label: 'AI News', path: '/knowledge' },
    { icon: Flame, label: 'Tracker', path: '/tracker' },
    { icon: FileText, label: 'CV Maker', path: '/cv-maker' },
];

export default function BottomBar() {
    const location = useLocation();

    return (
        <div style={{
            background: 'var(--bg-player)',
            borderTop: '1px solid var(--border-subtle)',
            height: '64px',
            width: '100%',
            position: 'relative',
            zIndex: 30,
        }}>
            {/* Desktop Status Bar (Hidden on Mobile via media query in style) */}
            <div className="desktop-player-bar" style={{
                display: 'none',
                gridTemplateColumns: '240px 1fr 240px',
                alignItems: 'center',
                padding: '0 16px',
                height: '100%',
            }}>
                {/* Left: Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: 'var(--radius-xs)',
                        background: 'var(--accent-subtle)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px',
                    }}>🧠</div>
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                            FluenceOS
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Growth System Active
                        </div>
                    </div>
                </div>

                {/* Center: Status */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap size={13} color="var(--accent)" />
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                            Daily Habit Progress
                        </span>
                    </div>
                    <div style={{
                        width: '100%', maxWidth: '360px', height: '4px',
                        background: 'var(--bg-elevated-3)',
                        borderRadius: '2px', position: 'relative',
                    }}>
                        <div style={{ width: '60%', height: '100%', background: 'var(--accent)', borderRadius: '2px' }} />
                    </div>
                </div>

                {/* Right: Quick Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Online & Ready</span>
                </div>
            </div>

            {/* Mobile Bottom Navigation Bar (Shown on Mobile) */}
            <div className="mobile-nav-bar" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                height: '100%',
                padding: '0 8px',
            }}>
                {mobileNavItems.map(({ icon: Icon, label, path }) => {
                    const isActive = location.pathname === path;
                    return (
                        <NavLink
                            key={path}
                            to={path}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                textDecoration: 'none',
                                color: isActive ? '#a855f7' : 'var(--text-muted)',
                                flex: 1,
                                height: '100%',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <Icon size={19} color={isActive ? '#a855f7' : 'var(--text-muted)'} />
                            <span style={{ fontSize: '10px', fontWeight: isActive ? 800 : 500 }}>
                                {label}
                            </span>
                        </NavLink>
                    );
                })}
            </div>

            {/* Inline Media Query to toggle Desktop vs Mobile Bottom Bar */}
            <style>{`
                @media (min-width: 769px) {
                    .desktop-player-bar { display: grid !important; }
                    .mobile-nav-bar { display: none !important; }
                }
                @media (max-width: 768px) {
                    .desktop-player-bar { display: none !important; }
                    .mobile-nav-bar { display: flex !important; }
                }
            `}</style>
        </div>
    );
}
