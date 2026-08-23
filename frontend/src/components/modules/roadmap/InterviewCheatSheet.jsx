import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Copy, Check, FileCode2, Award, Sparkles } from 'lucide-react';

export default function InterviewCheatSheet({ questions = [], cheatSheet = [], skillName = '' }) {
    const [openIndex, setOpenIndex] = useState(0);
    const [copiedIndex, setCopiedIndex] = useState(null);

    const handleCopy = (snippet, index) => {
        navigator.clipboard.writeText(snippet);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Top Interview Questions */}
            {questions && questions.length > 0 && (
                <div style={{
                    padding: '24px',
                    borderRadius: '16px',
                    background: 'var(--bg-elevated-1)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <HelpCircle size={20} color="#fbbf24" />
                        <div>
                            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff' }}>
                                Top Interview Questions & Answers ({skillName})
                            </h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Master the key questions hiring managers and technical leads ask
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {questions.map((q, idx) => {
                            const isOpen = openIndex === idx;
                            return (
                                <div
                                    key={idx}
                                    style={{
                                        borderRadius: '12px',
                                        background: isOpen ? 'rgba(251, 191, 36, 0.04)' : 'var(--bg-elevated-2)',
                                        border: isOpen ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                                        overflow: 'hidden',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <div
                                        onClick={() => setOpenIndex(isOpen ? null : idx)}
                                        style={{
                                            padding: '14px 18px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            gap: '12px',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                background: 'rgba(251, 191, 36, 0.15)',
                                                color: '#fbbf24',
                                                fontSize: '12px',
                                                fontWeight: 800,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                Q{idx + 1}
                                            </span>
                                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                {q.question}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {q.difficulty && (
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: '8px',
                                                    background: q.difficulty === 'Hard' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                    color: q.difficulty === 'Hard' ? '#f87171' : '#34d399',
                                                }}>
                                                    {q.difficulty}
                                                </span>
                                            )}
                                            {isOpen ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                                        </div>
                                    </div>

                                    {isOpen && (
                                        <div style={{
                                            padding: '14px 18px 18px 52px',
                                            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                                            fontSize: '13.5px',
                                            lineHeight: 1.6,
                                            color: 'var(--text-secondary)',
                                            background: 'rgba(0, 0, 0, 0.2)',
                                        }}>
                                            <strong style={{ color: '#10b981', display: 'block', marginBottom: '4px' }}>Model Answer:</strong>
                                            {q.answer}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Quick Syntax Cheat Sheet */}
            {cheatSheet && cheatSheet.length > 0 && (
                <div style={{
                    padding: '24px',
                    borderRadius: '16px',
                    background: 'var(--bg-elevated-1)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <FileCode2 size={20} color="#60a5fa" />
                        <div>
                            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff' }}>
                                Quick Syntax & Commands Cheat Sheet
                            </h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Handy reference for essential patterns, terminal commands, and idioms
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                        {cheatSheet.map((card, idx) => (
                            <div
                                key={idx}
                                style={{
                                    padding: '16px',
                                    borderRadius: '12px',
                                    background: 'var(--bg-elevated-2)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: '10px',
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                                        {card.category}
                                    </div>
                                    <pre style={{
                                        margin: 0,
                                        padding: '10px 12px',
                                        background: '#0d1117',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        fontFamily: "'Fira Code', 'Courier New', monospace",
                                        fontSize: '12.5px',
                                        lineHeight: 1.45,
                                        color: '#34d399',
                                        overflowX: 'auto',
                                        whiteSpace: 'pre-wrap',
                                    }}>
                                        <code>{card.snippet}</code>
                                    </pre>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                                        {card.explanation}
                                    </span>
                                    <button
                                        onClick={() => handleCopy(card.snippet, idx)}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            background: copiedIndex === idx ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                                            border: 'none',
                                            color: '#fff',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {copiedIndex === idx ? <Check size={11} /> : <Copy size={11} />}
                                        {copiedIndex === idx ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
