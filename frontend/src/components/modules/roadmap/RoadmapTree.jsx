import { useState, useEffect } from 'react';
import { BookOpen, Video, GraduationCap, Code, CheckCircle2, Circle, ExternalLink, Play, Terminal, Lightbulb, Sparkles, Copy, Check, Info, HelpCircle, CheckSquare, Square, Zap, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import TopicGuideModal from './TopicGuideModal';
import PhaseQuizModal from './PhaseQuizModal';
import { roadmapService } from '../../../services/roadmapService';
import { pythonAPI } from '../../../services/api';

const phaseColors = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
const phaseEmojis = ['🌱', '🌿', '🌳', '🚀', '⭐'];

function getResourceStyle(type) {
    if (type === 'course') {
        return {
            icon: GraduationCap, iconColor: '#fbbf24',
            bg: 'rgba(251, 191, 36, 0.08)', border: 'rgba(251, 191, 36, 0.25)',
            hoverBg: 'rgba(251, 191, 36, 0.15)',
            badge: '🎓 Certificate', badgeColor: '#fbbf24',
        };
    }
    if (type === 'free') {
        return {
            icon: BookOpen, iconColor: '#60a5fa',
            bg: 'rgba(96, 165, 250, 0.08)', border: 'rgba(96, 165, 250, 0.25)',
            hoverBg: 'rgba(96, 165, 250, 0.15)',
            badge: '🆓 Free Course', badgeColor: '#60a5fa',
        };
    }
    return {
        icon: Play, iconColor: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.2)',
        hoverBg: 'rgba(239, 68, 68, 0.15)',
        badge: '▶ Video Tutorial', badgeColor: '#f87171',
    };
}

