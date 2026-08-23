import { useState, useEffect } from 'react';
import RoadmapTree from './RoadmapTree';
import WeeklyPlan from './WeeklyPlan';
import InterviewCheatSheet from './InterviewCheatSheet';
import BookmarkedTopicsView from './BookmarkedTopicsView';
import TopicGuideModal from './TopicGuideModal';
import useRoadmapStore from '../../../store/roadmapStore';
import { roadmapService } from '../../../services/roadmapService';
import { Sparkles, Loader, AlertCircle, Map, Calendar, HelpCircle, Download, ArrowRight, BookOpen, Layers, CheckCircle, Bookmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RoadmapGenerator() {
    const [skill, setSkill] = useState('Python');
    const [level, setLevel] = useState('Beginner');
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('roadmap'); // 'roadmap' | 'plan' | 'bookmarks' | 'interview'
    const [presets, setPresets] = useState([]);
    const [exportSuccess, setExportSuccess] = useState(false);
    const [selectedGuideFromBookmark, setSelectedGuideFromBookmark] = useState(null);

    const { roadmap, loading, setRoadmap, setLoading } = useRoadmapStore();

    useEffect(() => {
        // Load presets on mount
        roadmapService.getPresets().then(res => setPresets(res)).catch(() => {});
        // If no roadmap exists yet, auto-generate default Python roadmap for instant rich preview
        if (!roadmap) {
            handleGenerateSkill('Python', 'Beginner');
        }
    }, []);

    const handleGenerateSkill = async (targetSkill, targetLevel) => {
        const querySkill = targetSkill || skill;
        const queryLevel = targetLevel || level;
        if (!querySkill.trim()) return;

        setLoading(true);
        setError(null);
        try {
            const data = await roadmapService.generateRoadmap(querySkill, queryLevel);
            setRoadmap(data);
            setSkill(querySkill);
        } catch (err) {
            console.error('Roadmap generation failed:', err);
            setError('Failed to generate roadmap. Using pre-cached high-quality pathway.');
            const fallbackData = await roadmapService.generateRoadmap(querySkill, queryLevel);
            setRoadmap(fallbackData);
        } finally {
            setLoading(false);
        }
    };

    const handleExportMarkdown = () => {
        if (!roadmap) return;
        let md = `# Learning Roadmap: ${roadmap.name} (${roadmap.level || 'Beginner'})\n\n`;
        md += `> ${roadmap.overview || 'Step-by-step master learning path'}\n\n`;

        if (roadmap.setupGuide) {
            md += `## Phase 0: Prerequisites & Setup\n`;
            (roadmap.setupGuide.prerequisites || []).forEach(p => md += `- [ ] ${p}\n`);
            if (roadmap.setupGuide.helloWorldCode) {
                md += `\n\`\`\`\n${roadmap.setupGuide.helloWorldCode}\n\`\`\`\n\n`;
            }
        }

        (roadmap.phases || []).forEach(p => {
            md += `## ${p.title} (${p.duration})\n`;
            if (p.goal) md += `Goal: ${p.goal}\n\n`;
            md += `### Topics\n`;
            (p.topics || []).forEach(t => {
                const tName = typeof t === 'string' ? t : t.name;
                md += `- ${tName}\n`;
            });
            md += `\n### Projects\n`;
            (p.projects || []).forEach(proj => {
                const pName = typeof proj === 'string' ? proj : proj.name;
                md += `- [ ] ${pName}\n`;
            });
            md += `\n`;
        });

        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${roadmap.name.toLowerCase().replace(/ /g, '_')}_roadmap.md`;
        a.click();
        URL.revokeObjectURL(url);
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 2500);
    };

    const handleOpenTopicGuide = async (topic) => {
        const topicName = typeof topic === 'string' ? topic : topic.name;
        try {
            const guide = await roadmapService.getTopicGuide(roadmap?.name || skill, topicName);
            setSelectedGuideFromBookmark({ ...guide, skill: roadmap?.name || skill });
        } catch {
            setSelectedGuideFromBookmark({
                topic: topicName,
                skill: roadmap?.name || skill,
                overview: `Deep dive guide for ${topicName}`,
            });
        }
    };

    const inputStyle = {
        padding: '14px 18px',
        background: 'var(--bg-surface, #121212)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        color: 'var(--text-primary)',
        fontSize: '14px',
        outline: 'none',
        boxSizing: 'border-box',
        fontFamily: "'Figtree', sans-serif",
        transition: 'border 0.2s ease',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Modal for Topic from Bookmarks */}
            {selectedGuideFromBookmark && (
                <TopicGuideModal
                    guide={selectedGuideFromBookmark}
                    onClose={() => setSelectedGuideFromBookmark(null)}
                />
            )}

            {/* Search & Generator Bar */}
            <div style={{
                background: 'var(--bg-elevated-1)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Sparkles size={20} color="#10b981" />
                        <div>
                            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff' }}>
                                Generate Complete Learning Roadmap & Guide
                            </h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Enter ANY programming language, framework, database, or skill for an instant step-by-step master plan
                            </p>
                        </div>
                    </div>
                </div>

                {/* Input Fields */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <input
                        placeholder="e.g. Python, React, Rust, Go, Machine Learning, Docker, SQL, Kubernetes, C++..."
                        value={skill}
                        onChange={(e) => setSkill(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerateSkill(skill, level)}
                        style={{ ...inputStyle, flex: '1 1 300px' }}
                        onFocus={(e) => e.target.style.borderColor = '#10b981'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                    />

                    <select
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        style={{ ...inputStyle, cursor: 'pointer', minWidth: '160px' }}
                    >
                        {['Beginner', 'Intermediate', 'Advanced'].map((l) => (
                            <option key={l} value={l} style={{ background: '#181818', color: '#fff' }}>
                                {l} Level
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={() => handleGenerateSkill(skill, level)}
                        disabled={!skill.trim() || loading}
                        style={{
                            padding: '14px 28px',
                            borderRadius: '12px',
                            background: (!skill.trim() || loading) ? 'var(--bg-elevated-3)' : 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            cursor: (!skill.trim() || loading) ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            border: 'none',
                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {loading ? <><Loader size={16} className="animate-spin" /> Generating Master Guide...</> : <><Sparkles size={16} /> Generate Roadmap</>}
                    </button>
                </div>

                {/* Quick Presets Bar */}
                <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                        Popular 1-Click Pathways:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {presets.map((p) => (
                            <button
                                key={p.skill}
                                onClick={() => handleGenerateSkill(p.skill, p.level || 'Beginner')}
                                style={{
                                    padding: '7px 14px',
                                    borderRadius: '20px',
                                    background: skill.toLowerCase() === p.skill.toLowerCase() ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-elevated-2)',
                                    border: skill.toLowerCase() === p.skill.toLowerCase() ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.06)',
                                    color: skill.toLowerCase() === p.skill.toLowerCase() ? '#34d399' : 'var(--text-secondary)',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                    if (skill.toLowerCase() !== p.skill.toLowerCase()) {
                                        e.currentTarget.style.color = 'var(--text-primary)';
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (skill.toLowerCase() !== p.skill.toLowerCase()) {
                                        e.currentTarget.style.color = 'var(--text-secondary)';
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                                    }
                                }}
                            >
                                <span>{p.icon || '🚀'}</span>
                                <span>{p.skill}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-elevated-1)', borderRadius: '14px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <AlertCircle size={28} color="#ef4444" style={{ margin: '0 auto 8px', display: 'block' }} />
                    <p style={{ fontWeight: 700, color: '#fff', fontSize: '14px', marginBottom: '2px' }}>Notice</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>{error}</p>
                </div>
            )}

            {/* Navigation Tabs & Actions when Roadmap is loaded */}
            {roadmap && (
                <div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        marginBottom: '16px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        paddingBottom: '12px',
                    }}>
                        {/* Tab buttons */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setActiveTab('roadmap')}
                                style={{
                                    padding: '9px 18px',
                                    borderRadius: '10px',
                                    background: activeTab === 'roadmap' ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--bg-elevated-1)',
                                    color: activeTab === 'roadmap' ? '#fff' : 'var(--text-secondary)',
                                    border: activeTab === 'roadmap' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.06)',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <Map size={16} />
                                <span>🗺️ Master Roadmap & Guide</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('plan')}
                                style={{
                                    padding: '9px 18px',
                                    borderRadius: '10px',
                                    background: activeTab === 'plan' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--bg-elevated-1)',
                                    color: activeTab === 'plan' ? '#fff' : 'var(--text-secondary)',
                                    border: activeTab === 'plan' ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.06)',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <Calendar size={16} />
                                <span>📅 Weekly Action Plan</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('bookmarks')}
                                style={{
                                    padding: '9px 18px',
                                    borderRadius: '10px',
                                    background: activeTab === 'bookmarks' ? 'linear-gradient(135deg, #c084fc, #9333ea)' : 'var(--bg-elevated-1)',
                                    color: activeTab === 'bookmarks' ? '#fff' : 'var(--text-secondary)',
                                    border: activeTab === 'bookmarks' ? '1px solid #c084fc' : '1px solid rgba(255,255,255,0.06)',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <Bookmark size={16} />
                                <span>⭐ Bookmarks & Notes</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('interview')}
                                style={{
                                    padding: '9px 18px',
                                    borderRadius: '10px',
                                    background: activeTab === 'interview' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'var(--bg-elevated-1)',
                                    color: activeTab === 'interview' ? '#fff' : 'var(--text-secondary)',
                                    border: activeTab === 'interview' ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.06)',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <HelpCircle size={16} />
                                <span>💼 Interview Q&A & Cheat Sheet</span>
                            </button>
                        </div>

                        {/* Export Markdown Button */}
                        <button
                            onClick={handleExportMarkdown}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '10px',
                                background: exportSuccess ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#fff',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            {exportSuccess ? <CheckCircle size={14} /> : <Download size={14} />}
                            {exportSuccess ? 'Downloaded .MD!' : 'Export Study Guide (.MD)'}
                        </button>
                    </div>

                    {/* Active Tab View */}
                    <AnimatePresence mode="wait">
                        {activeTab === 'roadmap' && (
                            <motion.div key="roadmap" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <RoadmapTree roadmap={roadmap} />
                            </motion.div>
                        )}

                        {activeTab === 'plan' && (
                            <motion.div key="plan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <WeeklyPlan plan={roadmap.weeklyPlan || []} skillName={roadmap.name} />
                            </motion.div>
                        )}

                        {activeTab === 'bookmarks' && (
                            <motion.div key="bookmarks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <BookmarkedTopicsView
                                    skillName={roadmap.name}
                                    onOpenTopic={handleOpenTopicGuide}
                                />
                            </motion.div>
                        )}

                        {activeTab === 'interview' && (
                            <motion.div key="interview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <InterviewCheatSheet
                                    questions={roadmap.interviewQuestions || []}
                                    cheatSheet={roadmap.cheatSheet || []}
                                    skillName={roadmap.name}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
