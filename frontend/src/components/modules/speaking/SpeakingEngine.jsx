import { useState, useEffect, useRef } from 'react';
import { useSpeechRecognition } from '../../../hooks/useSpeechRecognition';
import { speakingService } from '../../../services/speakingService';
import FeedbackCard from './FeedbackCard';
import ReadingEngine from './ReadingEngine';
import ConversationEngine from './ConversationEngine';
import ModelSelector, { DEFAULT_MODELS } from '../../common/ModelSelector';
import { Mic, MicOff, RotateCcw, Send, Sparkles, BookOpen, MessageSquare, Bot, RefreshCw, Lightbulb, CheckSquare, Bookmark, Volume2, Clock, Activity, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const cardStyle = {
    background: 'var(--bg-elevated-1)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxSizing: 'border-box',
    width: '100%',
};

const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: '#121212',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Figtree', sans-serif",
    transition: 'border 0.2s ease',
    marginBottom: '16px',
};

const btnPrimary = (disabled = false) => ({
    width: '100%',
    padding: '14px 20px',
    borderRadius: '12px',
    background: disabled ? 'rgba(255, 255, 255, 0.06)' : 'var(--accent, #1ed760)',
    color: disabled ? 'var(--text-muted)' : '#000',
    fontSize: '13px',
    fontWeight: 800,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
});

// ── Mode Selector ────────────────────────────────────────────────────────────

const MODES = [
    {
        id: 'conversation',
        emoji: '🤖',
        label: 'AI Voice Partner',
        sublabel: 'Interactive 2-way interview & chat',
        color: '#a855f7',
    },
    {
        id: 'speaking',
        emoji: '🎤',
        label: 'Free Speaking',
        sublabel: 'Impromptu topic drills & grading',
        color: '#1ed760',
    },
    {
        id: 'reading',
        emoji: '📖',
        label: 'Reading Aloud',
        sublabel: 'Pronunciation & accent accuracy',
        color: '#60a5fa',
    },
];

