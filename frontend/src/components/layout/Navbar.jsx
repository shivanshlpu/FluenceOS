import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import { useNewsPoller } from '../../hooks/useNewsPoller';
import { Search, ChevronLeft, ChevronRight, Bell, Newspaper, CheckCheck, Trash2, X, RefreshCw, LogOut } from 'lucide-react';

function timeAgo(iso) {
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const isRoot = location.pathname === '/';

    const handleBack = () => {
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };
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
            
            // 4. Clean reload without breaking SPA routes
            setTimeout(() => {
                window.location.reload();
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
        <nav className="app-nav-header">
            {/* Left: Nav Back Button & Search Input */}
            <div className="nav-left-section">
                {/* Adaptive Mobile Back Button (Visible on mobile when not on root page) */}
                {!isRoot && (
                    <button
                        type="button"
                        onClick={handleBack}
                        className="nav-mobile-back-btn"
                        title="Go back"
                        aria-label="Back"
                    >
                        <ChevronLeft size={18} />
                        <span>Back</span>
                    </button>
                )}

                {/* Back / Forward arrows (Desktop only) */}
                <button
                    onClick={() => navigate(-1)}
                    className="nav-arrow-btn desktop-only"
                    title="Go back"
                >
                    <ChevronLeft size={18} />
                </button>
                <button
                    onClick={() => navigate(1)}
                    className="nav-arrow-btn desktop-only"
                    title="Go forward"
                >
                    <ChevronRight size={18} />
                </button>

                {/* Search Bar (Expands smoothly on mobile) */}
                <div className="nav-search-box">
                    <Search size={15} color="var(--text-muted)" className="search-icon" />
                    <input
                        placeholder="What do you want to learn?"
                        className="nav-search-input"
                    />
                </div>
            </div>


            {/* Right: Clear Cache + PWA Install + Bell + User Avatar */}
            <div className="nav-right-section">
                {/* 1-Click Clear Cache & Force Update Button */}
                <button
                    type="button"
                    onClick={handleClearAppCache}
                    title="Clear cache & reload latest update"
                    disabled={clearingCache}
                    className="btn-clear-cache"
                >
                    <RefreshCw size={13} className={clearingCache ? 'animate-spin' : ''} />
                    <span className="cache-btn-text">{clearingCache ? '...' : 'Clear Cache'}</span>
                </button>

                {/* PWA Install Button (Desktop/Supported) */}
                {deferredPrompt && (
                    <button 
                        onClick={handleInstallClick}
                        className="btn-pwa-install desktop-only"
                    >
                        <span>📲</span> Install
                    </button>
                )}

                {/* Bell Notification Button */}
                <div ref={panelRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => { setNotifOpen(v => !v); if (!notifOpen && unreadCount > 0) markAllRead(); }}
                        className={`btn-icon-nav ${notifOpen ? 'active' : ''}`}
                    >
                        <Bell size={17} />
                        {unreadCount > 0 && (
                            <span className="unread-badge">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notification Dropdown Panel */}
                    {notifOpen && (
                        <div className="notif-dropdown-panel">
                            <div className="notif-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Bell size={14} color="var(--text-secondary)" />
                                    <span style={{ fontWeight: 700, fontSize: '13px' }}>Notifications</span>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {notifications.length > 0 && (
                                        <>
                                            <button onClick={markAllRead} title="Mark all read" className="btn-icon-subtle"><CheckCheck size={13} /></button>
                                            <button onClick={clearAll} title="Clear all" className="btn-icon-subtle"><Trash2 size={12} /></button>
                                        </>
                                    )}
                                    <button onClick={() => setNotifOpen(false)} className="btn-icon-subtle"><X size={13} /></button>
                                </div>
                            </div>

                            <div style={{ overflowY: 'auto', flex: 1, maxHeight: '360px' }}>
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

                {/* User Avatar & Dropdown Menu */}
                <div ref={userMenuRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => setUserMenuOpen(v => !v)}
                        className="btn-user-avatar"
                    >
                        {(user?.name || user?.email || 'U')[0].toUpperCase()}
                    </button>

                    {userMenuOpen && (
                        <div className="user-dropdown-panel">
                            <div style={{ padding: '6px 8px', borderBottom: '1px solid #282142', marginBottom: '4px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{user?.name || 'Fluence User'}</div>
                                <div style={{ fontSize: '11px', color: '#a5a0c2', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email || 'Active Session'}</div>
                            </div>

                            <button
                                onClick={handleClearAppCache}
                                className="dropdown-action-btn"
                            >
                                <RefreshCw size={13} />
                                Force Update & Clear Cache
                            </button>

                            <button
                                onClick={() => { logout(); navigate('/auth'); }}
                                className="dropdown-action-btn logout"
                            >
                                <LogOut size={13} />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Embedded Responsive Stylesheet for Header */}
            <style>{`
                .app-nav-header {
                    position: sticky;
                    top: 0;
                    z-index: 100;
                    height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 16px;
                    background: rgba(18, 18, 18, 0.95);
                    backdrop-filter: blur(20px);
                    box-sizing: border-box;
                    width: 100%;
                    gap: 10px;
                }

                .nav-left-section {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex: 1;
                    min-width: 0;
                }

                .nav-arrow-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: rgba(0, 0, 0, 0.6);
                    color: var(--text-primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    cursor: pointer;
                    flex-shrink: 0;
                }

                .nav-search-box {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: var(--bg-surface, #1e1b2e);
                    border-radius: 20px;
                    padding: 8px 12px;
                    border: 1px solid var(--border-subtle, #2d264a);
                    flex: 1;
                    max-width: 320px;
                    min-width: 0;
                    box-sizing: border-box;
                }

                .nav-search-input {
                    background: transparent;
                    border: none;
                    outline: none;
                    color: #fff;
                    font-size: 13px;
                    width: 100%;
                    min-width: 0;
                    font-family: inherit;
                }

                .nav-right-section {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-shrink: 0;
                }

                .btn-clear-cache {
                    background: rgba(139, 92, 246, 0.18);
                    border: 1px solid #8b5cf6;
                    color: #c4b5fd;
                    padding: 6px 10px;
                    border-radius: 20px;
                    font-size: 11.5px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .btn-pwa-install {
                    background: var(--accent, #10b981);
                    color: #fff;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    white-space: nowrap;
                }

                .btn-icon-nav {
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    background: transparent;
                    color: #a8a2c8;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    cursor: pointer;
                    position: relative;
                    flex-shrink: 0;
                }
                .btn-icon-nav.active {
                    background: #251f38;
                    color: #fff;
                }

                .unread-badge {
                    position: absolute;
                    top: 2px;
                    right: 2px;
                    width: 15px;
                    height: 15px;
                    border-radius: 50%;
                    background: #ef4444;
                    color: #fff;
                    font-size: 9px;
                    font-weight: 900;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .btn-user-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: #8b5cf6;
                    color: #fff;
                    font-size: 13px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    cursor: pointer;
                    flex-shrink: 0;
                }

                .notif-dropdown-panel {
                    position: absolute;
                    top: 44px;
                    right: 0;
                    width: 320px;
                    max-height: 440px;
                    background: #181528;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
                    border: 1px solid #2d264a;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    z-index: 200;
                }

                .notif-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 14px;
                    border-bottom: 1px solid #282142;
                }

                .btn-icon-subtle {
                    width: 26px;
                    height: 26px;
                    border-radius: 50%;
                    background: transparent;
                    color: #a5a0c2;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .user-dropdown-panel {
                    position: absolute;
                    top: 44px;
                    right: 0;
                    width: 200px;
                    background: #181528;
                    border-radius: 12px;
                    border: 1px solid #2d264a;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
                    padding: 8px;
                    z-index: 200;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .dropdown-action-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 10px;
                    border-radius: 8px;
                    background: transparent;
                    border: none;
                    color: #c4b5fd;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    width: 100%;
                    text-align: left;
                }
                .dropdown-action-btn.logout {
                    color: #ef4444;
                }

                .nav-mobile-back-btn {
                    display: none;
                    align-items: center;
                    gap: 3px;
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    color: #fff;
                    padding: 5px 10px 5px 6px;
                    border-radius: 18px;
                    cursor: pointer;
                    font-weight: 700;
                    font-size: 12px;
                    flex-shrink: 0;
                    transition: all 0.15s ease;
                }
                .nav-mobile-back-btn:active {
                    background: rgba(255, 255, 255, 0.18);
                    transform: scale(0.96);
                }

                /* Mobile View Rules: Remove Back/Forward arrows, maximize search & fit right-side buttons */
                @media (max-width: 768px) {
                    .app-nav-header {
                        padding: 0 10px;
                        gap: 8px;
                    }
                    .desktop-only {
                        display: none !important;
                    }
                    .nav-mobile-back-btn {
                        display: inline-flex !important;
                    }
                    .nav-search-box {
                        max-width: 100%;
                        padding: 6px 10px;
                    }
                    .nav-search-input {
                        font-size: 12px;
                    }
                    .btn-clear-cache {
                        padding: 5px 8px;
                        font-size: 11px;
                    }
                    .cache-btn-text {
                        display: none; /* Icon-only or compact on tiny phones */
                    }
                    .btn-clear-cache::after {
                        content: 'Clear';
                    }
                    .notif-dropdown-panel {
                        width: calc(100vw - 20px);
                        right: -50px;
                    }
                }

            `}</style>
        </nav>
    );
}
