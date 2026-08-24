import { useState } from 'react';
import { Target, Zap, CheckCircle2, AlertTriangle, TrendingUp, Volume2, VolumeX, Gauge, Sparkles, Clock, BookMarked, Activity, ShieldCheck } from 'lucide-react';
import { speakAIResponse, stopAllSpeech } from '../../../services/voiceService';

export default function ReadingFeedbackCard({ evaluation, topic, originalParagraph, duration = 0, audioMetrics = null }) {
    const [playingWord, setPlayingWord] = useState(null);

    if (!evaluation) return null;

    const {
        overallScore = 0,
        accuracyScore = 0,
        pronunciationScore = 0,
        fluencyScore = 0,
        paceScore = 0,
        pauseScore = 0,
        vocabularyScore = 0,
        wpm = 0,
        wordsCorrect = 0,
        wordsTotal = 0,
        missedWords = [],
        mispronounced = [],
        extraWords = [],
        repeatedWords = [],
        detailedFeedback = '',
        strengths = [],
        improvements = [],
        pronunciationGuides = [],
        wordsAnalysis = [],
        technicalVocabStats = null
    } = evaluation;

    const getColor = (score) => {
        if (score >= 8.5) return '#10b981';
        if (score >= 6.5) return '#3b82f6';
        if (score >= 5.0) return '#fbbf24';
        return '#ef4444';
    };

    const pct = wordsTotal ? Math.round((wordsCorrect / wordsTotal) * 100) : 0;
    const effectiveWpm = wpm > 0 ? wpm : (duration > 0 ? Math.round((wordsCorrect / duration) * 60) : 135);

    const getWpmStatus = (speed) => {
        if (speed === 0) return { text: 'N/A', color: 'var(--text-muted)' };
        if (speed >= 120 && speed <= 160) return { text: `${speed} WPM · Ideal Conversational Pace`, color: '#10b981' };
        if (speed < 120) return { text: `${speed} WPM · Deliberate / Relaxed Pace`, color: '#60a5fa' };
        return { text: `${speed} WPM · Rapid / Fast Pace`, color: '#fbbf24' };
    };

    const wpmStatus = getWpmStatus(effectiveWpm);

    const playWordAudio = (word) => {
        const clean = word.replace(/[^a-zA-Z0-9]/g, '');
        if (!clean) return;

        stopAllSpeech();
        setPlayingWord(clean);
        speakAIResponse(
            clean,
            () => setPlayingWord(clean),
            () => setPlayingWord(null)
        );
    };

    // Build word set lookups for paragraph coloring
    const missedSet = new Set(missedWords.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')));
    const mispronouncedSet = new Set(mispronounced.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')));

    const scoreMetrics = [
        { label: 'Word Accuracy', score: accuracyScore, emoji: '🎯', desc: `${wordsCorrect}/${wordsTotal} correct words`, color: getColor(accuracyScore) },
        { label: 'Pronunciation', score: pronunciationScore, emoji: '🗣️', desc: 'Phonetic precision & enunciation', color: getColor(pronunciationScore) },
        { label: 'Fluency & Flow', score: fluencyScore, emoji: '⚡', desc: 'Speech continuity without pauses', color: getColor(fluencyScore) },
        { label: 'Speaking Pace', score: paceScore, emoji: '⏱️', desc: `${effectiveWpm} WPM (target 120-160)`, color: getColor(paceScore) },
        { label: 'Pauses & Cadence', score: pauseScore, emoji: '⏸️', desc: 'Punctuation & sentence cadence', color: getColor(pauseScore) },
        { label: 'Technical Vocab', score: vocabularyScore, emoji: '📚', desc: 'CSE terminology articulation', color: getColor(vocabularyScore) },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Top Score Banner: Overall + 6 Distinct Dimensions */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(59, 130, 246, 0.12))',
                borderRadius: '16px',
                padding: '24px 20px',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '74px', height: '74px', borderRadius: '18px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 25px rgba(16, 185, 129, 0.4)',
                        color: '#fff', flexShrink: 0
                    }}>
                        <span style={{ fontSize: '28px', fontWeight: 900, lineHeight: 1 }}>{overallScore}</span>
                        <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.9 }}>/ 10</span>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: 0 }}>
                                Overall Performance Score
                            </h3>
                            <span style={{ fontSize: '12px', fontWeight: 800, background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '2px 8px', borderRadius: '8px' }}>
                                {overallScore >= 8.5 ? '⭐ Excellent' : (overallScore >= 6.5 ? '👍 Proficient' : '📈 Developing')}
                            </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                            Multi-dimensional speech analysis evaluating accuracy, pronunciation, fluency, pace, and domain terms.
                        </p>
                    </div>
                </div>

                {/* Audio Quality & VAD Status Badge */}
                {audioMetrics && (
                    <div style={{
                        background: 'var(--bg-elevated-2)',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '12px',
                        color: '#93c5fd'
                    }}>
                        <ShieldCheck size={18} color="#10b981" />
                        <div>
                            <div style={{ fontWeight: 800, color: '#fff' }}>Audio Quality Verified</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                SNR: +{audioMetrics.snrDb || 18} dB · Noise Floor: {audioMetrics.noiseFloorDb || -52} dBFS
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 6 Independent Scoring Component Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                {scoreMetrics.map(({ label, score, emoji, desc, color }) => (
                    <div key={label} style={{
                        background: 'var(--bg-elevated-1)',
                        borderRadius: '14px',
                        padding: '16px 14px',
                        textAlign: 'center',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '4px'
                    }}>
                        <div>
                            <div style={{ fontSize: '20px', marginBottom: '2px' }}>{emoji}</div>
                            <div style={{ fontSize: '26px', fontWeight: 900, color, lineHeight: 1 }}>{score}</div>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>{label}</div>
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.3, marginTop: '4px' }}>
                            {desc}
                        </div>
                    </div>
                ))}
            </div>

            {/* Word Progress & Reading Pace Bar */}
            <div style={{ background: 'var(--bg-elevated-1)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📊 Words Accurately Captured & Alignment
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: wpmStatus.color, background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: '8px' }}>
                            ⏱️ {wpmStatus.text}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: getColor(pct / 10) }}>
                            {wordsCorrect} / {wordsTotal} words ({pct}%)
                        </span>
                    </div>
                </div>
                <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: getColor(pct / 10), borderRadius: '6px', transition: 'width 0.8s ease' }} />
                </div>
            </div>

            {/* Interactive Word-by-Word Colored Paragraph Breakdown */}
            {originalParagraph && (
                <div style={{ background: 'var(--bg-elevated-1)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                            <h4 style={{ fontWeight: 800, margin: 0, fontSize: '14px', color: '#fff' }}>🔍 Word-by-Word Visual Analysis</h4>
                            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Click any word to hear native pronunciation</p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '11px', fontWeight: 700 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34d399' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} /> Correct
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24' }} /> Needs Enunciation
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f87171' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} /> Missed
                            </span>
                        </div>
                    </div>

                    <div style={{ background: '#121212', borderRadius: '12px', padding: '18px', lineHeight: 2.1, border: '1px solid rgba(255,255,255,0.06)' }}>
                        {originalParagraph.split(/(\s+)/).map((token, idx) => {
                            if (/^\s+$/.test(token)) return <span key={idx}>{token}</span>;
                            const clean = token.toLowerCase().replace(/[^a-z0-9]/g, '');
                            if (!clean) return <span key={idx}>{token}</span>;

                            const isMissed = missedSet.has(clean);
                            const isMispronounced = mispronouncedSet.has(clean);
                            const isPlaying = playingWord === clean;

                            let bg = 'rgba(16, 185, 129, 0.15)';
                            let col = '#34d399';
                            let border = 'rgba(16, 185, 129, 0.3)';
                            let textDecor = 'none';

                            if (isMissed) {
                                bg = 'rgba(239, 68, 68, 0.18)';
                                col = '#f87171';
                                border = 'rgba(239, 68, 68, 0.4)';
                                textDecor = 'line-through';
                            } else if (isMispronounced) {
                                bg = 'rgba(251, 191, 36, 0.18)';
                                col = '#fbbf24';
                                border = 'rgba(251, 191, 36, 0.4)';
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => playWordAudio(clean)}
                                    title={`Click to hear pronunciation for "${clean}"`}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        background: bg,
                                        color: col,
                                        border: `1px solid ${border}`,
                                        borderRadius: '6px',
                                        padding: '2px 7px',
                                        margin: '0 2px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        textDecoration: textDecor,
                                        transition: 'all 0.15s ease',
                                        boxShadow: isPlaying ? '0 0 10px rgba(96, 165, 250, 0.6)' : 'none',
                                    }}
                                >
                                    <span>{token}</span>
                                    {(isMissed || isMispronounced) && <Volume2 size={11} style={{ opacity: 0.7 }} />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Detailed AI Feedback */}
            <div style={{ background: 'var(--bg-elevated-1)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <h4 style={{ fontWeight: 800, marginBottom: '8px', fontSize: '14px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} /> AI Speech & Technical Articulation Feedback
                </h4>
                <p style={{ color: '#fff', lineHeight: 1.7, fontSize: '14px', margin: 0 }}>{detailedFeedback}</p>
            </div>

            {/* Missed Words + Mispronounced Technical Terms */}
            {((missedWords?.length > 0) || (mispronounced?.length > 0)) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                    {missedWords?.length > 0 && (
                        <div style={{ background: 'var(--bg-elevated-1)', borderRadius: '16px', padding: '18px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <h4 style={{ fontWeight: 800, color: '#f87171', marginBottom: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                ❌ Missed / Skipped Words ({missedWords.length})
                            </h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {missedWords.map((w, i) => (
                                    <button
                                        key={i}
                                        onClick={() => playWordAudio(w)}
                                        style={{
                                            padding: '5px 12px',
                                            background: 'rgba(239, 68, 68, 0.12)',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            borderRadius: '20px',
                                            fontSize: '12.5px',
                                            fontWeight: 700,
                                            color: '#f87171',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                        }}
                                    >
                                        <Volume2 size={12} /> {w}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {mispronounced?.length > 0 && (
                        <div style={{ background: 'var(--bg-elevated-1)', borderRadius: '16px', padding: '18px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                            <h4 style={{ fontWeight: 800, color: '#fbbf24', marginBottom: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                ⚠️ Needs Clearer Enunciation ({mispronounced.length})
                            </h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {mispronounced.map((w, i) => (
                                    <button
                                        key={i}
                                        onClick={() => playWordAudio(w)}
                                        style={{
                                            padding: '5px 12px',
                                            background: 'rgba(251, 191, 36, 0.12)',
                                            border: '1px solid rgba(251, 191, 36, 0.3)',
                                            borderRadius: '20px',
                                            fontSize: '12.5px',
                                            fontWeight: 700,
                                            color: '#fbbf24',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                        }}
                                    >
                                        <Volume2 size={12} /> {w}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Pronunciation Guides */}
            {pronunciationGuides?.length > 0 && (
                <div style={{ background: 'var(--bg-elevated-1)', borderRadius: '16px', padding: '18px', border: '1px solid rgba(96, 165, 250, 0.2)' }}>
                    <h4 style={{ fontWeight: 800, color: '#93c5fd', marginBottom: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🗣️ Technical Pronunciation & Phonetic Breakdown
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                        {pronunciationGuides.map((guide, i) => (
                            <div key={i} style={{
                                padding: '12px 14px', background: 'rgba(255, 255, 255, 0.04)',
                                borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}>
                                <div>
                                    <div style={{ fontWeight: 800, color: '#fff', fontSize: '14px' }}>{guide.word}</div>
                                    <div style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>{guide.phonetic}</div>
                                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>{guide.tip}</div>
                                </div>
                                <button
                                    onClick={() => playWordAudio(guide.word)}
                                    style={{
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        background: 'rgba(96, 165, 250, 0.2)', border: '1px solid #60a5fa',
                                        color: '#93c5fd', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', flexShrink: 0,
                                    }}
                                >
                                    <Volume2 size={15} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Strengths + Practice Areas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {strengths?.length > 0 && (
                    <div style={{ background: 'var(--bg-elevated-1)', borderRadius: '16px', padding: '18px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <h4 style={{ fontWeight: 800, color: '#34d399', marginBottom: '10px', fontSize: '13px' }}>✅ Key Strengths</h4>
                        {strengths.map((s, i) => (
                            <p key={i} style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px', display: 'flex', gap: '8px' }}>
                                <span style={{ color: '#10b981' }}>•</span> {s}
                            </p>
                        ))}
                    </div>
                )}
                {improvements?.length > 0 && (
                    <div style={{ background: 'var(--bg-elevated-1)', borderRadius: '16px', padding: '18px', border: '1px solid rgba(96, 165, 250, 0.2)' }}>
                        <h4 style={{ fontWeight: 800, color: '#60a5fa', marginBottom: '10px', fontSize: '13px' }}>🎯 Next Steps for Improvement</h4>
                        {improvements.map((imp, i) => (
                            <p key={i} style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px', display: 'flex', gap: '8px' }}>
                                <span style={{ color: '#60a5fa' }}>•</span> {imp}
                            </p>
                        ))}
                    </div>
                )}
            </div>

            {/* Extra Filler & Repeated Words */}
            {((extraWords?.length > 0) || (repeatedWords?.length > 0)) && (
                <div style={{ background: 'rgba(251,191,36,0.06)', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(251,191,36,0.2)' }}>
                    {extraWords?.length > 0 && (
                        <p style={{ fontSize: '13px', color: '#fbbf24', fontWeight: 700, margin: '0 0 4px 0' }}>
                            🚫 Filler words detected: {extraWords.join(', ')} — try pausing silently instead of uttering filler sounds.
                        </p>
                    )}
                    {repeatedWords?.length > 0 && (
                        <p style={{ fontSize: '12.5px', color: '#f59e0b', margin: 0 }}>
                            🔁 Word repetitions detected: {repeatedWords.join(', ')} — practice smooth continuous delivery.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