function ModeSelector({ mode, setMode }) {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
            marginBottom: '4px',
            width: '100%',
        }}>
            {MODES.map(m => {
                const isActive = mode === m.id;
                return (
                    <div
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        style={{
                            padding: '14px 12px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            background: isActive ? `${m.color}18` : 'rgba(255, 255, 255, 0.03)',
                            border: `1.5px solid ${isActive ? m.color : 'rgba(255, 255, 255, 0.06)'}`,
                            textAlign: 'center',
                            transition: 'all 0.18s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <div style={{ fontSize: '24px', marginBottom: '4px' }}>{m.emoji}</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: isActive ? m.color : '#fff', lineHeight: 1.2 }}>
                            {m.label}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.2 }}>
                            {m.sublabel}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Free Speaking Engine ────────────────────────────────────────────────────

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
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    const {
        transcript,
        interimTranscript,
        isListening,
        startListening,
        stopListening,
        resetTranscript,
        setTranscript,
        audioMetrics,
        isTranscribingAudio,
        refineWithWhisper,
        error: micError,
    } = useSpeechRecognition();

    const [startTime, setStartTime] = useState(null);
    const timerRef = useRef(null);

    // Recording timer
    useEffect(() => {
        if (phase === 'record' && isListening) {
            timerRef.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [phase, isListening]);

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

    const handleStartRecording = () => {
        resetTranscript();
        setElapsedSeconds(0);
        setStartTime(Date.now());
        startListening();
        setPhase('record');
    };

    const handleManualWhisperTranscribe = async () => {
        if (refineWithWhisper) {
            const whisperText = await refineWithWhisper();
            if (whisperText) {
                setTranscript(whisperText);
            }
        }
    };

    const handleSubmitSpeech = async () => {
        const duration = Math.max(1, Math.round((Date.now() - (startTime || Date.now())) / 1000));
        stopListening();
        setLoading(true);

        let activeSpokenText = `${transcript} ${interimTranscript}`.trim();

        // If no text was captured by Web Speech, auto-transcribe with Whisper AI
        if (!activeSpokenText && refineWithWhisper) {
            try {
                const whisperText = await refineWithWhisper();
                if (whisperText) {
                    activeSpokenText = whisperText.trim();
                    setTranscript(whisperText);
                }
            } catch (wErr) {
                console.warn('[FREE-SPEAK] Whisper auto-refine notice:', wErr);
            }
        }

        if (!activeSpokenText) {
            alert('No speech was detected. Please check your microphone and speak clearly, or try again.');
            setLoading(false);
            return;
        }

        try {
            const result = await speakingService.evaluateSpeech({
                topic,
                transcript: activeSpokenText,
                duration,
                model: selectedModel
            });
            setEvaluation(result.evaluation);
            setPhase('result');
        } catch (err) {
            console.error('[SPEAKING] Speech evaluation error:', err);
            alert('Evaluation failed. Please check your connection and try again.');
            setPhase('record');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        stopListening();
        setPhase('input');
        setTopic('');
        setExplanation('');
        setBreakdown(null);
        setEvaluation(null);
        setElapsedSeconds(0);
        resetTranscript();
    };

    const formatTimer = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const activeModelObj = DEFAULT_MODELS.find(m => m.id === selectedModel) || DEFAULT_MODELS[0];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
            {/* Mic Error Banner */}
            {micError && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#fca5a5',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <strong>Microphone Notice:</strong> {micError}
                    </div>
                </div>
            )}

            <AnimatePresence mode="wait">
                {/* ── PHASE 1: INPUT TOPIC & SETTINGS ── */}
                {phase === 'input' && (
                    <motion.div key="input" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '10px',
                                    background: 'rgba(30, 215, 96, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Sparkles size={20} color="var(--accent, #1ed760)" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#fff' }}>
                                        Choose Your Topic & AI Coach
                                    </h3>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                                        Structured briefings for technical & communication practice
                                    </p>
                                </div>
                            </div>

                            {/* Preferred Model Bar */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    ⚡ Preferred AI Model
                                </label>
                                <ModelSelector
                                    selectedModel={selectedModel}
                                    onSelectModel={(m) => setSelectedModel(m)}
                                />
                            </div>

                            {/* Perspective Angle Selector */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    🎯 Pedagogical Angle
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {ANGLES_LIST.map((a) => {
                                        const isSelected = selectedAngle === a.id;
                                        return (
                                            <button
                                                key={a.id}
                                                type="button"
                                                onClick={() => setSelectedAngle(a.id)}
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    background: isSelected ? 'var(--accent, #1ed760)' : 'rgba(255, 255, 255, 0.04)',
                                                    color: isSelected ? '#000' : 'var(--text-secondary)',
                                                    border: `1px solid ${isSelected ? 'var(--accent, #1ed760)' : 'rgba(255, 255, 255, 0.08)'}`,
                                                    transition: 'all 0.15s ease',
                                                    flex: '1 1 auto',
                                                    textAlign: 'center',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {a.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Input Field */}
                            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                ✍️ Enter Any Topic
                            </label>
                            <input
                                placeholder="e.g. Distributed Caching, System Design, Public Speaking..."
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGetExplanation()}
                                style={inputStyle}
                            />

                            <button
                                onClick={() => handleGetExplanation()}
                                disabled={!topic.trim() || loading}
                                style={btnPrimary(!topic.trim() || loading)}
                            >
                                {loading ? '✨ Synthesizing In-Depth Briefing...' : '🚀 Generate Topic Briefing'}
                            </button>
                        </div>

                        {/* Popular Topics List */}
                        <div style={{ ...cardStyle, marginTop: '12px' }}>
                            <p className="label-caps" style={{ marginBottom: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                💡 Popular Deep-Dive Topics
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {[
                                    'Distributed Systems & Redis',
                                    'Microservices Architecture',
                                    'Emotional Intelligence & Leadership',
                                    'Deep Learning Transformers',
                                    'Database Sharding & Indexing',
                                    'Persuasive Negotiation Skills',
                                    'Kubernetes Pod Scheduling'
                                ].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTopic(t)}
                                        style={{
                                            padding: '7px 12px',
                                            borderRadius: '20px',
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            color: 'var(--text-primary)',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent, #1ed760)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; }}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ── PHASE 2: EXPLAIN & BRIEFING ── */}
                {phase === 'explain' && (
                    <motion.div key="explain" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                        <div style={cardStyle}>
                            {/* Header Bar */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '200px', flex: '1 1 auto' }}>
                                    <BookOpen size={22} color="#60a5fa" style={{ flexShrink: 0 }} />
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#fff' }}>
                                                📚 {topic}
                                            </h3>
                                            <span style={{
                                                fontSize: '10.5px', fontWeight: 800, padding: '2px 7px', borderRadius: '6px',
                                                background: `${activeModelObj.color}22`, color: activeModelObj.color, border: `1px solid ${activeModelObj.color}44`
                                            }}>
                                                ⚡ {activeModelObj.name}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                                            Study this briefing, then articulate your answer in speech
                                        </p>
                                    </div>
                                </div>

                                {/* Regenerate Button */}
                                <button
                                    onClick={() => handleGetExplanation(null, true)}
                                    disabled={loading}
                                    style={{
                                        padding: '7px 12px',
                                        borderRadius: '8px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        color: 'var(--text-primary)',
                                        fontSize: '11.5px',
                                        fontWeight: 700,
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                                    <span>{loading ? 'Generating...' : '🎲 Fresh Words'}</span>
                                </button>
                            </div>

                            {/* Perspective Tabs for Quick Switch */}
                            <div style={{
                                display: 'flex',
                                gap: '6px',
                                marginBottom: '16px',
                                overflowX: 'auto',
                                paddingBottom: '4px',
                                WebkitOverflowScrolling: 'touch',
                            }}>
                                {ANGLES_LIST.map(a => {
                                    const isCurrent = (breakdown?.angle === a.id || selectedAngle === a.id);
                                    return (
                                        <button
                                            key={a.id}
                                            onClick={() => {
                                                setSelectedAngle(a.id);
                                                handleGetExplanation(a.id, true);
                                            }}
                                            style={{
                                                padding: '6px 10px',
                                                borderRadius: '8px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                whiteSpace: 'nowrap',
                                                cursor: 'pointer',
                                                background: isCurrent ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                                color: isCurrent ? '#60a5fa' : 'var(--text-secondary)',
                                                border: `1px solid ${isCurrent ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)'}`,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {a.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Content Breakdown */}
                            {breakdown ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
                                    {/* Core Overview */}
                                    <div style={{ background: '#121212', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                        <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#60a5fa', marginBottom: '6px' }}>
                                            📌 1. Core Overview
                                        </h4>
                                        <p style={{ color: 'var(--text-primary)', lineHeight: 1.6, fontSize: '13.5px', margin: 0 }}>
                                            {breakdown.summary}
                                        </p>
                                    </div>

                                    {/* Deep-Dive Mechanics */}
                                    <div style={{ background: '#121212', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                        <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#a855f7', marginBottom: '6px' }}>
                                            🔍 2. Deep-Dive Mechanics
                                        </h4>
                                        <p style={{ color: 'var(--text-primary)', lineHeight: 1.65, fontSize: '13.5px', margin: 0 }}>
                                            {breakdown.detailedExplanation}
                                        </p>
                                    </div>

                                    {/* Why It Matters & Case Study Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                                        {breakdown.whyItMatters && (
                                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                                <h4 style={{ fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', color: '#10b981', marginBottom: '4px' }}>
                                                    💡 Why It Matters
                                                </h4>
                                                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '12.5px', margin: 0 }}>
                                                    {breakdown.whyItMatters}
                                                </p>
                                            </div>
                                        )}
                                        {breakdown.realWorldExample && (
                                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                                <h4 style={{ fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', color: '#f59e0b', marginBottom: '4px' }}>
                                                    🏢 Real-World Case Study
                                                </h4>
                                                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '12.5px', margin: 0 }}>
                                                    {breakdown.realWorldExample}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Talking Points */}
                                    {breakdown.talkingPoints && breakdown.talkingPoints.length > 0 && (
                                        <div style={{ background: 'rgba(30, 215, 96, 0.05)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(30, 215, 96, 0.2)' }}>
                                            <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent, #1ed760)', marginBottom: '8px' }}>
                                                🗣️ Key Talking Points To Articulate
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {breakdown.talkingPoints.map((tp, idx) => (
                                                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                                        <span style={{ color: 'var(--accent, #1ed760)', fontWeight: 800, fontSize: '12px' }}>•</span>
                                                        <span style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: 1.45 }}>{tp}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Key Vocabulary */}
                                    {breakdown.keyVocabulary && breakdown.keyVocabulary.length > 0 && (
                                        <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                            <h4 style={{ fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                                💎 High-Value Vocabulary
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                                                {breakdown.keyVocabulary.map((v, i) => (
                                                    <div key={i} style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '8px 10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                                                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '12.5px' }}>{v.word}</span>
                                                            {v.phonetic && <span style={{ fontSize: '10px', color: '#a855f7', fontStyle: 'italic' }}>{v.phonetic}</span>}
                                                        </div>
                                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>{v.definition}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ background: '#121212', borderRadius: '12px', padding: '16px', marginBottom: '18px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                    <p style={{ color: 'var(--text-primary)', lineHeight: 1.65, fontSize: '14px', whiteSpace: 'pre-line', margin: 0 }}>{explanation}</p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={handleStartRecording}
                                    style={{
                                        ...btnPrimary(),
                                        background: 'var(--success, #10b981)',
                                        flex: '2 1 180px',
                                    }}
                                >
                                    🎙️ Start Speaking Practice
                                </button>
                                <button
                                    onClick={() => handleReset()}
                                    style={{
                                        flex: '1 1 120px',
                                        padding: '14px',
                                        borderRadius: '12px',
                                        background: 'transparent',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                    }}
                                >
                                    ✏️ New Topic
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ── PHASE 3: RECORDING STUDIO ── */}
                {phase === 'record' && (
                    <motion.div key="record" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                        <div style={{ ...cardStyle, textAlign: 'center' }}>
                            {/* Live Mic Circle with Sound Wave Ring */}
                            <div style={{
                                width: '80px',
                                height: '80px',
                                margin: '0 auto 16px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isListening ? '#ef4444' : 'rgba(255, 255, 255, 0.08)',
                                boxShadow: isListening ? '0 0 24px rgba(239, 68, 68, 0.5)' : 'none',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer',
                            }}
                                onClick={isListening ? stopListening : startListening}
                                title={isListening ? 'Click to pause' : 'Click to resume mic'}
                            >
                                {isListening ? <Mic size={34} color="#fff" className="animate-pulse" /> : <MicOff size={34} color="var(--text-muted)" />}
                            </div>

                            {/* Status and Timer */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{
                                    width: '8px', height: '8px', borderRadius: '50%',
                                    background: isListening ? '#ef4444' : 'var(--text-muted)',
                                    display: 'inline-block'
                                }} />
                                <span style={{ fontSize: '15px', fontWeight: 800, color: isListening ? '#ef4444' : 'var(--text-secondary)' }}>
                                    {isListening ? 'Microphone Active — Speak Now' : 'Microphone Paused'}
                                </span>
                            </div>

                            {/* Live Soundwave Frequency Equalizer */}
                            {isListening && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '24px', margin: '10px 0' }}>
                                    {(audioMetrics.frequencies || [0,0,0,0,0,0,0,0,0,0,0,0]).slice(0, 14).map((f, idx) => {
                                        const h = Math.max(3, Math.min(22, Math.round((f / 255) * 22)));
                                        return (
                                            <div
                                                key={idx}
                                                style={{
                                                    width: '3px',
                                                    height: `${h}px`,
                                                    borderRadius: '2px',
                                                    background: audioMetrics.isSpeechActive ? '#10b981' : '#f87171',
                                                    transition: 'height 0.06s ease'
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            )}

                            {/* Timer and Metrics Bar */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={13} />
                                    <strong style={{ color: '#fff' }}>{formatTimer(elapsedSeconds)}</strong>
                                </span>
                                <span>Volume: <strong style={{ color: '#fff' }}>{audioMetrics.rmsDb > -70 ? `${audioMetrics.rmsDb} dB` : 'Ready'}</strong></span>
                            </div>

                            {/* Real-Time Spoken Speech Output Box */}
                            <div style={{
                                background: '#121212',
                                borderRadius: '12px',
                                padding: '16px',
                                textAlign: 'left',
                                minHeight: '90px',
                                maxHeight: '180px',
                                overflowY: 'auto',
                                marginBottom: '16px',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                fontSize: '14px',
                                lineHeight: 1.6,
                            }}>
                                <span style={{ color: 'var(--text-primary)' }}>{transcript} </span>
                                <span style={{ color: '#fca5a5', fontStyle: 'italic' }}>{interimTranscript}</span>
                                {!transcript && !interimTranscript && (
                                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
                                        Your spoken speech will appear here in real-time. If quiet, Whisper AI will transcribe on submit...
                                    </span>
                                )}
                            </div>

                            {/* AI Whisper Transcribing indicator */}
                            {isTranscribingAudio && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#34d399', fontSize: '13px', marginBottom: '12px' }}>
                                    <RefreshCw size={15} className="animate-spin" />
                                    <span>Processing audio with Whisper AI...</span>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => resetTranscript()}
                                    style={{
                                        flex: '1 1 100px',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        background: 'transparent',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                    }}
                                >
                                    <RotateCcw size={14} /> Reset
                                </button>

                                {isListening && !transcript && (
                                    <button
                                        onClick={handleManualWhisperTranscribe}
                                        disabled={isTranscribingAudio}
                                        style={{
                                            flex: '1 1 140px',
                                            padding: '12px',
                                            borderRadius: '12px',
                                            background: 'rgba(168, 85, 247, 0.15)',
                                            border: '1px solid #a855f7',
                                            color: '#c084fc',
                                            fontSize: '12.5px',
                                            fontWeight: 800,
                                            cursor: isTranscribingAudio ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        🎙️ Whisper Transcribe
                                    </button>
                                )}

                                <button
                                    onClick={handleSubmitSpeech}
                                    disabled={loading || isTranscribingAudio}
                                    style={{
                                        ...btnPrimary(loading || isTranscribingAudio),
                                        flex: '2 1 160px',
                                        background: 'var(--accent, #1ed760)',
                                    }}
                                >
                                    <Send size={14} /> {loading ? 'Evaluating...' : 'Submit & Evaluate'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ── PHASE 4: RESULT & FEEDBACK ── */}
                {phase === 'result' && evaluation && (
                    <motion.div key="result" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                        <FeedbackCard evaluation={evaluation} topic={topic} transcript={transcript} />
                        <button
                            onClick={handleReset}
                            style={{
                                ...btnPrimary(),
                                marginTop: '16px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#fff',
                            }}
                        >
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
            {/* Mode Selector Header */}
            <div style={{
                background: 'var(--bg-elevated-1)',
                borderRadius: '16px',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxSizing: 'border-box',
                width: '100%',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <MessageSquare size={17} color="var(--accent, #1ed760)" />
                    <div>
                        <h3 style={{ fontSize: '14.5px', fontWeight: 800, margin: 0, color: '#fff' }}>🎙️ Speaking Studio</h3>
                        <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '1px 0 0' }}>Select your training mode</p>
                    </div>
                </div>
                <ModeSelector mode={mode} setMode={setMode} />
            </div>

            {/* Engine */}
            <AnimatePresence mode="wait">
                {mode === 'conversation' && (
                    <motion.div key="conversation" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                        <ConversationEngine />
                    </motion.div>
                )}
                {mode === 'reading' && (
                    <motion.div key="reading" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                        <ReadingEngine />
                    </motion.div>
                )}
                {mode === 'speaking' && (
                    <motion.div key="speaking" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                        <FreeSpeakingEngine />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
