import { useState, useMemo, useCallback } from 'react';
import { useSpeechRecognition } from '../../../hooks/useSpeechRecognition';
import { pythonAPI } from '../../../services/api';
import FeedbackCard from './FeedbackCard';
import ReadingFeedbackCard from './ReadingFeedbackCard';
import { BookOpen, Mic, MicOff, RotateCcw, Send, Sparkles, ChevronDown, Loader, Volume2, VolumeX, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const cardStyle = { background: 'var(--bg-elevated-1)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.08)' };
const inputStyle = {
    width: '100%', padding: '14px 16px',
    background: 'var(--bg-surface, #121212)', border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px', color: 'var(--text-primary)',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    fontFamily: "'Figtree', sans-serif",
    transition: 'border 0.2s', marginBottom: '12px',
};
const btn = (disabled = false, color = 'var(--accent, #10b981)') => ({
    width: '100%', padding: '14px',
    borderRadius: '12px',
    background: disabled ? 'rgba(255,255,255,0.08)' : color,
    color: disabled ? 'var(--text-muted)' : (color === 'var(--accent, #10b981)' ? '#000' : '#fff'),
    fontSize: '13px', fontWeight: 800, letterSpacing: '0.04em',
    textTransform: 'uppercase', cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '8px',
    transition: 'all 0.2s', fontFamily: "'Figtree', sans-serif",
});

const LEVELS = [
    { id: 'beginner', label: '🌱 Beginner', desc: 'Simple vocabulary, clear short sentences' },
    { id: 'intermediate', label: '🌿 Intermediate', desc: 'Varied structure, practical idioms' },
    { id: 'advanced', label: '🌳 Advanced', desc: 'Complex ideas, rich professional vocabulary' },
];

const SUGGESTED_TOPICS = [
    'Artificial Intelligence', 'Space Exploration', 'Climate & Renewable Energy',
    'Healthy Nutrition', 'Electric Vehicles', 'Deep Sea Marine Life',
    'Career Growth & Leadership', 'Mindfulness & Meditation', 'Global Travel & Culture'
];

// Highlight words in paragraph that the user has read
function HighlightedParagraph({ paragraph, spokenWords }) {
    const words = paragraph.split(/(\s+)/);
    const spokenLower = spokenWords.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''));
    let spokenIdx = 0;

    return (
        <p style={{ lineHeight: 1.9, fontSize: '16px', color: 'var(--text-primary)', letterSpacing: '0.01em', margin: 0 }}>
            {words.map((token, i) => {
                const isSpace = /^\s+$/.test(token);
                if (isSpace) return <span key={i}>{token}</span>;

                const clean = token.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (!clean) return <span key={i}>{token}</span>;

                let matched = false;
                for (let j = 0; j < 6; j++) {
                    if (spokenIdx + j < spokenLower.length && spokenLower[spokenIdx + j] === clean) {
                        matched = true;
                        spokenIdx = spokenIdx + j + 1;
                        break;
                    }
                }

                return (
                    <span key={i} style={{
                        background: matched ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                        color: matched ? '#34d399' : 'var(--text-primary)',
                        borderRadius: '4px', padding: '1px 3px',
                        fontWeight: matched ? 700 : 400,
                        transition: 'all 0.15s ease',
                    }}>{token}</span>
                );
            })}
        </p>
    );
}

