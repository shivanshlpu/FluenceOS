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

function FreeSpeakingEngine() {
    const [topic, setTopic] = useState('');
    const [explanation, setExplanation] = useState('');
    const [evaluation, setEvaluation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [phase, setPhase] = useState('input');
    const { transcript, interimTranscript, isListening, startListening, stopListening, resetTranscript } = useSpeechRecognition();
    const [startTime, setStartTime] = useState(null);

    const handleGetExplanation = async () => {
        if (!topic.trim()) return;
        setLoading(true);
        try {
            const data = await speakingService.getTopicExplanation(topic);
            setExplanation(data.explanation);
            setPhase('explain');
        } catch (err) {
            setExplanation(`Let's practice speaking about "${topic}". Think about what you know — key concepts, real-world examples, and why it matters.`);
            setPhase('explain');
        }
        setLoading(false);
    };

    const handleStartRecording = () => { resetTranscript(); setStartTime(Date.now()); startListening(); setPhase('record'); };

    const handleSubmitSpeech = async () => {
        const duration = Math.round((Date.now() - startTime) / 1000);
        stopListening(); setLoading(true);
        try {
            const result = await speakingService.evaluateSpeech({ topic, transcript, duration });
            setEvaluation(result.evaluation);
        } catch (err) {
            alert('Evaluation failed. Please check your connection and try again.');
            setPhase('record'); setLoading(false); return;
        }
        setPhase('result'); setLoading(false);
    };

    const handleReset = () => { setPhase('input'); setTopic(''); setExplanation(''); setEvaluation(null); resetTranscript(); };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <AnimatePresence mode="wait">
                {phase === 'input' && (
                    <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                <Sparkles size={20} color="var(--accent)" />
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Choose Your Topic</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Enter any topic to practice speaking about</p>
                                </div>
                            </div>
                            <input
                                placeholder="e.g. Machine Learning, Climate Change, Leadership..."
                                value={topic} onChange={(e) => setTopic(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGetExplanation()}
                                style={inputStyle}
                                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                onBlur={(e) => e.target.style.borderColor = 'transparent'}
                            />
                            <button onClick={handleGetExplanation} disabled={!topic.trim() || loading} style={btnPrimary(!topic.trim() || loading)}>
                                {loading ? '✨ Generating...' : '🚀 Get Topic Briefing'}
                            </button>
                        </div>
                        <div style={{ ...cardStyle, marginTop: '8px' }}>
                            <p className="label-caps" style={{ marginBottom: '12px' }}>💡 Popular Topics</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {['Artificial Intelligence', 'Climate Change', 'Remote Work', 'Blockchain', 'Mental Health', 'Space Exploration'].map((t) => (
                                    <button key={t} onClick={() => setTopic(t)} style={{
                                        padding: '8px 16px', borderRadius: 'var(--radius-pill)',
                                        background: 'transparent', border: '1px solid #727272',
                                        color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700,
                                        cursor: 'pointer', transition: 'all var(--transition-fast)',
                                    }}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--text-primary)'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#727272'}
                                    >{t}</button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {phase === 'explain' && (
                    <motion.div key="explain" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <BookOpen size={20} color="var(--info)" />
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>📚 Topic Briefing: {topic}</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Read this, then speak in your own words</p>
                                </div>
                            </div>
                            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '20px', border: '1px solid var(--border-subtle)' }}>
                                <p style={{ color: 'var(--text-primary)', lineHeight: 1.7, fontSize: '15px' }}>{explanation}</p>
                            </div>
                            <button onClick={handleStartRecording} style={{ ...btnPrimary(), background: 'var(--success)' }}>
                                🎙️ Start Speaking
                            </button>
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
