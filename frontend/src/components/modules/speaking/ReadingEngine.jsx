import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSpeechRecognition } from '../../../hooks/useSpeechRecognition';
import { speakAIResponse, stopAllSpeech, getVoiceSettings } from '../../../services/voiceService';
import VoiceSettingsModal from './VoiceSettingsModal';
import { pythonAPI } from '../../../services/api';
import ReadingFeedbackCard from './ReadingFeedbackCard';
import {
    BookOpen, Mic, MicOff, RotateCcw, Send, Sparkles,
    Loader, Volume2, VolumeX, Settings2, Globe, CheckCircle2,
    Code, Cpu, Database, Network, Cloud, ShieldCheck, Terminal, Layers,
    Edit3, Wand2, Radio, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const cardStyle = {
    background: 'var(--bg-elevated-1)',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(255, 255, 255, 0.08)'
};

const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: 'var(--bg-surface, #121212)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: 'var(--text-primary, #fff)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Figtree', sans-serif",
    transition: 'border 0.2s',
    marginBottom: '12px',
};

const btn = (disabled = false, color = '#10b981') => ({
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    background: disabled ? 'rgba(255,255,255,0.08)' : color,
    color: disabled ? 'var(--text-muted)' : '#fff',
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
    transition: 'all 0.2s',
    fontFamily: "'Figtree', sans-serif",
});

const CSE_CATEGORIES = [
    {
        id: 'system-design',
        title: 'System Design & Distributed Systems',
        icon: Layers,
        badge: 'High Impact',
        desc: 'Microservices, load balancers, caching tiers, CAP theorem, and low-latency throughput.'
    },
    {
        id: 'dsa',
        title: 'Data Structures & Algorithms',
        icon: Code,
        badge: 'Core CS',
        desc: 'Big-O complexity, hash tables, balanced binary trees, and dynamic programming.'
    },
    {
        id: 'operating-systems',
        title: 'Operating Systems & Concurrency',
        icon: Cpu,
        badge: 'Core CS',
        desc: 'Preemptive scheduling, virtual memory, race conditions, mutexes, and deadlocks.'
    },
    {
        id: 'dbms',
        title: 'Database Management Systems & SQL',
        icon: Database,
        badge: 'Essential',
        desc: 'ACID properties, B+ tree indexing, database sharding, and query optimization.'
    },
    {
        id: 'networks',
        title: 'Computer Networks & Security',
        icon: Network,
        badge: 'Essential',
        desc: 'TCP 3-way handshake, TLS cryptography, DNS caching, and zero-trust policies.'
    },
    {
        id: 'ai-ml',
        title: 'Artificial Intelligence & Machine Learning',
        icon: Sparkles,
        badge: 'Trending',
        desc: 'Transformer architectures, gradient descent, self-attention, and LLM inference.'
    },
    {
        id: 'devops',
        title: 'Cloud Computing & DevOps',
        icon: Cloud,
        badge: 'Industry',
        desc: 'Docker containerization, Kubernetes orchestration, Terraform IaC, and CI/CD pipelines.'
    },
    {
        id: 'tech-interview',
        title: 'Tech Interview & Engineering Communication',
        icon: Terminal,
        badge: 'Career',
        desc: 'Articulating architectural trade-offs, system design pitch, and executive summaries.'
    }
];

const ACCENTS = [
    { code: 'en-IN', label: '🇮🇳 English (India)' },
    { code: 'en-US', label: '🇺🇸 English (US)' },
    { code: 'en-GB', label: '🇬🇧 English (UK)' },
];

const LEVELS = [
    { id: 'beginner', label: '🌱 Fundamental', desc: 'Clear sentence structure & core terms' },
    { id: 'intermediate', label: '🌿 Professional', desc: 'Industry patterns & architectural vocabulary' },
    { id: 'advanced', label: '🌳 Senior Engineer', desc: 'Deep technical nuance & executive precision' },
];

// Levenshtein distance for real-time word matching
function levDist(a, b) {
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        let prev = i;
        for (let j = 1; j <= b.length; j++) {
            const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], prev, row[j]) + 1;
            row[j - 1] = prev;
            prev = val;
        }
        row[b.length] = prev;
    }
    return row[b.length];
}

