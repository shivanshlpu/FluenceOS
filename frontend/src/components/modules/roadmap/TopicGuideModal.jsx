import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, ExternalLink, Lightbulb, AlertTriangle, CheckCircle2, Play, Code2, BookOpen, Terminal, Bookmark, FileText, Sparkles, Zap, Baby } from 'lucide-react';

export default function TopicGuideModal({ guide, onClose }) {
    const [copied, setCopied] = useState(false);
    const [explainMode, setExplainMode] = useState('eli5'); // 'eli5' | 'deep'
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [personalNote, setPersonalNote] = useState('');
    const [noteSaved, setNoteSaved] = useState(false);

    const skill = guide?.skill || 'Technology';
    const topicName = guide?.topic || guide?.name || 'Topic';
    const bookmarkKey = `fluence_bookmarked_topics_${skill.toLowerCase().replace(/ /g, '_')}`;
    const noteKey = `fluence_topic_notes_${skill}_${topicName}`;

    useEffect(() => {
        if (!guide) return;
        // Check bookmark status
        try {
            const raw = localStorage.getItem(bookmarkKey);
            if (raw) {
                const list = JSON.parse(raw);
                setIsBookmarked(list.some(b => b.name === topicName));
            }
            const savedNote = localStorage.getItem(noteKey);
            if (savedNote) setPersonalNote(savedNote);
        } catch {}
    }, [guide]);

    if (!guide) return null;

    const handleCopy = () => {
        if (!guide.codeSnippet) return;
        navigator.clipboard.writeText(guide.codeSnippet);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleBookmark = () => {
        try {
            const raw = localStorage.getItem(bookmarkKey);
            let list = raw ? JSON.parse(raw) : [];
            if (isBookmarked) {
                list = list.filter(b => b.name !== topicName);
                setIsBookmarked(false);
            } else {
                list.push({
                    name: topicName,
                    shortDesc: guide.shortDesc || guide.overview?.slice(0, 80) || '',
                    skill: skill
                });
                setIsBookmarked(true);
            }
            localStorage.setItem(bookmarkKey, JSON.stringify(list));
        } catch {}
    };

    const handleSaveNote = (val) => {
        setPersonalNote(val);
        try {
            localStorage.setItem(noteKey, val);
            setNoteSaved(true);
            setTimeout(() => setNoteSaved(false), 2000);
        } catch {}
    };

    return (
        <AnimatePresence>
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    background: 'rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: '100%',
                        maxWidth: '820px',
                        maxHeight: '92vh',
                        background: 'var(--bg-elevated-1, #181818)',
                        borderRadius: '20px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '18px 24px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(16, 185, 129, 0.1))',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #a855f7, #10b981)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '22px',
                                flexShrink: 0,
                            }}>
                                📖
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#a855f7', letterSpacing: '0.06em' }}>
                                        Complete Topic Guide
                                    </span>
                                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                                        {skill}
                                    </span>
                                </div>
                                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', marginTop: '2px', letterSpacing: '-0.01em' }}>
                                    {topicName}
                                </h2>
                            </div>
                        </div>

                        {/* Action Buttons: Bookmark & Close */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                onClick={toggleBookmark}
                                title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Topic'}
                                style={{
                                    padding: '7px 12px',
                                    borderRadius: '10px',
                                    background: isBookmarked ? 'rgba(192, 132, 252, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                                    border: isBookmarked ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.1)',
                                    color: isBookmarked ? '#c084fc' : 'var(--text-secondary)',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                }}
                            >
                                <Bookmark size={14} fill={isBookmarked ? '#c084fc' : 'none'} />
                                <span>{isBookmarked ? 'Saved' : 'Bookmark'}</span>
                            </button>

                            <button
                                onClick={onClose}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Mode Toggle: ELI5 vs Senior Deep Dive */}
                    <div style={{
                        padding: '10px 24px',
                        background: 'rgba(0, 0, 0, 0.35)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                Explanation Mode:
                            </span>
                            <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.06)', padding: '3px', borderRadius: '10px' }}>
                                <button
                                    onClick={() => setExplainMode('eli5')}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: '8px',
                                        background: explainMode === 'eli5' ? '#a855f7' : 'transparent',
                                        color: '#fff',
                                        fontSize: '12px',
                                        fontWeight: 800,
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    <Baby size={13} />
                                    <span>Explain Like I'm 5 (Analogy)</span>
                                </button>

                                <button
                                    onClick={() => setExplainMode('deep')}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: '8px',
                                        background: explainMode === 'deep' ? '#10b981' : 'transparent',
                                        color: explainMode === 'deep' ? '#000' : 'var(--text-secondary)',
                                        fontSize: '12px',
                                        fontWeight: 800,
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    <Zap size={13} />
                                    <span>Senior Engineer Deep Dive</span>
                                </button>
                            </div>
                        </div>

                        {/* Playground Quick Link */}
                        {guide.playgroundUrl && (
                            <a
                                href={guide.playgroundUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: '#38bdf8',
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    background: 'rgba(56, 189, 248, 0.1)',
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(56, 189, 248, 0.25)',
                                }}
                            >
                                <Terminal size={13} />
                                <span>Run in Online Playground</span>
                                <ExternalLink size={11} />
                            </a>
                        )}
                    </div>

                    {/* Body Content */}
                    <div style={{
                        padding: '24px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                    }}>
                        {/* 1. Dynamic Overview: ELI5 vs Deep Dive */}
                        <div style={{
                            padding: '16px 20px',
                            borderRadius: '14px',
                            background: explainMode === 'eli5' ? 'rgba(168, 85, 247, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                            border: `1.5px solid ${explainMode === 'eli5' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                            transition: 'all 0.2s ease',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <Lightbulb size={18} color={explainMode === 'eli5' ? '#c084fc' : '#34d399'} />
                                <h3 style={{ fontSize: '15px', fontWeight: 800, color: explainMode === 'eli5' ? '#c084fc' : '#34d399' }}>
                                    {explainMode === 'eli5' ? '👶 Intuitive Analogy (Explain Like I\'m 5)' : '⚡ Senior Engineering Deep Dive'}
                                </h3>
                            </div>
                            <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                                {explainMode === 'eli5'
                                    ? (guide.analogyExplanation || guide.overview || guide.explanation)
                                    : (guide.overview || guide.explanation)}
                            </p>
                            {guide.whyItMatters && (
                                <p style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)', marginTop: '8px' }}>
                                    <strong>Why learn this:</strong> {guide.whyItMatters}
                                </p>
                            )}
                        </div>

                        {/* 2. Step-by-Step Starting Guide */}
                        {(guide.stepByStep || guide.howToStart) && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <Terminal size={18} color="#10b981" />
                                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>
                                        Step-by-Step Practical Implementation
                                    </h3>
                                </div>
                                <div style={{
                                    padding: '16px',
                                    borderRadius: '12px',
                                    background: 'var(--bg-elevated-2, #202020)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                }}>
                                    {Array.isArray(guide.stepByStep) ? (
                                        guide.stepByStep.map((step, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13.5px', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                                                <CheckCircle2 size={16} color="#10b981" style={{ marginTop: '3px', flexShrink: 0 }} />
                                                <span>{step}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                                            {guide.howToStart}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 3. Runnable Code Snippet */}
                        {guide.codeSnippet && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Code2 size={18} color="#60a5fa" />
                                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>
                                            Runnable Code Example
                                        </h3>
                                    </div>
                                    <button
                                        onClick={handleCopy}
                                        style={{
                                            padding: '5px 12px',
                                            borderRadius: '8px',
                                            background: copied ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            color: '#fff',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        {copied ? <Check size={13} /> : <Copy size={13} />}
                                        {copied ? 'Copied!' : 'Copy Code'}
                                    </button>
                                </div>

                                <div style={{
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    background: '#0d1117',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                }}>
                                    <div style={{
                                        padding: '8px 16px',
                                        background: '#161b22',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        color: '#8b949e',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <span>Code Sandbox / Practice Example</span>
                                        <span style={{ color: '#58a6ff' }}>{skill}</span>
                                    </div>
                                    <pre style={{
                                        margin: 0,
                                        padding: '16px',
                                        fontFamily: "'Fira Code', 'Courier New', monospace",
                                        fontSize: '13px',
                                        lineHeight: 1.55,
                                        color: '#e6edf3',
                                        overflowX: 'auto',
                                    }}>
                                        <code>{guide.codeSnippet}</code>
                                    </pre>
                                </div>
                                {guide.codeExplanation && (
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.4 }}>
                                        💡 {guide.codeExplanation}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* 4. Common Mistakes & Pitfalls */}
                        {(guide.commonMistakes || guide.mistakes) && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <AlertTriangle size={18} color="#f59e0b" />
                                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>
                                        Common Mistakes to Avoid
                                    </h3>
                                </div>
                                <div style={{
                                    padding: '14px 18px',
                                    borderRadius: '12px',
                                    background: 'rgba(245, 158, 11, 0.08)',
                                    border: '1px solid rgba(245, 158, 11, 0.25)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                }}>
                                    {Array.isArray(guide.commonMistakes) ? (
                                        guide.commonMistakes.map((m, idx) => (
                                            <div key={idx} style={{ fontSize: '13px', lineHeight: 1.5 }}>
                                                <strong style={{ color: '#fbbf24' }}>⚠️ Pitfall:</strong> {m.mistake}
                                                {m.fix && (
                                                    <div style={{ color: '#34d399', marginTop: '2px', marginLeft: '16px' }}>
                                                        ✓ <strong>Fix:</strong> {m.fix}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ fontSize: '13px', lineHeight: 1.5, color: '#fef08a' }}>
                                            ⚠️ {guide.commonMistakes}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 5. Personal Handwritten Study Notes */}
                        <div style={{
                            padding: '16px',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={16} color="#fbbf24" />
                                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                                        My Study Notes for this Topic
                                    </h3>
                                </div>
                                {noteSaved && <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>✓ Saved!</span>}
                            </div>
                            <textarea
                                value={personalNote}
                                onChange={(e) => handleSaveNote(e.target.value)}
                                placeholder="Jot down formulas, personal code tricks, or things to remember later..."
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: '#121212',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '13px',
                                    outline: 'none',
                                    resize: 'vertical',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>

                        {/* 6. External Links & Video Docs */}
                        {(guide.docUrl || guide.officialDocs) && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '10px',
                                paddingTop: '16px',
                                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                            }}>
                                <a
                                    href={guide.docUrl || guide.officialDocs}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        padding: '10px 18px',
                                        borderRadius: '10px',
                                        background: 'rgba(96, 165, 250, 0.12)',
                                        border: '1px solid rgba(96, 165, 250, 0.3)',
                                        color: '#60a5fa',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    <BookOpen size={16} />
                                    <span>Read Official Documentation</span>
                                    <ExternalLink size={14} />
                                </a>

                                <button
                                    onClick={onClose}
                                    style={{
                                        padding: '10px 22px',
                                        borderRadius: '10px',
                                        background: 'var(--accent, #1ed760)',
                                        border: 'none',
                                        color: '#000',
                                        fontSize: '13px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Done Learning
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
