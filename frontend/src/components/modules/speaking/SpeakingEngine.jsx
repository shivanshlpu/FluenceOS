import { useState } from 'react';
import { useSpeechRecognition } from '../../../hooks/useSpeechRecognition';
import { speakingService } from '../../../services/speakingService';
import FeedbackCard from './FeedbackCard';
import ReadingEngine from './ReadingEngine';
import ConversationEngine from './ConversationEngine';
import { Mic, MicOff, RotateCcw, Send, Sparkles, BookOpen, MessageSquare, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const cardStyle = {
    background: 'var(--bg-elevated-1)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
};

const inputStyle = {
    width: '100%', padding: '14px 16px',
    background: 'var(--bg-surface)', border: '1px solid transparent',
    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    fontFamily: "'Figtree', sans-serif",
    transition: 'border var(--transition-fast)',
    marginBottom: '16px',
};

const btnPrimary = (disabled = false) => ({
    width: '100%', padding: '14px',
    borderRadius: 'var(--radius-pill)',
    background: disabled ? 'var(--bg-elevated-3)' : 'var(--accent)',
    color: disabled ? 'var(--text-muted)' : '#fff',
    fontSize: '13px', fontWeight: 700, letterSpacing: '1.5px',
    textTransform: 'uppercase',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '8px',
    transition: 'all var(--transition-fast)',
    fontFamily: "'Figtree', sans-serif",
});

// ── Mode Selector ────────────────────────────────────────────────────────────

const MODES = [
    {
        id: 'conversation',
        emoji: '🤖',
        label: 'AI Voice Partner',
        sublabel: 'Interactive 2-way voice chat with real-time feedback',
        color: '#a855f7',
    },
    {
        id: 'speaking',
        emoji: '🎤',
        label: 'Free Speaking',
        sublabel: 'Impromptu topic drills with grading report',
        color: '#1ed760',
    },
    {
        id: 'reading',
        emoji: '📖',
        label: 'Reading Aloud',
        sublabel: 'Pronunciation & accuracy practice',
        color: '#60a5fa',
    },
];

function ModeSelector({ mode, setMode }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '4px' }}>
            {MODES.map(m => (
                <div
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    style={{
                        padding: '18px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        background: mode === m.id ? `${m.color}14` : 'var(--bg-elevated-1)',
                        border: `2px solid ${mode === m.id ? m.color : 'transparent'}`,
                        textAlign: 'center', transition: 'all 0.18s',
                    }}
                >
                    <div style={{ fontSize: '26px', marginBottom: '6px' }}>{m.emoji}</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: mode === m.id ? m.color : 'var(--text-primary)' }}>{m.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{m.sublabel}</div>
                </div>
            ))}
        </div>
    );
}

// ── Free Speaking Engine (existing logic) ────────────────────────────────────

import ModelSelector, { DEFAULT_MODELS } from '../../common/ModelSelector';
import { RefreshCw, Lightbulb, CheckSquare, Bookmark, Volume2 } from 'lucide-react';

const ANGLES_LIST = [
    { id: 'architectural', label: '🏗️ Deep Mechanics', emoji: '🏗️' },
    { id: 'analogy', label: '💡 Intuitive Analogy', emoji: '💡' },
    { id: 'tradeoffs', label: '⚖️ Trade-offs & Impact', emoji: '⚖️' },
    { id: 'interview', label: '🎯 Interview Pitch', emoji: '🎯' },
];

