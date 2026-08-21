import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, register } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            let success;
            if (isLogin) { success = await login(email, password); }
            else { success = await register(name, email, password); }

            if (success) {
                navigate('/');
            } else {
                setError(useAuthStore.getState().error || 'Authentication failed');
            }
        } catch (err) { setError(err.message || 'Something went wrong'); }
        setLoading(false);
    };

    const inputStyle = {
        width: '100%', padding: '14px 16px 14px 44px',
        background: 'var(--bg-surface)', border: '1px solid transparent',
        borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
        fontSize: '14px', outline: 'none', boxSizing: 'border-box',
        fontFamily: "'Figtree', sans-serif",
        transition: 'border var(--transition-fast)',
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-base)',
            position: 'relative', overflow: 'hidden',
        }}>
            {/* Background gradient blobs */}
            <div style={{
                position: 'absolute', width: '600px', height: '600px',
                borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)',
                top: '-200px', right: '-100px', pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', width: '400px', height: '400px',
                borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
                bottom: '-100px', left: '-50px', pointerEvents: 'none',
            }} />

            <motion.div
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                    width: '100%', maxWidth: '420px', padding: '40px',
                    background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-modal)', position: 'relative', zIndex: 1,
                }}
            >
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <img src="/logo.png" alt="FluenceOS Logo" style={{
                        width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 16px',
                        display: 'block', boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                    }} />
                    <h1 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '4px' }}>
                        {isLogin ? 'Welcome back' : 'Create account'}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        {isLogin ? 'Sign in to continue your growth journey' : 'Start your AI-powered growth journey'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <AnimatePresence>
                        {!isLogin && (
                            <motion.div key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                <div style={{ position: 'relative' }}>
                                    <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)}
                                        style={inputStyle}
                                        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                        onBlur={(e) => e.target.style.borderColor = 'transparent'}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div style={{ position: 'relative' }}>
                        <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)}
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                            onBlur={(e) => e.target.style.borderColor = 'transparent'}
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input type={showPwd ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
                            style={{ ...inputStyle, paddingRight: '44px' }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                            onBlur={(e) => e.target.style.borderColor = 'transparent'}
                        />
                        <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
                            position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                            background: 'transparent', color: 'var(--text-muted)', display: 'flex', cursor: 'pointer',
                        }}>
                            {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {error && (
                        <p style={{ fontSize: '13px', color: 'var(--error)', padding: '8px 12px', background: 'rgba(241,94,108,0.1)', borderRadius: 'var(--radius-sm)' }}>{error}</p>
                    )}

                    <button type="submit" disabled={loading} style={{
                        width: '100%', padding: '14px', marginTop: '8px',
                        borderRadius: 'var(--radius-pill)',
                        background: loading ? 'var(--bg-elevated-3)' : 'var(--accent)',
                        color: '#fff', fontSize: '13px', fontWeight: 700,
                        letterSpacing: '1.5px', textTransform: 'uppercase',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        transition: 'all var(--transition-fast)',
                    }}>
                        {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                        {!loading && <ArrowRight size={16} />}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '24px', borderTop: '1px solid var(--border-subtle)', paddingTop: '24px' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        {isLogin ? "Don't have an account?" : 'Already have an account?'}
                        <button onClick={() => { setIsLogin(!isLogin); setError(''); }} style={{
                            background: 'transparent', color: 'var(--accent)',
                            fontWeight: 700, marginLeft: '6px', cursor: 'pointer',
                            textDecoration: 'underline',
                        }}>
                            {isLogin ? 'Sign up' : 'Sign in'}
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