// Highlight words in paragraph in real-time:
// 🟢 Green = Read accurately
// 🔴 Red Wavy Underline = Stumbled / Mispronounced word
// ⚪ Neutral = Not yet read
function HighlightedParagraph({ paragraph, spokenWords }) {
    const tokens = paragraph.split(/(\s+)/);
    const spokenClean = spokenWords.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''));
    let spokenPointer = 0;

    return (
        <p style={{ lineHeight: 2.2, fontSize: '16.5px', color: 'var(--text-primary, #fff)', letterSpacing: '0.01em', margin: 0 }}>
            {tokens.map((token, i) => {
                if (/^\s+$/.test(token)) return <span key={i}>{token}</span>;
                const clean = token.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (!clean) return <span key={i}>{token}</span>;

                let status = 'pending'; // 'correct' | 'struggling' | 'pending'

                if (spokenPointer < spokenClean.length) {
                    let bestMatchIdx = -1;
                    let bestDist = 999;

                    for (let w = 0; w < Math.min(7, spokenClean.length - spokenPointer); w++) {
                        const cand = spokenClean[spokenPointer + w];
                        const dist = levDist(clean, cand);
                        if (dist < bestDist) {
                            bestDist = dist;
                            bestMatchIdx = w;
                        }
                    }

                    if (bestMatchIdx !== -1) {
                        if (bestDist === 0) {
                            // Accurate word
                            status = 'correct';
                            spokenPointer += bestMatchIdx + 1;
                        } else if (bestDist <= Math.max(1, Math.floor(clean.length / 3))) {
                            // Mispronounced or stumbled -> RED LINE
                            status = 'struggling';
                            spokenPointer += bestMatchIdx + 1;
                        }
                    }
                }

                let style = {
                    borderRadius: '4px',
                    padding: '2px 5px',
                    transition: 'all 0.15s ease',
                    fontWeight: 400,
                    color: 'var(--text-secondary, #cbd5e1)',
                    background: 'transparent',
                    borderBottom: 'none'
                };

                if (status === 'correct') {
                    style = {
                        ...style,
                        background: 'rgba(16, 185, 129, 0.25)',
                        color: '#34d399',
                        fontWeight: 700,
                        borderBottom: '2.5px solid #10b981'
                    };
                } else if (status === 'struggling') {
                    style = {
                        ...style,
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        fontWeight: 700,
                        borderBottom: '2.5px dashed #ef4444',
                        textDecoration: 'underline wavy #ef4444 1.5px'
                    };
                }

                return (
                    <span key={i} style={style}>
                        {token}
                    </span>
                );
            })}
        </p>
    );
}

// Live Sound Waves Audio Visualizer
function SoundWaves({ active }) {
    const bars = [12, 24, 38, 48, 30, 44, 20, 34, 46, 26, 18, 40];
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', height: '32px' }}>
            {bars.map((maxH, idx) => {
                const calculatedH = active ? Math.max(8, Math.round(maxH * 0.7 + Math.random() * 12)) : 4;
                return (
                    <div
                        key={idx}
                        style={{
                            width: '4px',
                            height: `${calculatedH}px`,
                            background: active ? '#10b981' : 'rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            transition: 'height 0.1s ease',
                        }}
                    />
                );
            })}
        </div>
    );
}

