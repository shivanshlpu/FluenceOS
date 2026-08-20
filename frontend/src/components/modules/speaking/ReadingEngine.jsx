import { useState, useMemo } from 'react';
import { useSpeechRecognition } from '../../../hooks/useSpeechRecognition';
import { pythonAPI } from '../../../services/api';
import FeedbackCard from './FeedbackCard';
import ReadingFeedbackCard from './ReadingFeedbackCard';
import { BookOpen, Mic, MicOff, RotateCcw, Send, Sparkles, ChevronDown, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const cardStyle = { background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '24px' };
const inputStyle = {
    width: '100%', padding: '14px 16px',
    background: 'var(--bg-surface)', border: '1px solid transparent',
    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    fontFamily: "'Figtree', sans-serif",
    transition: 'border var(--transition-fast)', marginBottom: '12px',
};
const btn = (disabled = false, color = 'var(--accent)') => ({
    width: '100%', padding: '14px',
    borderRadius: 'var(--radius-pill)',
    background: disabled ? 'var(--bg-elevated-3)' : color,
    color: disabled ? 'var(--text-muted)' : '#fff',
    fontSize: '13px', fontWeight: 700, letterSpacing: '1.5px',
    textTransform: 'uppercase', cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '8px',
    transition: 'all var(--transition-fast)', fontFamily: "'Figtree', sans-serif",
});

const LEVELS = [
    { id: 'beginner', label: '🌱 Beginner', desc: 'Simple words, short sentences' },
    { id: 'intermediate', label: '🌿 Intermediate', desc: 'More vocabulary, varied structure' },
    { id: 'advanced', label: '🌳 Advanced', desc: 'Complex ideas, rich vocabulary' },
];

const SUGGESTED_TOPICS = [
    'Climate Change', 'Artificial Intelligence', 'Space Exploration',
    'Healthy Food', 'Social Media', 'Electric Cars', 'Ocean Life', 'Yoga & Meditation'
];

// Highlight words in paragraph that the user has read (word-by-word match)
function HighlightedParagraph({ paragraph, spokenWords }) {
    const words = paragraph.split(/(\s+)/);
    const spokenLower = spokenWords.map(w => w.toLowerCase().replace(/[^a-z]/g, ''));
    let spokenIdx = 0;

    return (
        <p style={{ lineHeight: 1.9, fontSize: '16px', color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
            {words.map((token, i) => {
                const isSpace = /^\s+$/.test(token);
                if (isSpace) return <span key={i}>{token}</span>;

                const clean = token.toLowerCase().replace(/[^a-z]/g, '');
                if (!clean) return <span key={i}>{token}</span>;

                let matched = false;
                // Look ahead up to 5 words in the spoken text to find a match (allows skipping mispronounced words)
                for (let j = 0; j < 5; j++) {
                    if (spokenIdx + j < spokenLower.length && spokenLower[spokenIdx + j] === clean) {
                        matched = true;
                        spokenIdx = spokenIdx + j + 1; // advance pointer past the matched word
                        break;
                    }
                }

                return (
                    <span key={i} style={{
                        background: matched ? 'rgba(30,215,96,0.18)' : 'transparent',
                        color: matched ? 'var(--accent)' : 'var(--text-primary)',
                        borderRadius: '3px', padding: '1px 1px',
                        fontWeight: matched ? 700 : 400,
                        transition: 'all 0.2s',
                    }}>{token}</span>
                );
            })}
        </p>
    );
}

export default function ReadingEngine() {
    const [topic, setTopic] = useState('');
    const [level, setLevel] = useState('beginner');
    const [paragraphData, setParagraphData] = useState(null);   // { paragraph, vocabulary, pronunciationTip }
    const [phase, setPhase] = useState('input');               // input | read | record | result
    const [loading, setLoading] = useState(false);
    const [evaluation, setEvaluation] = useState(null);
    const [startTime, setStartTime] = useState(null);

    const { transcript, interimTranscript, isListening, startListening, stopListening, resetTranscript } = useSpeechRecognition();

    const spokenWords = useMemo(() => transcript.trim().split(/\s+/).filter(Boolean), [transcript]);

    const handleGetParagraph = async () => {
        if (!topic.trim()) return;
        setLoading(true);
        try {
            const data = await pythonAPI.get(`/api/speaking/reading/paragraph?topic=${encodeURIComponent(topic)}&level=${level}`);
            setParagraphData(data);
            setPhase('read');
        } catch (err) {
            console.error('Paragraph generation failed:', err);
            // Fallback
            setParagraphData({
                paragraph: `Let's practice reading about ${topic}. This is a great topic to improve your English. Start reading slowly and clearly. Each word matters when you speak. Take a deep breath before you begin. Focus on pronouncing every word correctly. When you finish, you will get a score. Practice makes perfect. The more you read, the better you speak. Good luck with your reading practice today!`,
                wordCount: 65,
                vocabulary: [],
                pronunciationTip: 'Read slowly. Pause at every comma and full stop.'
            });
            setPhase('read');
        }
        setLoading(false);
    };

    const handleStartRecording = () => {
        resetTranscript();
        setStartTime(Date.now());
        startListening();
        setPhase('record');
    };

    const handleRestartRecording = () => {
        stopListening();
        resetTranscript();
        setStartTime(Date.now());
        // Small delay to allow the browser speech engine to clean up before restarting
        setTimeout(() => startListening(), 250);
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
            alert('Evaluation failed. Please try again.');
            setPhase('record');
        }
        setLoading(false);
    };

    const handleReset = () => {
        setPhase('input'); setTopic(''); setParagraphData(null);
        setEvaluation(null); resetTranscript();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <AnimatePresence mode="wait">

                {/* STEP 1: Choose topic + level */}
                {phase === 'input' && (
                    <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                <BookOpen size={22} color="#60a5fa" />
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>📖 Reading Practice</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>AI gives you a paragraph — you read it aloud — AI scores you</p>
                                </div>
                            </div>

                            {/* Topic input */}
                            <label style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Choose Topic</label>
                            <input
                                placeholder="e.g. Climate Change, Space, AI, Health..."
                                value={topic} onChange={(e) => setTopic(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGetParagraph()}
                                style={inputStyle}
                                onFocus={(e) => e.target.style.borderColor = '#60a5fa'}
                                onBlur={(e) => e.target.style.borderColor = 'transparent'}
                            />

                            {/* Suggested topics */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                                {SUGGESTED_TOPICS.map(t => (
                                    <button key={t} onClick={() => setTopic(t)} style={{
                                        padding: '6px 14px', borderRadius: 'var(--radius-pill)',
                                        background: topic === t ? '#60a5fa22' : 'var(--bg-elevated-2)',
                                        border: topic === t ? '1px solid #60a5fa' : '1px solid transparent',
                                        color: topic === t ? '#60a5fa' : 'var(--text-secondary)',
                                        fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                                        transition: 'all 0.15s',
                                    }}>{t}</button>
                                ))}
                            </div>

                            {/* Level selector */}
                            <label style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '10px' }}>Your English Level</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                                {LEVELS.map(l => (
                                    <div key={l.id} onClick={() => setLevel(l.id)}
                                        style={{
                                            padding: '14px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                            background: level === l.id ? '#60a5fa1A' : 'var(--bg-elevated-2)',
                                            border: `2px solid ${level === l.id ? '#60a5fa' : 'transparent'}`,
                                            textAlign: 'center', transition: 'all 0.18s',
                                        }}
                                    >
                                        <div style={{ fontSize: '18px', marginBottom: '4px' }}>{l.label.split(' ')[0]}</div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: level === l.id ? '#60a5fa' : 'var(--text-primary)' }}>{l.label.split(' ').slice(1).join(' ')}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{l.desc}</div>
                                    </div>
                                ))}
                            </div>

                            <button onClick={handleGetParagraph} disabled={!topic.trim() || loading} style={btn(!topic.trim() || loading, '#60a5fa')}>
                                {loading ? <><Loader size={16} className="animate-spin" /> Generating paragraph...</> : <><BookOpen size={16} /> Get My Reading Paragraph</>}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                <BookOpen size={18} color="#60a5fa" />
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>📖 Read This Paragraph Aloud</h3>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Topic: <strong>{topic}</strong> · Level: <strong style={{ color: '#60a5fa', textTransform: 'capitalize' }}>{level}</strong> · {paragraphData.wordCount} words</p>
                                </div>
                            </div>

                            {/* Paragraph box */}
                            <div style={{
                                background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '22px',
                                marginBottom: '16px', border: '1px solid var(--border-subtle)',
                                lineHeight: 1.9,
                            }}>
                                <p style={{ fontSize: '16px', lineHeight: 1.9, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>{paragraphData.paragraph}</p>
                            </div>

                            {/* Pronunciation Tip */}
                            {paragraphData.pronunciationTip && (
                                <div style={{
                                    padding: '10px 16px', borderRadius: 'var(--radius-md)',
                                    background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)',
                                    fontSize: '13px', color: '#60a5fa', marginBottom: '16px',
                                    display: 'flex', gap: '8px', alignItems: 'flex-start',
                                }}>
                                    <span style={{ flexShrink: 0 }}>💡</span>
                                    <span><strong>Pronunciation Tip:</strong> {paragraphData.pronunciationTip}</span>
                                </div>
                            )}

                            <button onClick={handleStartRecording} style={btn(false, 'var(--success)')}>
                                <Mic size={16} /> Start Reading Aloud
                            </button>
                        </div>

                        {/* Vocabulary hints */}
                        {paragraphData.vocabulary?.length > 0 && (
                            <div style={cardStyle}>
                                <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)' }}>📚 Key Vocabulary</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {paragraphData.vocabulary.map((v, i) => (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 14px',
                                            background: 'var(--bg-elevated-2)', borderRadius: 'var(--radius-md)',
                                        }}>
                                            <span style={{ fontWeight: 800, color: '#60a5fa', minWidth: '90px', fontSize: '13px' }}>{v.word}</span>
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{v.definition}</span>
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
                                background: isListening ? 'var(--error)' : 'var(--bg-elevated-3)',
                                boxShadow: isListening ? '0 0 0 10px rgba(241,94,108,0.12)' : 'none',
                                animation: isListening ? 'pulse-record 1.5s infinite' : 'none',
                                transition: 'all 0.3s',
                            }}>
                                {isListening ? <Mic size={28} color="#fff" /> : <MicOff size={28} color="var(--text-muted)" />}
                            </div>
                            <p style={{ fontWeight: 700, fontSize: '14px', color: isListening ? 'var(--error)' : 'var(--text-muted)', marginBottom: '4px' }}>
                                {isListening ? '🔴 Reading aloud...' : '⏹️ Microphone stopped'}
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Read the paragraph below clearly and at a steady pace</p>
                        </div>

                        {/* Paragraph with word highlighting */}
                        <div style={{ ...cardStyle }}>
                            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                Read this — green = matched ✓
                            </p>
                            <div style={{
                                background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '20px',
                                border: '1px solid var(--border-subtle)', marginBottom: '16px',
                            }}>
                                <HighlightedParagraph paragraph={paragraphData.paragraph} spokenWords={spokenWords} />
                            </div>

                            {/* Live spoken text */}
                            <div style={{
                                background: 'var(--bg-elevated-2)', borderRadius: 'var(--radius-md)',
                                padding: '12px 16px', minHeight: '48px', marginBottom: '16px', fontSize: '13px',
                            }}>
                                <span style={{ color: 'var(--text-primary)' }}>{transcript}</span>
                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{interimTranscript}</span>
                                {!transcript && !interimTranscript && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Your speech will appear here...</span>}
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={handleRestartRecording} style={{
                                    flex: 1, padding: '12px', borderRadius: 'var(--radius-pill)',
                                    background: 'transparent', border: '1px solid #727272',
                                    color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                }}>
                                    <RotateCcw size={14} /> Restart
                                </button>
                                <button onClick={handleSubmit} disabled={!transcript || loading} style={{ ...btn(!transcript || loading), flex: 1, width: 'auto' }}>
                                    <Send size={14} /> {loading ? 'Scoring...' : 'Submit Reading'}
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
                            <button onClick={handleReset} style={{ ...btn(), flex: 1, width: 'auto' }}>
                                📖 New Paragraph
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