function FreeSpeakingEngine() {
    const [topic, setTopic] = useState('');
    const [explanation, setExplanation] = useState('');
    const [breakdown, setBreakdown] = useState(null);
    const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('preferred_ai_model') || 'auto');
    const [selectedAngle, setSelectedAngle] = useState('architectural');
    const [evaluation, setEvaluation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [phase, setPhase] = useState('input');
    const { transcript, interimTranscript, isListening, startListening, stopListening, resetTranscript } = useSpeechRecognition();
    const [startTime, setStartTime] = useState(null);

    const handleGetExplanation = async (overrideAngle = null, forceNewSeed = false) => {
        if (!topic.trim()) return;
        setLoading(true);
        const targetAngle = overrideAngle || selectedAngle;
        const seed = forceNewSeed ? Date.now() : null;

        try {
            const data = await speakingService.getTopicExplanation(topic, selectedModel, targetAngle, seed);
            if (data && data.breakdown) {
                setBreakdown(data.breakdown);
                setExplanation(data.explanation || data.breakdown.detailedExplanation);
            } else if (data && data.explanation) {
                setExplanation(data.explanation);
                setBreakdown(null);
            }
            setPhase('explain');
        } catch (err) {
            console.warn('[SPEAKING] Topic fetch notice:', err);
            setExplanation(`### 📌 Core Overview\n${topic} is an essential discipline combining conceptual depth with practical problem solving.\n\n### 🔍 Deep-Dive Analysis\nWhen exploring ${topic}, analyzing core principles and trade-offs ensures effective technical execution and articulate communication.`);
            setBreakdown(null);
            setPhase('explain');
        } finally {
            setLoading(false);
        }
    };

    const handleStartRecording = () => { resetTranscript(); setStartTime(Date.now()); startListening(); setPhase('record'); };

    const handleSubmitSpeech = async () => {
        const duration = Math.round((Date.now() - startTime) / 1000);
        stopListening(); setLoading(true);
        try {
            const result = await speakingService.evaluateSpeech({ topic, transcript, duration, model: selectedModel });
            setEvaluation(result.evaluation);
        } catch (err) {
            alert('Evaluation failed. Please check your connection and try again.');
            setPhase('record'); setLoading(false); return;
        }
        setPhase('result'); setLoading(false);
    };

    const handleReset = () => { setPhase('input'); setTopic(''); setExplanation(''); setBreakdown(null); setEvaluation(null); resetTranscript(); };

    const activeModelObj = DEFAULT_MODELS.find(m => m.id === selectedModel) || DEFAULT_MODELS[0];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <AnimatePresence mode="wait">
                {phase === 'input' && (
                    <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        {/* Topic Input Card */}
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Sparkles size={20} color="var(--accent)" />
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Choose Your Topic & AI Engine</h3>
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Deep multi-paragraph briefings for technical & non-technical topics</p>
                                    </div>
                                </div>
                            </div>

                            {/* Model Selector Bar */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    ⚡ Preferred AI Model
                                </label>
                                <ModelSelector
                                    selectedModel={selectedModel}
                                    onSelectModel={(m) => setSelectedModel(m)}
                                />
                            </div>

                            {/* Perspective Angle Selector */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    🎯 Pedagogical Angle
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                                    {ANGLES_LIST.map((a) => (
                                        <button
                                            key={a.id}
                                            type="button"
                                            onClick={() => setSelectedAngle(a.id)}
                                            style={{
                                                padding: '8px 10px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                background: selectedAngle === a.id ? 'var(--accent)' : 'rgba(255, 255, 255, 0.05)',
                                                color: selectedAngle === a.id ? '#fff' : 'var(--text-secondary)',
                                                border: `1px solid ${selectedAngle === a.id ? 'var(--accent)' : 'rgba(255, 255, 255, 0.1)'}`,
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {a.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Input Field */}
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                ✍️ Enter Any Topic
                            </label>
                            <input
                                placeholder="e.g. Docker Containers, Quantum Computing, Public Speaking, Leadership..."
                                value={topic} onChange={(e) => setTopic(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGetExplanation()}
                                style={inputStyle}
                                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                onBlur={(e) => e.target.style.borderColor = 'transparent'}
                            />

                            <button onClick={() => handleGetExplanation()} disabled={!topic.trim() || loading} style={btnPrimary(!topic.trim() || loading)}>
                                {loading ? '✨ Synthesizing In-Depth Briefing...' : '🚀 Generate Deep Topic Briefing'}
                            </button>
                        </div>

                        {/* Popular Topics List */}
                        <div style={{ ...cardStyle, marginTop: '12px' }}>
                            <p className="label-caps" style={{ marginBottom: '12px' }}>💡 Popular Deep-Dive Topics</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {[
                                    'Distributed Systems & Redis',
                                    'Microservices Architecture',
                                    'Emotional Intelligence & Leadership',
                                    'Deep Learning Transformers',
                                    'Database Sharding & Indexing',
                                    'Persuasive Negotiation Skills',
                                    'Zero-Knowledge Proofs',
                                    'Kubernetes Pod Scheduling'
                                ].map((t) => (
                                    <button key={t} onClick={() => setTopic(t)} style={{
                                        padding: '8px 14px', borderRadius: 'var(--radius-pill)',
                                        background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: 'var(--text-primary)', fontSize: '12.5px', fontWeight: 600,
                                        cursor: 'pointer', transition: 'all var(--transition-fast)',
                                    }}
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; }}
                                    >{t}</button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {phase === 'explain' && (
                    <motion.div key="explain" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <div style={cardStyle}>
                            {/* Header Bar */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <BookOpen size={24} color="var(--info, #60a5fa)" />
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>📚 Topic Briefing: {topic}</h3>
                                            <span style={{
                                                fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
                                                background: `${activeModelObj.color}22`, color: activeModelObj.color, border: `1px solid ${activeModelObj.color}44`
                                            }}>
                                                ⚡ {activeModelObj.name}
                                            </span>
                                            {breakdown?.angleLabel && (
                                                <span style={{
                                                    fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                                                    background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)'
                                                }}>
                                                    {breakdown.angleLabel}
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                                            Study this in-depth briefing, then speak in your own words
                                        </p>
                                    </div>
                                </div>

                                {/* Regenerate with Different Words/Angle Button */}
                                <button
                                    onClick={() => handleGetExplanation(null, true)}
                                    disabled={loading}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: '10px',
                                        background: 'rgba(255, 255, 255, 0.06)',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        color: 'var(--text-primary)',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s'
                                    }}
                                    title="Regenerate this topic with fresh vocabulary, alternative analogies, and non-repeating structure"
                                >
                                    <RefreshCw size={13} className={loading ? 'spin-icon' : ''} />
                                    {loading ? 'Generating...' : '🎲 Fresh Perspective / New Words'}
                                </button>
                            </div>

                            {/* Perspective Tabs for Instant Angle Switch */}
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                                {ANGLES_LIST.map(a => (
                                    <button
                                        key={a.id}
                                        onClick={() => {
                                            setSelectedAngle(a.id);
                                            handleGetExplanation(a.id, true);
                                        }}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            fontSize: '11.5px',
                                            fontWeight: 700,
                                            whiteSpace: 'nowrap',
                                            cursor: 'pointer',
                                            background: (breakdown?.angle === a.id || selectedAngle === a.id) ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                            color: (breakdown?.angle === a.id || selectedAngle === a.id) ? '#60a5fa' : 'var(--text-secondary)',
                                            border: `1px solid ${(breakdown?.angle === a.id || selectedAngle === a.id) ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)'}`,
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {a.label}
                                    </button>
                                ))}
                            </div>

                            {/* Detailed Content Display */}
                            {breakdown ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                                    {/* Core Overview */}
                                    <div style={{ background: 'var(--bg-surface, #121212)', borderRadius: '12px', padding: '18px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                        <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#60a5fa', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            📌 1. Core Overview
                                        </h4>
                                        <p style={{ color: 'var(--text-primary)', lineHeight: 1.7, fontSize: '14.5px', margin: 0 }}>
                                            {breakdown.summary}
                                        </p>
                                    </div>

                                    {/* Deep-Dive Analysis Paragraph */}
                                    <div style={{ background: 'var(--bg-surface, #121212)', borderRadius: '12px', padding: '18px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                        <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#a855f7', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            🔍 2. Deep-Dive Mechanics & Architecture
                                        </h4>
                                        <p style={{ color: 'var(--text-primary)', lineHeight: 1.8, fontSize: '14.5px', margin: 0 }}>
                                            {breakdown.detailedExplanation}
                                        </p>
                                    </div>

                                    {/* Why It Matters & Real-World Example Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                                        {breakdown.whyItMatters && (
                                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                                <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#10b981', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    💡 Why It Matters
                                                </h4>
                                                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '13.5px', margin: 0 }}>
                                                    {breakdown.whyItMatters}
                                                </p>
                                            </div>
                                        )}
                                        {breakdown.realWorldExample && (
                                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                                <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#f59e0b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    🏢 Real-World Case Study
                                                </h4>
                                                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '13.5px', margin: 0 }}>
                                                    {breakdown.realWorldExample}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Speaking Talking Points */}
                                    {breakdown.talkingPoints && breakdown.talkingPoints.length > 0 && (
                                        <div style={{ background: 'rgba(30, 215, 96, 0.05)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(30, 215, 96, 0.2)' }}>
                                            <h4 style={{ fontSize: '12.5px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent, #1ed760)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                🗣️ Key Talking Points To Articulate
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {breakdown.talkingPoints.map((tp, idx) => (
                                                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                                        <span style={{ color: 'var(--accent, #1ed760)', fontWeight: 800, fontSize: '13px' }}>•</span>
                                                        <span style={{ color: 'var(--text-primary)', fontSize: '13.5px', lineHeight: 1.5 }}>{tp}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Power Vocabulary & Pronunciation Tip */}
                                    {breakdown.keyVocabulary && breakdown.keyVocabulary.length > 0 && (
                                        <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                            <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                                💎 High-Value Vocabulary & Enunciation
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                                                {breakdown.keyVocabulary.map((v, i) => (
                                                    <div key={i} style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '8px 10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                                                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>{v.word}</span>
                                                            {v.phonetic && <span style={{ fontSize: '10.5px', color: '#a855f7', fontStyle: 'italic' }}>{v.phonetic}</span>}
                                                        </div>
                                                        <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '3px 0 0' }}>{v.definition}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            {breakdown.pronunciationTip && (
                                                <p style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    🎙️ <strong>Pacing Tip:</strong> {breakdown.pronunciationTip}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '20px', border: '1px solid var(--border-subtle)' }}>
                                    <p style={{ color: 'var(--text-primary)', lineHeight: 1.8, fontSize: '15px', whiteSpace: 'pre-line' }}>{explanation}</p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={handleStartRecording}
                                    style={{ ...btnPrimary(), background: 'var(--success, #10b981)', flex: 2, minWidth: '180px' }}
                                >
                                    🎙️ Start Speaking Practice
                                </button>
                                <button
                                    onClick={() => handleReset()}
                                    style={{
                                        flex: 1, minWidth: '140px', padding: '14px', borderRadius: 'var(--radius-pill)',
                                        background: 'transparent', border: '1px solid #727272', color: 'var(--text-primary)',
                                        fontSize: '13px', fontWeight: 700, cursor: 'pointer'
                                    }}
                                >
                                    ✏️ New Topic
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}


                {phase === 'record' && (
                    <motion.div key="record" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <div style={{ ...cardStyle, textAlign: 'center' }}>
                            <div style={{
                                width: '88px', height: '88px', margin: '0 auto 20px',
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isListening ? 'var(--error)' : 'var(--bg-elevated-3)',
                                boxShadow: isListening ? '0 0 0 12px rgba(241,94,108,0.15)' : 'none',
                                animation: isListening ? 'pulse-record 1.5s infinite' : 'none',
                                transition: 'all 0.3s ease',
                            }}>
                                {isListening ? <Mic size={36} color="#fff" /> : <MicOff size={36} color="var(--text-muted)" />}
                            </div>
                            <p style={{ fontSize: '14px', fontWeight: 700, color: isListening ? 'var(--error)' : 'var(--text-secondary)', marginBottom: '4px' }}>
                                {isListening ? '🔴 Recording...' : '⏹️ Stopped'}
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>Speak clearly into your microphone</p>
                            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '20px', textAlign: 'left', minHeight: '100px', marginBottom: '20px', border: '1px solid var(--border-subtle)' }}>
                                <span style={{ color: 'var(--text-primary)' }}>{transcript}</span>
                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{interimTranscript}</span>
                                {!transcript && !interimTranscript && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Your speech will appear here...</span>}
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => resetTranscript()} style={{
                                    flex: 1, padding: '12px', borderRadius: 'var(--radius-pill)',
                                    background: 'transparent', border: '1px solid #727272',
                                    color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                }}>
                                    <RotateCcw size={14} /> Reset
                                </button>
                                <button onClick={handleSubmitSpeech} disabled={!transcript || loading} style={{ ...btnPrimary(!transcript || loading), flex: 1, width: 'auto' }}>
                                    <Send size={14} /> {loading ? 'Evaluating...' : 'Submit'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {phase === 'result' && evaluation && (
                    <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <FeedbackCard evaluation={evaluation} topic={topic} transcript={transcript} />
                        <button onClick={handleReset} style={{ ...btnPrimary(), marginTop: '16px' }}>
                            🔄 Practice Another Topic
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function SpeakingEngine() {
    const [mode, setMode] = useState('conversation'); // default to conversation partner

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Mode Selector Header — always shown */}
            <div style={{
                background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '20px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <MessageSquare size={18} color="var(--accent)" />
                    <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 700 }}>🎙️ Choose Practice Mode</h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Select a mode that matches your current English level</p>
                    </div>
                </div>
                <ModeSelector mode={mode} setMode={setMode} />
            </div>

            {/* Engine */}
            <AnimatePresence mode="wait">
                {mode === 'conversation' && (
                    <motion.div key="conversation" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <ConversationEngine />
                    </motion.div>
                )}
                {mode === 'reading' && (
                    <motion.div key="reading" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <ReadingEngine />
                    </motion.div>
                )}
                {mode === 'speaking' && (
                    <motion.div key="speaking" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <FreeSpeakingEngine />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