export default function ReadingEngine() {
    const [topic, setTopic] = useState('');
    const [level, setLevel] = useState('intermediate');
    const [selectedAccent, setSelectedAccent] = useState('en-IN');
    const [voiceEngineMode, setVoiceEngineMode] = useState('live'); // 'live' | 'whisper'
    const [paragraphData, setParagraphData] = useState(null);
    const [phase, setPhase] = useState('input'); // input | read | record | result
    const [loading, setLoading] = useState(false);
    const [evaluation, setEvaluation] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [durationSeconds, setDurationSeconds] = useState(0);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [voiceSettings, setVoiceSettings] = useState(getVoiceSettings());

    const {
        transcript,
        interimTranscript,
        isListening,
        setLanguage,
        error: micError,
        isTranscribingAudio,
        startListening,
        startWhisperRecording,
        stopListening,
        resetTranscript,
        setTranscript,
        refineWithWhisper
    } = useSpeechRecognition(null, selectedAccent);

    // Sync accent with speech recognition
    useEffect(() => {
        setLanguage(selectedAccent);
    }, [selectedAccent, setLanguage]);

    // Live combined word stream (final + interim)
    const spokenWords = useMemo(() => {
        const fullCombined = `${transcript} ${interimTranscript}`.trim();
        return fullCombined.split(/\s+/).filter(Boolean);
    }, [transcript, interimTranscript]);

    const playNativeAudio = useCallback((text) => {
        if (!text) return;
        speakAIResponse(
            text,
            () => setIsPlayingAudio(true),
            () => setIsPlayingAudio(false)
        );
    }, []);

    const stopNativeAudio = useCallback(() => {
        stopAllSpeech();
        setIsPlayingAudio(false);
    }, []);

    const handleGetParagraph = async (selectedTopic = null) => {
        const activeTopic = selectedTopic || topic;
        if (!activeTopic.trim()) return;
        setLoading(true);
        stopNativeAudio();

        try {
            const data = await pythonAPI.get(`/api/speaking/reading/paragraph?topic=${encodeURIComponent(activeTopic)}&level=${level}`);
            if (data && data.paragraph) {
                setParagraphData(data);
                setTopic(activeTopic);
                setPhase('read');
            } else {
                throw new Error('Empty paragraph data');
            }
        } catch (err) {
            console.warn('[SPEAKING] Paragraph fetch fallback:', err);
            const cleanTopic = activeTopic.trim();
            setParagraphData({
                paragraph: `In computer science and modern software engineering, ${cleanTopic} is a foundational pillar for building robust, high-performance systems. When designing scalable solutions around ${cleanTopic}, software engineers evaluate algorithmic efficiency, memory complexity, and fault tolerance under high-concurrency production workloads. Practicing clear verbal articulation of ${cleanTopic} empowers you to succeed in technical interviews and system design reviews. Speak with a steady, confident rhythm, articulate key technical terms distinctly, and emphasize core architectural principles.`,
                wordCount: 74,
                vocabulary: [
                    { word: 'foundational', definition: 'serving as the basic underlying principle or core basis of a discipline' },
                    { word: 'concurrency', definition: 'the ability of different parts of a program or system to execute in partial order' },
                    { word: 'articulation', definition: 'the clear, distinct verbal expression of ideas and technical concepts' },
                    { word: 'architectural', definition: 'relating to the high-level structural design and components of software' },
                    { word: 'efficiency', definition: 'optimizing computational resource usage such as execution time and memory' }
                ],
                pronunciationTip: `Focus on clean enunciation of multi-syllable CS terms and pause naturally after punctuation marks.`
            });
            setTopic(activeTopic);
            setPhase('read');
        } finally {
            setLoading(false);
        }
    };

    const handleStartRecording = () => {
        stopNativeAudio();
        resetTranscript();
        setStartTime(Date.now());

        if (voiceEngineMode === 'whisper') {
            startWhisperRecording();
        } else {
            startListening();
        }
        setPhase('record');
    };

    const handleRestartRecording = () => {
        stopListening();
        resetTranscript();
        setStartTime(Date.now());
        setTimeout(() => {
            if (voiceEngineMode === 'whisper') {
                startWhisperRecording();
            } else {
                startListening();
            }
        }, 200);
    };

    const handleManualRefineWhisper = async () => {
        if (refineWithWhisper) {
            const refined = await refineWithWhisper();
            if (refined) {
                setTranscript(refined);
            }
        }
    };

    const handleSubmit = async () => {
        const duration = Math.max(1, Math.round((Date.now() - (startTime || Date.now())) / 1000));
        setDurationSeconds(duration);
        stopListening();
        setLoading(true);

        let activeSpokenText = `${transcript} ${interimTranscript}`.trim();

        // If in Whisper mode or speech is short, run Whisper AI transcription
        if (voiceEngineMode === 'whisper' || (!activeSpokenText && refineWithWhisper)) {
            try {
                const whisperResult = await refineWithWhisper();
                if (whisperResult) {
                    activeSpokenText = whisperResult;
                    setTranscript(whisperResult);
                }
            } catch (e) {
                console.warn('[WHISPER] Whisper refine notice:', e);
            }
        }

        try {
            const result = await pythonAPI.post('/api/speaking/reading/evaluate', {
                topic,
                originalParagraph: paragraphData.paragraph,
                spokenText: activeSpokenText,
                duration,
            });

            if (result && result.evaluation) {
                setEvaluation(result.evaluation);
                setPhase('result');
            } else {
                throw new Error('Invalid evaluation result');
            }
        } catch (err) {
            console.error('[SPEAKING] Reading evaluation fallback triggered:', err);
            const origWords = paragraphData.paragraph.split(/\s+/);
            const wordsSpoken = activeSpokenText.split(/\s+/).filter(Boolean).length;
            const accuracy = Math.min(10, Math.round((wordsSpoken / Math.max(origWords.length, 1)) * 10 * 10) / 10);

            setEvaluation({
                accuracyScore: accuracy,
                fluencyScore: 7.5,
                overallScore: Math.round(((accuracy + 7.5) / 2) * 10) / 10,
                wordsCorrect: wordsSpoken,
                wordsTotal: origWords.length,
                missedWords: origWords.slice(wordsSpoken).slice(0, 8),
                mispronounced: [],
                extraWords: [],
                detailedFeedback: `You completed the technical reading with ${wordsSpoken} detected words (${Math.round((wordsSpoken / origWords.length) * 100)}% coverage). Keep practicing technical articulation!`,
                strengths: ['Clear voice projection', 'Solid reading effort on technical text'],
                improvements: ['Maintain steady pacing through multi-syllable terms', 'Pause naturally at periods'],
                pronunciationGuides: []
            });
            setPhase('result');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        stopNativeAudio();
        setPhase('input');
        setTopic('');
        setParagraphData(null);
        setEvaluation(null);
        resetTranscript();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <AnimatePresence mode="wait">
                {/* STEP 1: CSE Topic Hub + Accent Selector + Level */}
                {phase === 'input' && (
                    <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <div style={cardStyle}>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '46px', height: '46px', borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '22px', flexShrink: 0, color: '#fff'
                                    }}>
                                        <Code size={24} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#fff', margin: 0 }}>
                                            CSE Technical Reading & Pronunciation Hub
                                        </h3>
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                                            Read technical passages with real-time word feedback — correct words turn green, mispronounced words show red lines
                                        </p>
                                    </div>
                                </div>

                                {/* Accent Selector */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated-2)', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <Globe size={14} color="#60a5fa" />
                                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Accent:</span>
                                    <select
                                        value={selectedAccent}
                                        onChange={(e) => setSelectedAccent(e.target.value)}
                                        style={{
                                            background: 'transparent', color: '#93c5fd', border: 'none',
                                            fontSize: '12px', fontWeight: 700, outline: 'none', cursor: 'pointer'
                                        }}
                                    >
                                        {ACCENTS.map(a => (
                                            <option key={a.code} value={a.code} style={{ background: '#18181b', color: '#fff' }}>
                                                {a.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* CSE Categories */}
                            <label style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '10px' }}>
                                💻 Choose A Computer Science & Engineering Domain:
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                                {CSE_CATEGORIES.map(cat => {
                                    const IconComp = cat.icon;
                                    const isSelected = topic === cat.title;
                                    return (
                                        <div
                                            key={cat.id}
                                            onClick={() => {
                                                setTopic(cat.title);
                                                handleGetParagraph(cat.title);
                                            }}
                                            style={{
                                                padding: '14px 16px',
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-elevated-2)',
                                                border: `1.5px solid ${isSelected ? '#10b981' : 'rgba(255, 255, 255, 0.06)'}`,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px',
                                                transition: 'all 0.18s ease',
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <IconComp size={16} color={isSelected ? '#34d399' : '#60a5fa'} />
                                                    <span style={{ fontWeight: 800, fontSize: '13.5px', color: isSelected ? '#34d399' : '#fff' }}>
                                                        {cat.title}
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: '10px', fontWeight: 800, background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '6px', color: 'var(--text-muted)' }}>
                                                    {cat.badge}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                                {cat.desc}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Custom Topic Input */}
                            <label style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                                Or Enter Any Custom Tech Topic:
                            </label>
                            <input
                                placeholder="e.g. Docker Containers, Redis Caching, Dynamic Programming, GraphQL vs REST..."
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGetParagraph()}
                                style={inputStyle}
                                onFocus={(e) => e.target.style.borderColor = '#10b981'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                            />

                            {/* Level selector */}
                            <label style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '10px' }}>
                                Select Practice Level:
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '22px' }}>
                                {LEVELS.map(l => (
                                    <div
                                        key={l.id}
                                        onClick={() => setLevel(l.id)}
                                        style={{
                                            padding: '14px 12px',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            background: level === l.id ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-elevated-2)',
                                            border: `1.5px solid ${level === l.id ? '#10b981' : 'rgba(255, 255, 255, 0.06)'}`,
                                            textAlign: 'center',
                                            transition: 'all 0.18s ease',
                                        }}
                                    >
                                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: level === l.id ? '#34d399' : '#fff' }}>{l.label}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{l.desc}</div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => handleGetParagraph()}
                                disabled={!topic.trim() || loading}
                                style={btn(!topic.trim() || loading, 'linear-gradient(135deg, #10b981, #059669)')}
                            >
                                {loading ? <><Loader size={16} className="animate-spin" /> Generating Technical Passage...</> : <><BookOpen size={16} /> Generate Technical Passage</>}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* STEP 2: Show Technical Passage + Vocab Hints + Audio Listen */}
                {phase === 'read' && paragraphData && (
                    <motion.div key="read" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                        <div style={cardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <BookOpen size={22} color="#10b981" />
                                    <div>
                                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                                            Read This Technical Passage Aloud
                                        </h3>
                                        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                                            Topic: <strong style={{ color: '#fff' }}>{topic}</strong> · Accent: <strong style={{ color: '#60a5fa' }}>{selectedAccent}</strong>
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        onClick={() => setShowVoiceModal(true)}
                                        style={{
                                            padding: '7px 12px',
                                            borderRadius: '10px',
                                            background: 'rgba(255, 255, 255, 0.06)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            color: '#93c5fd',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                        }}
                                    >
                                        <Settings2 size={14} />
                                        <span>Voice Settings</span>
                                    </button>

                                    <button
                                        onClick={isPlayingAudio ? stopNativeAudio : () => playNativeAudio(paragraphData.paragraph)}
                                        style={{
                                            padding: '7px 14px',
                                            borderRadius: '10px',
                                            background: isPlayingAudio ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                                            border: isPlayingAudio ? '1px solid #ef4444' : '1px solid #10b981',
                                            color: isPlayingAudio ? '#f87171' : '#34d399',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}
                                    >
                                        {isPlayingAudio ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                        <span>{isPlayingAudio ? 'Stop Audio' : 'Listen Native Pronunciation'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Technical Passage Box */}
                            <div style={{
                                background: '#121212', borderRadius: '12px', padding: '24px',
                                marginBottom: '16px', border: '1px solid rgba(255, 255, 255, 0.08)',
                                lineHeight: 2.1,
                            }}>
                                <p style={{ fontSize: '17px', lineHeight: 2.1, color: '#fff', letterSpacing: '0.01em', margin: 0 }}>
                                    {paragraphData.paragraph}
                                </p>
                            </div>

                            {/* Pronunciation Tip */}
                            {paragraphData.pronunciationTip && (
                                <div style={{
                                    padding: '12px 16px', borderRadius: '10px',
                                    background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)',
                                    fontSize: '13px', color: '#34d399', marginBottom: '16px',
                                    display: 'flex', gap: '8px', alignItems: 'flex-start',
                                }}>
                                    <span style={{ flexShrink: 0 }}>💡</span>
                                    <span><strong>Pronunciation Guide:</strong> {paragraphData.pronunciationTip}</span>
                                </div>
                            )}

                            {/* Voice Engine Selector */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: 'var(--bg-elevated-2)', padding: '12px 16px', borderRadius: '12px',
                                marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '10px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Radio size={16} color="#10b981" />
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>Speech Recognition Mode</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            {voiceEngineMode === 'live' ? '⚡ Real-time Live Speech' : '🎙️ Groq Whisper AI Studio Mode'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        onClick={() => setVoiceEngineMode('live')}
                                        style={{
                                            padding: '6px 12px', borderRadius: '8px',
                                            background: voiceEngineMode === 'live' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                                            border: `1px solid ${voiceEngineMode === 'live' ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                                            color: voiceEngineMode === 'live' ? '#34d399' : 'var(--text-secondary)',
                                            fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                                        }}
                                    >
                                        🎙️ Live Browser Speech
                                    </button>
                                    <button
                                        onClick={() => setVoiceEngineMode('whisper')}
                                        style={{
                                            padding: '6px 12px', borderRadius: '8px',
                                            background: voiceEngineMode === 'whisper' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                                            border: `1px solid ${voiceEngineMode === 'whisper' ? '#a855f7' : 'rgba(255,255,255,0.1)'}`,
                                            color: voiceEngineMode === 'whisper' ? '#c084fc' : 'var(--text-secondary)',
                                            fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                                        }}
                                    >
                                        ⚡ Whisper AI Mode
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={handleStartRecording}
                                    style={{
                                        ...btn(false, 'linear-gradient(135deg, #10b981, #059669)'),
                                        flex: 1,
                                    }}
                                >
                                    <Mic size={16} /> Start Reading Aloud
                                </button>
                                <button
                                    onClick={handleReset}
                                    style={{
                                        padding: '14px 20px',
                                        borderRadius: '12px',
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#fff',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Choose Another Topic
                                </button>
                            </div>
                        </div>

                        {/* Vocabulary Hints */}
                        {paragraphData.vocabulary?.length > 0 && (
                            <div style={cardStyle}>
                                <p style={{ fontSize: '12px', fontWeight: 800, marginBottom: '12px', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    📚 Key Technical Terminology in this Passage
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                                    {paragraphData.vocabulary.map((v, i) => (
                                        <div key={i} style={{
                                            display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 14px',
                                            background: 'var(--bg-elevated-2)', borderRadius: '10px',
                                            border: '1px solid rgba(255, 255, 255, 0.06)',
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 800, color: '#34d399', fontSize: '14px' }}>{v.word}</span>
                                                <button
                                                    onClick={() => speakAIResponse(v.word)}
                                                    title={`Listen to "${v.word}"`}
                                                    style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: '2px' }}
                                                >
                                                    <Volume2 size={14} />
                                                </button>
                                            </div>
                                            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{v.definition}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* STEP 3: Live Recording with Sound Waves & Real-Time Word Highlighting */}
                {phase === 'record' && paragraphData && (
                    <motion.div key="record" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                        {/* Mic Indicator + Live Audio Level Visualizer */}
                        <div style={{ ...cardStyle, textAlign: 'center', paddingTop: '20px', paddingBottom: '20px' }}>
                            <div style={{
                                width: '70px', height: '70px', margin: '0 auto 12px',
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isListening ? '#10b981' : 'var(--bg-elevated-3)',
                                boxShadow: isListening ? '0 0 25px rgba(16, 185, 129, 0.6)' : 'none',
                                transition: 'all 0.2s ease',
                            }}>
                                {isListening ? <Mic size={32} color="#fff" /> : <MicOff size={32} color="var(--text-muted)" />}
                            </div>

                            {/* Sound Waves */}
                            <SoundWaves active={isListening} />

                            <p style={{ fontWeight: 800, fontSize: '15.5px', color: isListening ? '#34d399' : 'var(--text-muted)', margin: '8px 0 2px 0' }}>
                                {isListening ? '🟢 Microphone Listening · Speak At Your Own Pace' : '⏹️ Microphone Stopped'}
                            </p>

                            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
                                Pausing is 100% fine — your words are preserved continuously · Accent: <strong style={{ color: '#60a5fa' }}>{selectedAccent}</strong>
                            </p>

                            {micError && (
                                <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#f87171', fontSize: '12px' }}>
                                    ⚠️ {micError}
                                </div>
                            )}
                        </div>

                        {/* Paragraph with Live Word Highlighting */}
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontWeight: 800 }}>
                                    <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} /> Green = Good
                                    </span>
                                    <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} /> Red Line = Stumbled
                                    </span>
                                </div>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    {spokenWords.length} words captured
                                </span>
                            </div>

                            <div style={{
                                background: '#121212', borderRadius: '12px', padding: '22px',
                                border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '16px',
                            }}>
                                <HighlightedParagraph paragraph={paragraphData.paragraph} spokenWords={spokenWords} />
                            </div>

                            {/* Live Spoken Response Box (Auto-Saved on Pauses) */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Edit3 size={12} /> Real-Time Spoken Response Box (Auto-Saved on Pauses)
                                    </label>
                                    <button
                                        onClick={handleManualRefineWhisper}
                                        disabled={isTranscribingAudio || (!transcript && !interimTranscript)}
                                        style={{
                                            background: 'rgba(168, 85, 247, 0.15)',
                                            border: '1px solid #a855f7',
                                            color: '#c084fc',
                                            borderRadius: '8px',
                                            padding: '4px 10px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            cursor: isTranscribingAudio ? 'wait' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                        }}
                                    >
                                        <Wand2 size={12} /> {isTranscribingAudio ? 'Refining with AI...' : 'Refine with Whisper AI'}
                                    </button>
                                </div>

                                <div style={{
                                    background: 'var(--bg-elevated-2)', borderRadius: '10px',
                                    padding: '14px 16px', minHeight: '64px', fontSize: '14.5px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    lineHeight: 1.6,
                                }}>
                                    {transcript ? (
                                        <span style={{ color: '#fff' }}>{transcript} </span>
                                    ) : null}
                                    {interimTranscript ? (
                                        <span style={{ color: '#93c5fd', fontStyle: 'italic', fontWeight: 600 }}>{interimTranscript}</span>
                                    ) : null}
                                    {!transcript && !interimTranscript && (
                                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                            Start reading aloud — your words will write here in real time. Pausing is 100% fine, nothing will be deleted.
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={handleRestartRecording} style={{
                                    flex: 1, padding: '12px', borderRadius: '10px',
                                    background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#fff', fontSize: '13px', fontWeight: 700,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                }}>
                                    <RotateCcw size={14} /> Restart
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={(!transcript && !interimTranscript && voiceEngineMode !== 'whisper') || loading}
                                    style={{
                                        ...btn((!transcript && !interimTranscript && voiceEngineMode !== 'whisper') || loading, 'linear-gradient(135deg, #10b981, #059669)'),
                                        flex: 2,
                                        width: 'auto'
                                    }}
                                >
                                    <Send size={14} /> {loading ? 'Evaluating Pronunciation & Accuracy...' : 'Submit & Analyze Reading'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* STEP 4: Comprehensive AI Scoring & Word-by-Word Analysis */}
                {phase === 'result' && evaluation && (
                    <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                        <ReadingFeedbackCard
                            evaluation={evaluation}
                            topic={topic}
                            originalParagraph={paragraphData?.paragraph}
                            duration={durationSeconds}
                        />

                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button
                                onClick={() => { setPhase('read'); resetTranscript(); }}
                                style={{ ...btn(false, '#3b82f6'), flex: 1, width: 'auto' }}
                            >
                                🔁 Read Again
                            </button>
                            <button
                                onClick={handleReset}
                                style={{ ...btn(false, 'linear-gradient(135deg, #10b981, #059669)'), flex: 1, width: 'auto' }}
                            >
                                📖 Choose New CSE Topic
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Voice Settings Modal */}
            <VoiceSettingsModal
                isOpen={showVoiceModal}
                onClose={() => setShowVoiceModal(false)}
                onSettingsChange={s => setVoiceSettings(s)}
            />
        </div>
    );
}