export default function RoadmapTree({ roadmap }) {
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [activeQuizPhase, setActiveQuizPhase] = useState(null);
    const [copiedHello, setCopiedHello] = useState(false);

    const skill = roadmap?.name || 'Skill';
    const completedTopicsKey = `fluence_completed_topics_${skill.toLowerCase().replace(/ /g, '_')}`;

    // Completed topics state
    const [completedTopics, setCompletedTopics] = useState(() => {
        try {
            const raw = localStorage.getItem(completedTopicsKey);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    });

    if (!roadmap?.phases) return null;

    const toggleTopicComplete = (topicName, e) => {
        if (e) e.stopPropagation();
        const updated = { ...completedTopics, [topicName]: !completedTopics[topicName] };
        setCompletedTopics(updated);
        try {
            localStorage.setItem(completedTopicsKey, JSON.stringify(updated));
        } catch {}

        if (updated[topicName]) {
            // Feed streak in Habit Tracker
            pythonAPI.post('/api/tracker/log-activity', {
                activityType: 'roadmap',
                durationMinutes: 10,
                title: `Mastered Topic: ${topicName} in ${skill}`
            }).catch(() => {});
        }
    };

    const handleTopicClick = async (topic) => {
        if (typeof topic === 'object' && topic.explanation && topic.codeSnippet) {
            setSelectedTopic({ ...topic, skill: roadmap.name });
            return;
        }

        const topicName = typeof topic === 'string' ? topic : topic.name;
        try {
            const guide = await roadmapService.getTopicGuide(roadmap.name, topicName);
            setSelectedTopic({ ...guide, skill: roadmap.name });
        } catch (e) {
            setSelectedTopic({
                topic: topicName,
                skill: roadmap.name,
                overview: `Deep-dive guide for ${topicName} in ${roadmap.name}`,
                howToStart: '1. Follow the step-by-step instructions in the roadmap.\n2. Write runnable code.',
                codeSnippet: `// Practice ${topicName} in ${roadmap.name}`,
            });
        }
    };

    const handleCopyHelloWorld = () => {
        if (!roadmap?.setupGuide?.helloWorldCode) return;
        navigator.clipboard.writeText(roadmap.setupGuide.helloWorldCode);
        setCopiedHello(true);
        setTimeout(() => setCopiedHello(false), 2000);
    };

    // Calculate total roadmap completion stats
    const allTopics = (roadmap.phases || []).flatMap(p => p.topics || []);
    const totalTopicsCount = allTopics.length;
    const completedCount = allTopics.filter(t => completedTopics[typeof t === 'string' ? t : t.name]).length;
    const roadmapProgressPct = totalTopicsCount > 0 ? Math.round((completedCount / totalTopicsCount) * 100) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Modal for Topic Deep-Dive Tutorial */}
            {selectedTopic && (
                <TopicGuideModal
                    guide={selectedTopic}
                    onClose={() => setSelectedTopic(null)}
                />
            )}

            {/* Modal for Interactive Phase Knowledge Check Quiz */}
            {activeQuizPhase && (
                <PhaseQuizModal
                    phase={activeQuizPhase}
                    skillName={roadmap.name}
                    onClose={() => setActiveQuizPhase(null)}
                    onCompletePhase={(phaseNum) => {
                        // Mark all topics in that phase as completed
                        const phaseObj = roadmap.phases.find(p => p.phase === phaseNum);
                        if (phaseObj && phaseObj.topics) {
                            const newCompleted = { ...completedTopics };
                            phaseObj.topics.forEach(t => {
                                newCompleted[typeof t === 'string' ? t : t.name] = true;
                            });
                            setCompletedTopics(newCompleted);
                            try {
                                localStorage.setItem(completedTopicsKey, JSON.stringify(newCompleted));
                            } catch {}
                        }
                    }}
                />
            )}

            {/* Header / Summary Card */}
            <div style={{
                padding: '24px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(16, 185, 129, 0.1))',
                border: '1.5px solid rgba(168, 85, 247, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #a855f7, #10b981)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                        flexShrink: 0,
                    }}>
                        🗺️
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#a855f7', letterSpacing: '0.06em' }}>
                                Master Learning Path
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                                {roadmap.level || 'Beginner'} Level
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                                {roadmap.estimatedWeeks || 8} Weeks Plan
                            </span>
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginTop: '2px', letterSpacing: '-0.02em' }}>
                            {roadmap.name} Complete Roadmap
                        </h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {roadmap.overview || 'Step-by-step master guide from environment setup to production-ready architecture'}
                        </p>
                    </div>
                </div>

                {/* Overall Progress Progress Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px', flex: '1', maxWidth: '340px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Mastery Progress</span>
                        <span style={{ color: '#34d399' }}>{completedCount}/{totalTopicsCount} Topics ({roadmapProgressPct}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${roadmapProgressPct}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #a855f7, #10b981)',
                            borderRadius: '4px',
                            transition: 'width 0.3s ease',
                        }} />
                    </div>
                </div>
            </div>

            {/* Phase 0: Prerequisites & Environment Setup Guide */}
            {roadmap.setupGuide && (
                <div style={{
                    padding: '24px',
                    borderRadius: '16px',
                    background: 'var(--bg-elevated-1)',
                    border: '1.5px solid rgba(59, 130, 246, 0.35)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '38px', height: '38px', borderRadius: '10px',
                                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '18px', flexShrink: 0
                            }}>
                                ⚡
                            </div>
                            <div>
                                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff' }}>
                                    Phase 0: Environment Setup & Getting Started
                                </h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Install dependencies, configure runtime, and run your first working code
                                </p>
                            </div>
                        </div>

                        {roadmap.playground && (
                            <a
                                href={roadmap.playground.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    background: 'rgba(56, 189, 248, 0.15)',
                                    border: '1px solid rgba(56, 189, 248, 0.3)',
                                    color: '#38bdf8',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <Terminal size={14} />
                                <span>{roadmap.playground.name}</span>
                                <ExternalLink size={12} />
                            </a>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                        {/* Prerequisites & Commands */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                                    Required Tools to Install:
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {(roadmap.setupGuide.prerequisites || []).map((req, idx) => (
                                        <span key={idx} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '8px', background: 'var(--bg-elevated-2)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-primary)' }}>
                                            ✓ {req}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {roadmap.setupGuide.installCommands && (
                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                                        Terminal Setup Commands:
                                    </div>
                                    <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'Fira Code', monospace", fontSize: '12.5px', color: '#38bdf8' }}>
                                        {roadmap.setupGuide.installCommands.map((cmd, idx) => (
                                            <div key={idx} style={{ lineHeight: 1.5 }}>$ {cmd}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Hello World Starter Code */}
                        {roadmap.setupGuide.helloWorldCode && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        First "Hello World" Code:
                                    </span>
                                    <button
                                        onClick={handleCopyHelloWorld}
                                        style={{
                                            padding: '3px 10px',
                                            borderRadius: '6px',
                                            background: copiedHello ? '#10b981' : 'rgba(255,255,255,0.08)',
                                            border: 'none',
                                            color: '#fff',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                        }}
                                    >
                                        {copiedHello ? <Check size={11} /> : <Copy size={11} />}
                                        {copiedHello ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                                <pre style={{
                                    margin: 0,
                                    padding: '14px',
                                    borderRadius: '10px',
                                    background: '#0d1117',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    fontFamily: "'Fira Code', monospace",
                                    fontSize: '12.5px',
                                    lineHeight: 1.5,
                                    color: '#34d399',
                                    overflowX: 'auto',
                                    flex: 1,
                                }}>
                                    <code>{roadmap.setupGuide.helloWorldCode}</code>
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Progressive Phases 1 to 4 */}
            {roadmap.phases.map((phase, i) => {
                const color = phaseColors[i % phaseColors.length];
                const phaseTopics = phase.topics || [];
                const phaseDoneCount = phaseTopics.filter(t => completedTopics[typeof t === 'string' ? t : t.name]).length;
                const isPhaseAllDone = phaseTopics.length > 0 && phaseDoneCount === phaseTopics.length;

                return (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <div style={{
                            background: 'var(--bg-elevated-1)',
                            borderRadius: '16px',
                            padding: '24px',
                            borderLeft: `4px solid ${color}`,
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                        }}>
                            {/* Phase Title & Duration */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{
                                        width: '46px', height: '46px', borderRadius: '12px',
                                        background: `${color}22`, display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontSize: '22px', flexShrink: 0,
                                    }}>
                                        {phaseEmojis[i % phaseEmojis.length]}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                                                {phase.title}
                                            </h3>
                                            {isPhaseAllDone && (
                                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '10px' }}>
                                                    ✓ Phase Mastered
                                                </span>
                                            )}
                                        </div>
                                        {phase.goal && (
                                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                🎯 {phase.goal}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 800, background: `${color}1A`, color, border: `1px solid ${color}44` }}>
                                        ⏱️ {phase.duration} ({phaseDoneCount}/{phaseTopics.length} Done)
                                    </span>
                                </div>
                            </div>

                            {/* Topics Grid with Checkboxes & Guide Launchers */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Topics (Check to mark complete • Click for guide & code):
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#c084fc', fontWeight: 700 }}>
                                        💡 Click title for full guide
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {phaseTopics.map((topic, j) => {
                                        const topicName = typeof topic === 'string' ? topic : topic.name;
                                        const isDone = !!completedTopics[topicName];

                                        return (
                                            <div
                                                key={j}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    borderRadius: '10px',
                                                    background: isDone ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-elevated-2)',
                                                    border: isDone ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                                                    overflow: 'hidden',
                                                    transition: 'all 0.15s ease',
                                                }}
                                            >
                                                {/* Checkbox Toggle Button */}
                                                <button
                                                    onClick={(e) => toggleTopicComplete(topicName, e)}
                                                    title={isDone ? 'Mark Incomplete' : 'Mark Completed'}
                                                    style={{
                                                        padding: '8px 10px',
                                                        background: isDone ? '#10b981' : 'rgba(255,255,255,0.05)',
                                                        border: 'none',
                                                        borderRight: '1px solid rgba(255,255,255,0.06)',
                                                        color: isDone ? '#000' : 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    {isDone ? <Check size={14} strokeWidth={3} /> : <Circle size={14} />}
                                                </button>

                                                {/* Topic Guide Click Button */}
                                                <button
                                                    onClick={() => handleTopicClick(topic)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                                                        textDecoration: isDone ? 'line-through' : 'none',
                                                        fontSize: '13px',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                    }}
                                                >
                                                    <span>💡 {topicName}</span>
                                                    <span style={{ fontSize: '10px', color: color, fontWeight: 800 }}>Guide →</span>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Learning Resources */}
                            {phase.resources?.length > 0 && (
                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                                        Curated Video & Course Resources:
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {phase.resources.map((res, j) => {
                                            const s = getResourceStyle(res.type);
                                            const Icon = s.icon;
                                            return (
                                                <a
                                                    key={j}
                                                    href={res.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        padding: '12px 16px',
                                                        borderRadius: '10px',
                                                        background: s.bg,
                                                        border: `1px solid ${s.border}`,
                                                        color: 'var(--text-primary)',
                                                        fontSize: '13.5px',
                                                        fontWeight: 700,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: '12px',
                                                        textDecoration: 'none',
                                                        transition: 'background 0.15s ease',
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = s.hoverBg}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = s.bg}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                                        <Icon size={16} color={s.iconColor} style={{ flexShrink: 0 }} />
                                                        <span>{res.title}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                        {res.channel && (
                                                            <span style={{ fontSize: '11px', fontWeight: 800, color: s.badgeColor, padding: '2px 8px', borderRadius: '10px', background: `${s.badgeColor}22` }}>
                                                                {res.channel}
                                                            </span>
                                                        )}
                                                        <ExternalLink size={13} color="var(--text-muted)" />
                                                    </div>
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Hands-on Portfolio Projects */}
                            {phase.projects?.length > 0 && (
                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                                        Hands-On Portfolio Projects:
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {phase.projects.map((project, j) => {
                                            const isObj = typeof project === 'object' && project !== null;
                                            const name = isObj ? project.name : project;
                                            const desc = isObj ? project.desc : 'Build and deploy a functional project to showcase on your CV';
                                            const url = isObj ? project.youtubeUrl : null;
                                            const diff = isObj ? project.difficulty : 'Hands-on';

                                            return (
                                                <div
                                                    key={j}
                                                    style={{
                                                        padding: '14px 18px',
                                                        borderRadius: '12px',
                                                        background: 'rgba(16, 185, 129, 0.06)',
                                                        border: '1px solid rgba(16, 185, 129, 0.25)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        flexWrap: 'wrap',
                                                        gap: '12px',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '240px' }}>
                                                        <div style={{
                                                            width: '38px', height: '38px', borderRadius: '10px',
                                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '18px', flexShrink: 0
                                                        }}>
                                                            💻
                                                        </div>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                                                                    {name}
                                                                </span>
                                                                {diff && (
                                                                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#34d399', padding: '1px 6px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)' }}>
                                                                        {diff}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                                {desc}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {url && (
                                                        <a
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                padding: '8px 14px',
                                                                borderRadius: '8px',
                                                                background: '#ef4444',
                                                                color: '#fff',
                                                                fontSize: '12px',
                                                                fontWeight: 800,
                                                                textDecoration: 'none',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            <Play size={13} fill="#fff" />
                                                            <span>Watch Build Tutorial</span>
                                                            <ExternalLink size={12} />
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Phase Knowledge Check Quiz Button */}
                            <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <button
                                    onClick={() => setActiveQuizPhase(phase)}
                                    style={{
                                        padding: '10px 18px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.15))',
                                        border: '1px solid rgba(251, 191, 36, 0.4)',
                                        color: '#fbbf24',
                                        fontSize: '13px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(251, 191, 36, 0.25), rgba(245, 158, 11, 0.25))'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.15))'}
                                >
                                    <HelpCircle size={15} />
                                    <span>🧠 Take Phase {phase.phase} Knowledge Check Quiz</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
