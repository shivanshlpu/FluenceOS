import { useState } from 'react';
import RoadmapTree from './RoadmapTree';
import WeeklyPlan from './WeeklyPlan';
import useRoadmapStore from '../../../store/roadmapStore';
import { roadmapService } from '../../../services/roadmapService';
import { Sparkles, Loader, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RoadmapGenerator() {
    const [skill, setSkill] = useState('');
    const [level, setLevel] = useState('Beginner');
    const [error, setError] = useState(null);
    const { roadmap, loading, setRoadmap, setLoading } = useRoadmapStore();

    const handleGenerate = async () => {
        if (!skill.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const data = await roadmapService.generateRoadmap(skill, level);
            setRoadmap(data);
        } catch (err) {
            console.error('Roadmap generation failed:', err);
            setError('Failed to generate roadmap. Please check your backend connection.');
            setRoadmap(null);
        }
        setLoading(false);
    };

    const inputStyle = {
        padding: '14px 16px',
        background: 'var(--bg-surface)', border: '1px solid transparent',
        borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
        fontSize: '14px', outline: 'none', boxSizing: 'border-box',
        fontFamily: "'Figtree', sans-serif",
        transition: 'border var(--transition-fast)',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Generator */}
            <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
                    <Sparkles size={18} color="var(--accent)" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                    Generate Your Roadmap
                </h3>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <input
                        placeholder="e.g. React, Python, Machine Learning..."
                        value={skill} onChange={(e) => setSkill(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                        style={{ ...inputStyle, flex: 1 }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                        onBlur={(e) => e.target.style.borderColor = 'transparent'}
                    />
                    <select value={level} onChange={(e) => setLevel(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', minWidth: '140px' }}>
                        {['Beginner', 'Intermediate', 'Advanced'].map((l) => (
                            <option key={l} value={l} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>{l}</option>
                        ))}
                    </select>
                </div>

                <button onClick={handleGenerate} disabled={!skill.trim() || loading} style={{
                    width: '100%', padding: '14px',
                    borderRadius: 'var(--radius-pill)',
                    background: (!skill.trim() || loading) ? 'var(--bg-elevated-3)' : 'var(--accent)',
                    color: (!skill.trim() || loading) ? 'var(--text-muted)' : '#fff',
                    fontSize: '13px', fontWeight: 700, letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    cursor: (!skill.trim() || loading) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all var(--transition-fast)',
                }}>
                    {loading ? <><Loader size={16} className="animate-spin" /> Generating...</> : <><Sparkles size={16} /> Generate Roadmap</>}
                </button>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                    {['React', 'Python', 'Machine Learning', 'Docker', 'System Design', 'TypeScript'].map((s) => (
                        <button key={s} onClick={() => setSkill(s)} style={{
                            padding: '6px 14px', borderRadius: 'var(--radius-pill)',
                            background: 'var(--bg-elevated-2)', border: 'none',
                            color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700,
                            cursor: 'pointer', transition: 'all var(--transition-fast)',
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                        >{s}</button>
                    ))}
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)' }}>
                    <AlertCircle size={36} color="var(--error)" style={{ margin: '0 auto 12px', display: 'block' }} />
                    <p style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>Generation Failed</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>{error}</p>
                    <button onClick={handleGenerate} style={{
                        padding: '8px 24px', borderRadius: 'var(--radius-pill)',
                        background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 700,
                    }}>Retry</button>
                </div>
            )}

            {/* Results */}
            {roadmap && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <RoadmapTree roadmap={roadmap} />
                    {roadmap.weeklyPlan && <WeeklyPlan plan={roadmap.weeklyPlan} />}
                </motion.div>
            )}
        </div>
    );
}
