import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import { useNewsPoller } from '../../hooks/useNewsPoller';
import { Search, ChevronLeft, ChevronRight, Bell, Newspaper, CheckCheck, Trash2, X } from 'lucide-react';

function timeAgo(iso) {
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function Navbar() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotificationStore();
    const [scrolled, setScrolled] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const panelRef = useRef(null);

    // Start news polling for the whole app
    useNewsPoller();

    // PWA Install Prompt Listener
    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    useEffect(() => {
        const main = document.querySelector('main');
        if (!main) return;
        const handler = () => setScrolled(main.scrollTop > 20);
        main.addEventListener('scroll', handler);
        return () => main.removeEventListener('scroll', handler);
    }, []);

    // Close panel when clicking outside
    useEffect(() => {
        if (!notifOpen) return;
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [notifOpen]);

    return (
        <nav style={{
            position: 'sticky', top: 0, zIndex: 10, height: '64px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 24px',
            background: scrolled ? 'rgba(18,18,18,0.95)' : 'transparent',
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            transition: 'background var(--transition-normal)',
        }}>
            {/* Left: Nav arrows + Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={() => navigate(-1)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronLeft size={18} />
                </button>
                <button onClick={() => navigate(1)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronRight size={18} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-pill)', padding: '10px 16px', width: '300px', border: '1px solid transparent' }}>
                    <Search size={16} color="var(--text-muted)" />
                    <input placeholder="What do you want to learn?" style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '14px', width: '100%', fontFamily: "'Figtree', sans-serif" }} />
                </div>
            </div>

            {/* Right: PWA Install + Bell + User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                
                {/* PWA Install Button */}
                {deferredPrompt && (
                    <button 
                        onClick={handleInstallClick}
                        style={{
                            background: 'var(--accent)',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: 'var(--radius-pill)',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(30, 215, 96, 0.2)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <span>⬇️</span> Download App
                    </button>
                )}

                {/* Bell Button */}
                <div ref={panelRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => { setNotifOpen(v => !v); if (!notifOpen && unreadCount > 0) markAllRead(); }}
                        style={{
                            width: '36px', height: '36px', borderRadius: '50%', position: 'relative',
                            background: notifOpen ? 'var(--bg-elevated-2)' : 'transparent',
                            color: unreadCount > 0 ? 'var(--accent)' : 'var(--text-secondary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-elevated-2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = unreadCount > 0 ? 'var(--accent)' : 'var(--text-secondary)'; e.currentTarget.style.background = notifOpen ? 'var(--bg-elevated-2)' : 'transparent'; }}
                    >
                        <Bell size={18} />
                        {/* Red badge */}
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute', top: '4px', right: '4px',
                                width: '16px', height: '16px', borderRadius: '50%',
                                background: '#ef4444', color: '#fff',
                                fontSize: '9px', fontWeight: 900,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid var(--bg-sidebar)',
                                animation: 'pulse-badge 2s infinite',
                            }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notification Dropdown Panel */}
                    {notifOpen && (
                        <div style={{
                            position: 'absolute', top: '44px', right: 0,
                            width: '360px', maxHeight: '480px',
                            background: 'var(--bg-elevated-1)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                            border: '1px solid var(--border-subtle)',
                            overflow: 'hidden',
                            display: 'flex', flexDirection: 'column',
                            zIndex: 100,
                        }}>
                            {/* Panel header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Bell size={15} color="var(--text-secondary)" />
                                    <span style={{ fontWeight: 700, fontSize: '14px' }}>Notifications</span>
                                    {notifications.length > 0 && (
                                        <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: 'var(--radius-pill)', background: 'var(--bg-elevated-3)', color: 'var(--text-muted)' }}>{notifications.length}</span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {notifications.length > 0 && (
                                        <>
                                            <button onClick={markAllRead} title="Mark all read" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'transparent', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated-2)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}><CheckCheck size={14} /></button>
                                            <button onClick={clearAll} title="Clear all" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'transparent', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated-2)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}><Trash2 size={13} /></button>
                                        </>
                                    )}
                                    <button onClick={() => setNotifOpen(false)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'transparent', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
                                </div>
                            </div>

                            {/* List */}
                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <Bell size={28} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
                                        <p style={{ fontSize: '13px', fontWeight: 600 }}>No notifications yet</p>
                                        <p style={{ fontSize: '12px', marginTop: '4px' }}>New news articles will appear here</p>
                                    </div>
                                ) : notifications.map(n => (
                                    <div key={n.id}
                                        onClick={() => { markRead(n.id); if (n.url) window.open(n.url, '_blank'); else navigate('/knowledge'); setNotifOpen(false); }}
                                        style={{
                                            display: 'flex', gap: '12px', padding: '12px 16px', cursor: 'pointer',
                                            background: n.read ? 'transparent' : 'rgba(30,215,96,0.04)',
                                            borderLeft: n.read ? '3px solid transparent' : '3px solid var(--accent)',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated-2)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(30,215,96,0.04)'}
                                    >
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(30,215,96,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Newspaper size={14} color="var(--accent)" />
                                        </div>
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <p style={{ fontSize: '13px', fontWeight: n.read ? 500 : 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{n.title}</p>
                                            {n.body && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</p>}
                                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{timeAgo(n.time)}</p>
                                        </div>
                                        {!n.read && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)', marginTop: '4px', flexShrink: 0 }} />}
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            {notifications.length > 0 && (
                                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                                    <button onClick={() => { navigate('/knowledge'); setNotifOpen(false); }}
                                        style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', background: 'transparent', cursor: 'pointer', padding: '4px 0' }}>
                                        View All News →
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* User avatar */}
                <button style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform var(--transition-fast)' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                    {(user?.name || 'U')[0].toUpperCase()}
                </button>
            </div>
        </nav>
    );
}
