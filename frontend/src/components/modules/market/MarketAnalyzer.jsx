import { useState } from 'react';
import SkillDemandChart from './SkillDemandChart';
import useMarketStore from '../../../store/marketStore';
import { marketService } from '../../../services/marketService';
import { Search, Loader, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MarketAnalyzer() {
    const [role, setRole] = useState('');
    const [error, setError] = useState(null);
    const { marketData, loading, setMarketData, setLoading } = useMarketStore();

    const handleAnalyze = async () => {
        if (!role.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const data = await marketService.analyzeRole(role);
            setMarketData(data);
        } catch (err) {
            console.error('Market analysis failed:', err);
            setError('Failed to analyze role. Please check your backend connection.');
            setMarketData(null);
        }
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Search */}
            <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
                    <Search size={18} color="var(--accent)" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                    Analyze a Role
                </h3>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <input
                        placeholder="e.g. Software Engineer, Data Scientist..."
                        value={role} onChange={(e) => setRole(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                        style={{
                            flex: 1, padding: '14px 16px',
                            background: 'var(--bg-surface)', border: '1px solid transparent',
                            borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                            fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                            fontFamily: "'Figtree', sans-serif",
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                        onBlur={(e) => e.target.style.borderColor = 'transparent'}
                    />
                    <button onClick={handleAnalyze} disabled={!role.trim() || loading} style={{
                        padding: '14px 32px', borderRadius: 'var(--radius-pill)',
                        background: (!role.trim() || loading) ? 'var(--bg-elevated-3)' : 'var(--accent)',
                        color: '#fff', fontSize: '13px', fontWeight: 700,
                        letterSpacing: '1.5px', textTransform: 'uppercase',
                        cursor: (!role.trim() || loading) ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                        {loading ? <Loader size={16} className="animate-spin" /> : <Search size={16} />}
                        Analyze
                    </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {['Software Engineer', 'Data Scientist', 'Product Manager', 'DevOps Engineer', 'ML Engineer'].map((r) => (
                        <button key={r} onClick={() => setRole(r)} style={{
                            padding: '6px 14px', borderRadius: 'var(--radius-pill)',
                            background: 'var(--bg-elevated-2)', border: 'none',
                            color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700,
                            cursor: 'pointer', transition: 'all var(--transition-fast)',
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                        >{r}</button>
                    ))}
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)' }}>
                    <AlertCircle size={36} color="var(--error)" style={{ margin: '0 auto 12px', display: 'block' }} />
                    <p style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>Analysis Failed</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>{error}</p>
                    <button onClick={handleAnalyze} style={{
                        padding: '8px 24px', borderRadius: 'var(--radius-pill)',
                        background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 700,
                    }}>Retry</button>
                </div>
            )}

            {/* Results */}
            {marketData && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                        {[
                            { value: marketData.totalJobsFound?.toLocaleString(), label: 'Jobs Found', color: 'var(--success)' },
                            { value: `$${((marketData.salaryRange?.min || 0) / 1000).toFixed(0)}k`, label: 'Avg. Min Salary', color: 'var(--info)' },
                            { value: `$${((marketData.salaryRange?.max || 0) / 1000).toFixed(0)}k`, label: 'Avg. Max Salary', color: 'var(--accent)' },
                        ].map(({ value, label, color }) => (
                            <div key={label} style={{
                                background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '20px',
                            }}>
                                <div style={{ fontSize: '32px', fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{label}</div>
                            </div>
                        ))}
                    </div>
                    <SkillDemandChart skills={marketData.topSkills} role={marketData.role} />
                </motion.div>
            )}
        </div>
    );
}
