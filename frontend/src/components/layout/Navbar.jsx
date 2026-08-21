import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import { useNewsPoller } from '../../hooks/useNewsPoller';
import { Search, ChevronLeft, ChevronRight, Bell, Newspaper, CheckCheck, Trash2, X, RefreshCw, LogOut, ShieldCheck } from 'lucide-react';

function timeAgo(iso) {
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function Navbar() {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotificationStore();
    const [scrolled, setScrolled] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [clearingCache, setClearingCache] = useState(false);
    const panelRef = useRef(null);
    const userMenuRef = useRef(null);

    // Start news polling for the whole app
    useNewsPoller();

    // Clear Cache & Force Reload function
    const handleClearAppCache = async () => {
        setClearingCache(true);
        try {
            // 1. Unregister all service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            }
            // 2. Delete all Cache Storage
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (let name of cacheNames) {
                    await caches.delete(name);
                }
            }
            // 3. Clear session storage
            sessionStorage.clear();
            
            // 4. Force reload bypassing browser cache with fresh timestamp
            setTimeout(() => {
                window.location.href = window.location.origin + window.location.pathname + '?refresh=' + Date.now();
            }, 300);
        } catch (err) {
            console.warn('Cache clearing error:', err);
            window.location.reload();
        }
    };

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
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setNotifOpen(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <nav style={{
            position: 'sticky', top: 0, zIndex: 10, height: '64px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px',
            background: scrolled ? 'rgba(18,18,18,0.95)' : 'transparent',
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            transition: 'background var(--transition-normal)',
        }}>
            {/* Left: Nav arrows + Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={() => navigate(-1)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                    <ChevronLeft size={18} />
                </button>
                <button onClick={() => navigate(1)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                    <ChevronRight size={18} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-pill)', padding: '8px 14px', width: '220px', border: '1px solid var(--border-subtle)' }}>
                    <Search size={15} color="var(--text-muted)" />
                    <input placeholder="What do you want to learn?" style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '13px', width: '100%', fontFamily: "'Figtree', sans-serif" }} />
                </div>
            </div>

            {/* Right: Clear Cache + PWA Install + Bell + User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                
                {/* 1-Click Clear Cache & Force Update Button */}
                <button
                    type="button"
                    onClick={handleClearAppCache}
                    title="Clear cache & reload latest update"
                    disabled={clearingCache}
                    style={{
                        background: 'rgba(139, 92, 246, 0.15)',
                        border: '1px solid #8b5cf6',
                        color: '#c4b5fd',
                        padding: '6px 10px',
                        borderRadius: '20px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: clearingCache ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <RefreshCw size={13} className={clearingCache ? 'animate-spin' : ''} />
                    <span>{clearingCache ? 'Updating...' : 'Clear Cache'}</span>
                </button>

                {/* PWA Install Button */}
                {deferredPrompt && (
                    <button 
                        onClick={handleInstallClick}
                        style={{
                            background: 'var(--accent)',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-pill)',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(30, 215, 96, 0.2)'
                        }}
                    >
                        <span>📲</span> Install
                    </button>
                )}

                {/* Bell Button */}
                <div ref={panelRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => { setNotifOpen(v => !v); if (!notifOpen && unreadCount > 0) markAllRead(); }}
                        style={{
                            width: '34px', height: '34px', borderRadius: '50%', position: 'relative',
                            background: notifOpen ? 'var(--bg-elevated-2)' : 'transparent',
                            color: unreadCount > 0 ? 'var(--accent)' : 'var(--text-secondary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                        }}
                    >
                        <Bell size={17} />
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute', top: '2px', right: '2px',
                                width: '15px', height: '15px', borderRadius: '50%',
                                background: '#ef4444', color: '#fff',
                                fontSize: '9px', fontWeight: 900,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notification Dropdown Panel */}
                    {notifOpen && (
                        <div style={{
                            position: 'absolute', top: '44px', right: 0,
                            width: '320px', maxHeight: '440px',
                            background: 'var(--bg-elevated-1)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                            border: '1px solid var(--border-subtle)',
                            overflow: 'hidden',
                            display: 'flex', flexDirection: 'column',
                            zIndex: 100,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Bell size={14} color="var(--text-secondary)" />
                                    <span style={{ fontWeight: 700, fontSize: '13px' }}>Notifications</span>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {notifications.length > 0 && (
                                        <>
                                            <button onClick={markAllRead} title="Mark all read" style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCheck size={13} /></button>
                                            <button onClick={clearAll} title="Clear all" style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
                                        </>
                                    )}
                                    <button onClick={() => setNotifOpen(false)} style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
                                </div>
                            </div>

                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <p style={{ fontSize: '12px', margin: 0 }}>No new notifications</p>
                                    </div>
                                ) : notifications.map(n => (
                                    <div key={n.id}
                                        onClick={() => { markRead(n.id); if (n.url) window.open(n.url, '_blank'); else navigate('/knowledge'); setNotifOpen(false); }}
                                        style={{
                                            display: 'flex', gap: '10px', padding: '10px 14px', cursor: 'pointer',
                                            background: n.read ? 'transparent' : 'rgba(30,215,96,0.04)',
                                            borderLeft: n.read ? '3px solid transparent' : '3px solid var(--accent)',
                                        }}
                                    >
                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(30,215,96,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Newspaper size={13} color="var(--accent)" />
                                        </div>
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <p style={{ fontSize: '12px', fontWeight: n.read ? 500 : 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{n.title}</p>
                                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{timeAgo(n.time)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* User avatar & dropdown menu */}
                <div ref={userMenuRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => setUserMenuOpen(v => !v)}
                        style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: '#8b5cf6', color: '#fff', fontSize: '13px',
                            fontWeight: 700, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', border: 'none', cursor: 'pointer'
                        }}
                    >
                        {(user?.name || user?.email || 'U')[0].toUpperCase()}
                    </button>

                    {userMenuOpen && (
                        <div style={{
                            position: 'absolute', top: '44px', right: 0,
                            width: '200px', background: '#181528',
                            borderRadius: '12px', border: '1px solid #2d264a',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                            padding: '8px', zIndex: 100,
                            display: 'flex', flexDirection: 'column', gap: '4px'
                        }}>
                            <div style={{ padding: '6px 8px', borderBottom: '1px solid #282142', marginBottom: '4px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{user?.name || 'Fluence User'}</div>
                                <div style={{ fontSize: '11px', color: '#a5a0c2', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email || 'Active Session'}</div>
                            </div>

                            <button
                                onClick={handleClearAppCache}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '8px 10px', borderRadius: '8px',
                                    background: 'transparent', border: 'none',
                                    color: '#c4b5fd', fontSize: '12px', fontWeight: 600,
                                    cursor: 'pointer', width: '100%', textAlign: 'left'
                                }}
                            >
                                <RefreshCw size={13} />
                                Force Update & Clear Cache
                            </button>

                            <button
                                onClick={() => { logout(); navigate('/auth'); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '8px 10px', borderRadius: '8px',
                                    background: 'transparent', border: 'none',
                                    color: '#ef4444', fontSize: '12px', fontWeight: 600,
                                    cursor: 'pointer', width: '100%', textAlign: 'left'
                                }}
                            >
                                <LogOut size={13} />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