export default function ReadingEngine() {
    const [topic, setTopic] = useState('');
    const [level, setLevel] = useState('beginner');
    const [paragraphData, setParagraphData] = useState(null);
    const [phase, setPhase] = useState('input'); // input | read | record | result
    const [loading, setLoading] = useState(false);
    const [evaluation, setEvaluation] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);

    const { transcript, interimTranscript, isListening, startListening, stopListening, resetTranscript } = useSpeechRecognition();

    const spokenWords = useMemo(() => transcript.trim().split(/\s+/).filter(Boolean), [transcript]);

    const playNativeAudio = useCallback((text) => {
        if (!window.speechSynthesis || !text) return;
        try {
            window.speechSynthesis.cancel();
            window.speechSynthesis.resume();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            utterance.onstart = () => setIsPlayingAudio(true);
            utterance.onend = () => setIsPlayingAudio(false);
            utterance.onerror = () => setIsPlayingAudio(false);
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            setIsPlayingAudio(false);
        }
    }, []);

    const stopNativeAudio = useCallback(() => {
        if (window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch (e) {}
            setIsPlayingAudio(false);
        }
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
            console.warn('Paragraph API fallback triggered:', err);
            const cleanTopic = activeTopic.trim();
            setParagraphData({
                paragraph: `${cleanTopic} is an essential subject to explore and understand in modern society. When studying ${cleanTopic}, we discover how core principles, practical experimentation, and dedicated focus lead to outstanding results. Practicing spoken English while reading about ${cleanTopic} improves your vocabulary, enunciation, and natural speaking rhythm. Take your time with every sentence, pronounce each syllable clearly, and maintain a calm, confident speaking pace.`,
                wordCount: 75,
                vocabulary: [
                    { word: 'principles', definition: 'fundamental truths or rules that serve as the foundation for a system' },
                    { word: 'experimentation', definition: 'the process of testing new ideas and methods' },
                    { word: 'enunciation', definition: 'the act of pronouncing words clearly and distinctly' },
                    { word: 'confident', definition: 'feeling or showing certainty about your own ability' }
                ],
                pronunciationTip: `Focus on clean consonant endings and pause naturally at commas and periods.`
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
        startListening();
        setPhase('record');
    };

    const handleRestartRecording = () => {
        stopListening();
        resetTranscript();
        setStartTime(Date.now());
        setTimeout(() => startListening(), 200);
    };

    const handleSubmit = async () => {
        const duration = Math.round((Date.now() - startTime) / 1000);
        stopListening();
        setLoading(true);
        try {
            const result = await pythonAPI.post('/api/speaking/reading/evaluate', {
                topic,
                originalParagraph: paragraphData.paragraph,
                spokenText: transcript,
                duration,
            });
            setEvaluation(result.evaluation);
            setPhase('result');
        } catch (err) {
            console.error('Reading evaluation failed:', err);
            alert('Evaluation failed. Please check connection and try again.');
            setPhase('record');
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
                {/* STEP 1: Choose topic + level */}
                {phase === 'input' && (
                    <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                <div style={{
                                    width: '42px', height: '42px', borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '22px', flexShrink: 0
                                }}>
                                    📖
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>Reading Aloud & Pronunciation Practice</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>AI provides a factual passage on any topic — you read it aloud — AI analyzes your pronunciation and pace</p>
                                </div>
                            </div>

                            {/* Topic input */}
                            <label style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                                Enter Any Custom Topic
                            </label>
                            <input
                                placeholder="e.g. Artificial Intelligence, Climate Change, Quantum Physics, Startups, Space..."
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGetParagraph()}
                                style={inputStyle}
                                onFocus={(e) => e.target.style.borderColor = '#60a5fa'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                            />

                            {/* Suggested topics */}
                            <div style={{ marginBottom: '20px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                                    Or Pick A Popular Topic:
                                </span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {SUGGESTED_TOPICS.map(t => (
                                        <button
                                            key={t}
                                            onClick={() => {
                                                setTopic(t);
                                                handleGetParagraph(t);
                                            }}
                                            style={{
                                                padding: '7px 14px',
                                                borderRadius: '20px',
                                                background: topic === t ? 'rgba(96, 165, 250, 0.2)' : 'var(--bg-elevated-2)',
                                                border: topic === t ? '1px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.06)',
                                                color: topic === t ? '#93c5fd' : 'var(--text-secondary)',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Level selector */}
                            <label style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '10px' }}>
                                Select Your English Level
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                                {LEVELS.map(l => (
                                    <div
                                        key={l.id}
                                        onClick={() => setLevel(l.id)}
                                        style={{
                                            padding: '16px 14px',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            background: level === l.id ? 'rgba(96, 165, 250, 0.15)' : 'var(--bg-elevated-2)',
                                            border: `1.5px solid ${level === l.id ? '#60a5fa' : 'rgba(255, 255, 255, 0.06)'}`,
                                            textAlign: 'center',
                                            transition: 'all 0.18s ease',
                                        }}
                                    >
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: level === l.id ? '#93c5fd' : '#fff' }}>{l.label}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{l.desc}</div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => handleGetParagraph()}
                                disabled={!topic.trim() || loading}
                                style={btn(!topic.trim() || loading, 'linear-gradient(135deg, #60a5fa, #2563eb)')}
                            >
                                {loading ? <><Loader size={16} className="animate-spin" /> Generating Topic Passage...</> : <><BookOpen size={16} /> Generate Reading Passage</>}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* STEP 2: Show paragraph, vocabulary hints, and start button */}
                {phase === 'read' && paragraphData && (
                    <motion.div key="read" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                        {/* Paragraph card */}
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <BookOpen size={20} color="#60a5fa" />
                                    <div>
                                        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', margin: 0 }}>Read This Paragraph Aloud</h3>
                                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                                            Topic: <strong style={{ color: '#fff' }}>{topic}</strong> · Level: <strong style={{ color: '#60a5fa', textTransform: 'capitalize' }}>{level}</strong>
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={isPlayingAudio ? stopNativeAudio : () => playNativeAudio(paragraphData.paragraph)}
                                    style={{
                                        padding: '7px 14px',
                                        borderRadius: '10px',
                                        background: isPlayingAudio ? 'rgba(239, 68, 68, 0.2)' : 'rgba(96, 165, 250, 0.15)',
                                        border: isPlayingAudio ? '1px solid #ef4444' : '1px solid #60a5fa',
                                        color: isPlayingAudio ? '#f87171' : '#60a5fa',
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

                            {/* Paragraph box */}
                            <div style={{
                                background: '#121212', borderRadius: '12px', padding: '24px',
                                marginBottom: '16px', border: '1px solid rgba(255, 255, 255, 0.08)',
                                lineHeight: 1.9,
                            }}>
                                <p style={{ fontSize: '16px', lineHeight: 1.9, color: '#fff', letterSpacing: '0.01em', margin: 0 }}>
                                    {paragraphData.paragraph}
                                </p>
                            </div>

                            {/* Pronunciation Tip */}
                            {paragraphData.pronunciationTip && (
                                <div style={{
                                    padding: '12px 16px', borderRadius: '10px',
                                    background: 'rgba(96, 165, 250, 0.08)', border: '1px solid rgba(96, 165, 250, 0.25)',
                                    fontSize: '13px', color: '#93c5fd', marginBottom: '16px',
                                    display: 'flex', gap: '8px', alignItems: 'flex-start',
                                }}>
                                    <span style={{ flexShrink: 0 }}>💡</span>
                                    <span><strong>Pronunciation Tip:</strong> {paragraphData.pronunciationTip}</span>
                                </div>
                            )}

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

                        {/* Vocabulary hints */}
                        {paragraphData.vocabulary?.length > 0 && (
                            <div style={cardStyle}>
                                <p style={{ fontSize: '13px', fontWeight: 800, marginBottom: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    📚 Key Vocabulary Words
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                                    {paragraphData.vocabulary.map((v, i) => (
                                        <div key={i} style={{
                                            display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 14px',
                                            background: 'var(--bg-elevated-2)', borderRadius: '10px',
                                            border: '1px solid rgba(255, 255, 255, 0.06)',
                                        }}>
                                            <span style={{ fontWeight: 800, color: '#60a5fa', fontSize: '13.5px' }}>{v.word}</span>
                                            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{v.definition}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* STEP 3: Recording — show original paragraph + live highlight */}
                {phase === 'record' && paragraphData && (
                    <motion.div key="record" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                        {/* Mic indicator */}
                        <div style={{ ...cardStyle, textAlign: 'center', paddingTop: '20px', paddingBottom: '20px' }}>
                            <div style={{
                                width: '64px', height: '64px', margin: '0 auto 12px',
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isListening ? '#ef4444' : 'var(--bg-elevated-3)',
                                boxShadow: isListening ? '0 0 20px rgba(239, 68, 68, 0.5)' : 'none',
                                transition: 'all 0.3s',
                            }}>
                                {isListening ? <Mic size={28} color="#fff" /> : <MicOff size={28} color="var(--text-muted)" />}
                            </div>
                            <p style={{ fontWeight: 800, fontSize: '15px', color: isListening ? '#f87171' : 'var(--text-muted)', marginBottom: '4px' }}>
                                {isListening ? '🔴 Reading aloud... Speak clearly' : '⏹️ Microphone stopped'}
                            </p>
                            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Read the paragraph below at a steady pace</p>
                        </div>

                        {/* Paragraph with word highlighting */}
                        <div style={cardStyle}>
                            <p style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', marginBottom: '12px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                ✓ Green highlights words detected accurately
                            </p>
                            <div style={{
                                background: '#121212', borderRadius: '12px', padding: '22px',
                                border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '16px',
                            }}>
                                <HighlightedParagraph paragraph={paragraphData.paragraph} spokenWords={spokenWords} />
                            </div>

                            {/* Live spoken text */}
                            <div style={{
                                background: 'var(--bg-elevated-2)', borderRadius: '10px',
                                padding: '14px 16px', minHeight: '48px', marginBottom: '16px', fontSize: '13.5px',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                            }}>
                                <span style={{ color: '#fff' }}>{transcript} </span>
                                <span style={{ color: '#93c5fd', fontStyle: 'italic' }}>{interimTranscript}</span>
                                {!transcript && !interimTranscript && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Your speech will appear here in real-time...</span>}
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
                                <button onClick={handleSubmit} disabled={!transcript || loading} style={{ ...btn(!transcript || loading, '#10b981'), flex: 1, width: 'auto' }}>
                                    <Send size={14} /> {loading ? 'Scoring Accuracy...' : 'Submit Reading'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* STEP 4: Results */}
                {phase === 'result' && evaluation && (
                    <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                        <ReadingFeedbackCard evaluation={evaluation} topic={topic} />

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => { setPhase('read'); resetTranscript(); }} style={{ ...btn(false, '#60a5fa'), flex: 1, width: 'auto' }}>
                                🔁 Read Again
                            </button>
                            <button onClick={handleReset} style={{ ...btn(false, '#10b981'), flex: 1, width: 'auto' }}>
                                📖 Choose New Topic
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
