import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, XCircle, Award, Sparkles, ArrowRight, RotateCcw, HelpCircle } from 'lucide-react';

export default function PhaseQuizModal({ phase, skillName, onClose, onCompletePhase }) {
    const questions = phase?.quiz || [
        {
            question: `What is the primary goal when starting ${phase?.title || 'this phase'}?`,
            options: [
                "Skip testing and deploy immediately",
                "Understand fundamental concepts and build runnable examples",
                "Memorize syntax without running code",
                "Avoid using official documentation"
            ],
            correctIndex: 1,
            explanation: "Building minimal working examples and reading documentation ensures long-term mastery."
        }
    ];

    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [userAnswers, setUserAnswers] = useState({});
    const [isFinished, setIsFinished] = useState(false);

    const currentQ = questions[currentIdx];
    const isAnswered = selectedOption !== null;
    const isCorrect = selectedOption === currentQ.correctIndex;

    const handleSelect = (optIdx) => {
        if (isAnswered) return;
        setSelectedOption(optIdx);
        setUserAnswers(prev => ({ ...prev, [currentIdx]: optIdx }));
    };

    const handleNext = () => {
        if (currentIdx + 1 < questions.length) {
            setCurrentIdx(prev => prev + 1);
            setSelectedOption(null);
        } else {
            setIsFinished(true);
        }
    };

    const handleRestart = () => {
        setCurrentIdx(0);
        setSelectedOption(null);
        setUserAnswers({});
        setIsFinished(false);
    };

    const correctCount = Object.keys(userAnswers).filter(idx => userAnswers[idx] === questions[idx]?.correctIndex).length;

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
                    padding: '20px',
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: '100%',
                        maxWidth: '620px',
                        background: 'var(--bg-elevated-1, #181818)',
                        borderRadius: '20px',
                        border: '1.5px solid rgba(251, 191, 36, 0.35)',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.08))',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px',
                                flexShrink: 0,
                            }}>
                                🧠
                            </div>
                            <div>
                                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#fbbf24', letterSpacing: '0.06em' }}>
                                    Knowledge Check Quiz
                                </span>
                                <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', marginTop: '2px' }}>
                                    {phase.title || `Phase ${phase.phase}`}
                                </h2>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            style={{
                                width: '34px',
                                height: '34px',
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

                    {/* Quiz Body */}
                    <div style={{ padding: '24px' }}>
                        {!isFinished ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Progress Indicator */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                    <span>Question {currentIdx + 1} of {questions.length}</span>
                                    <span>Score: {correctCount} / {currentIdx + (isAnswered ? 1 : 0)}</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${((currentIdx + 1) / questions.length) * 100}%`, height: '100%', background: '#fbbf24', transition: 'width 0.3s ease' }} />
                                </div>

                                {/* Question Title */}
                                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', lineHeight: 1.5, marginTop: '6px' }}>
                                    {currentQ.question}
                                </h3>

                                {/* Options List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {currentQ.options.map((opt, optIdx) => {
                                        let bg = 'var(--bg-elevated-2)';
                                        let border = '1px solid rgba(255, 255, 255, 0.06)';
                                        let textColor = 'var(--text-primary)';

                                        if (isAnswered) {
                                            if (optIdx === currentQ.correctIndex) {
                                                bg = 'rgba(16, 185, 129, 0.2)';
                                                border = '1.5px solid #10b981';
                                                textColor = '#34d399';
                                            } else if (optIdx === selectedOption) {
                                                bg = 'rgba(239, 68, 68, 0.2)';
                                                border = '1.5px solid #ef4444';
                                                textColor = '#f87171';
                                            }
                                        }

                                        return (
                                            <button
                                                key={optIdx}
                                                onClick={() => handleSelect(optIdx)}
                                                disabled={isAnswered}
                                                style={{
                                                    padding: '14px 18px',
                                                    borderRadius: '12px',
                                                    background: bg,
                                                    border: border,
                                                    color: textColor,
                                                    fontSize: '13.5px',
                                                    fontWeight: 600,
                                                    textAlign: 'left',
                                                    cursor: isAnswered ? 'default' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: '10px',
                                                    transition: 'all 0.15s ease',
                                                }}
                                            >
                                                <span>{opt}</span>
                                                {isAnswered && optIdx === currentQ.correctIndex && <CheckCircle2 size={18} color="#10b981" />}
                                                {isAnswered && optIdx === selectedOption && optIdx !== currentQ.correctIndex && <XCircle size={18} color="#ef4444" />}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Explanation Banner after Answer */}
                                {isAnswered && (
                                    <div style={{
                                        padding: '14px 16px',
                                        borderRadius: '10px',
                                        background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                        fontSize: '13px',
                                        lineHeight: 1.5,
                                        color: isCorrect ? '#34d399' : '#fca5a5',
                                    }}>
                                        <strong>{isCorrect ? '✓ Correct!' : '✗ Incorrect:'}</strong> {currentQ.explanation}
                                    </div>
                                )}

                                {/* Next Button */}
                                {isAnswered && (
                                    <button
                                        onClick={handleNext}
                                        style={{
                                            padding: '12px 24px',
                                            borderRadius: '10px',
                                            background: '#fbbf24',
                                            color: '#000',
                                            fontSize: '13px',
                                            fontWeight: 800,
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            marginTop: '8px',
                                        }}
                                    >
                                        <span>{currentIdx + 1 === questions.length ? 'View Results' : 'Next Question'}</span>
                                        <ArrowRight size={16} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            /* Results Screen */
                            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '12px 0' }}>
                                <div style={{
                                    width: '72px',
                                    height: '72px',
                                    borderRadius: '50%',
                                    background: correctCount === questions.length ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '36px',
                                    boxShadow: '0 8px 25px rgba(251, 191, 36, 0.4)',
                                }}>
                                    {correctCount === questions.length ? '🏆' : '⭐'}
                                </div>

                                <div>
                                    <h3 style={{ fontSize: '22px', fontWeight: 900, color: '#fff' }}>
                                        {correctCount === questions.length ? 'Mastery Achieved!' : 'Quiz Completed!'}
                                    </h3>
                                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                        You scored <strong>{correctCount}</strong> out of <strong>{questions.length}</strong> correct on {phase.title}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                    <button
                                        onClick={handleRestart}
                                        style={{
                                            padding: '10px 18px',
                                            borderRadius: '10px',
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            color: '#fff',
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}
                                    >
                                        <RotateCcw size={14} />
                                        <span>Try Again</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (onCompletePhase) onCompletePhase(phase.phase);
                                            onClose();
                                        }}
                                        style={{
                                            padding: '10px 22px',
                                            borderRadius: '10px',
                                            background: '#10b981',
                                            color: '#000',
                                            fontSize: '13px',
                                            fontWeight: 800,
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}
                                    >
                                        <CheckCircle2 size={15} />
                                        <span>Complete & Close</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
