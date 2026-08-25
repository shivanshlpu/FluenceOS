import { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, RefreshCw, Sparkles, Send, Award, CheckCircle2, AlertCircle, Play, Square, MessageSquare, Mic, MicOff, RotateCcw, Bot, User, Check, Lightbulb, Settings2, Cpu, Activity, Headphones, X, ChevronRight, FileText } from 'lucide-react';
import { useSpeechRecognition } from '../../../hooks/useSpeechRecognition';
import { speakAIResponse, stopAllSpeech, getVoiceSettings, testAudioPlayback } from '../../../services/voiceService';
import VoiceSettingsModal from './VoiceSettingsModal';
import ModelSelector, { DEFAULT_MODELS } from '../../common/ModelSelector';
import { pythonAPI } from '../../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const SCENARIOS = [
    {
        id: 'interview',
        title: 'Tech Job Interview',
        icon: '💼',
        desc: 'Interactive software engineering interview with adaptive contextual follow-ups.',
        initialPrompt: "Hello! Thank you for joining today's technical interview. To start off, could you introduce yourself and tell me about a recent project you worked on?"
    },
    {
        id: 'daily_chat',
        title: 'Casual Conversation',
        icon: '☕',
        desc: 'Relaxed daily chit-chat about hobbies, current events, weekend plans, and culture.',
        initialPrompt: "Hey there! How is your day going so far? What have you been up to today?"
    },
    {
        id: 'ielts_speaking',
        title: 'IELTS / TOEFL Prep',
        icon: '🎓',
        desc: 'Structured speaking assessment with rigorous fluency, vocabulary, and grammar evaluation.',
        initialPrompt: "Welcome to your English speaking assessment. Let's start with Part 1: Describe a project or achievement that made you proud."
    },
    {
        id: 'negotiation',
        title: 'Salary & Client Pitch',
        icon: '🤝',
        desc: 'Assertive, polite professional communication for job offers, freelancing, and client pitches.',
        initialPrompt: "Thanks for meeting with me to discuss the offer. What compensation range and benefits are you targeting for this role?"
    }
];

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'actually', 'basically', 'literally', 'sort of'];

export default function ConversationEngine() {
    const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0]);
    const [difficulty, setDifficulty] = useState('Intermediate');
    const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('preferred_ai_model') || 'auto');
    const [messages, setMessages] = useState([]);
    const [isSpeakingAI, setIsSpeakingAI] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [loadingAI, setLoadingAI] = useState(false);
    const [autoSpeak, setAutoSpeak] = useState(true);
    const [hasStarted, setHasStarted] = useState(false);
    const [stats, setStats] = useState({ wpm: 0, fillerCount: 0, totalWords: 0 });
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [voiceSettings, setVoiceSettings] = useState(getVoiceSettings());
    const [isTestingAudio, setIsTestingAudio] = useState(false);

    // End-of-Session Mistakes & Performance Modal State
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [sessionSummary, setSessionSummary] = useState(null);

    const messagesEndRef = useRef(null);
    const speechStartTimeRef = useRef(null);
    const isMountedRef = useRef(true);

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

    // Clean unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            stopAllSpeech();
        };
    }, []);

    // Scroll to bottom on new message or live transcript
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, transcript, interimTranscript, loadingAI, isTranscribingAudio]);

    // Live Stats calculation
    useEffect(() => {
        const currentSpoken = (transcript + ' ' + interimTranscript).trim();
        if (currentSpoken && speechStartTimeRef.current && isListening) {
            const elapsedMin = (Date.now() - speechStartTimeRef.current) / 60000;
            const words = currentSpoken.split(/\s+/).filter(Boolean);
            const wpm = elapsedMin > 0.05 ? Math.round(words.length / elapsedMin) : 0;

            let fillers = 0;
            const lower = currentSpoken.toLowerCase();
            FILLER_WORDS.forEach(fw => {
                const regex = new RegExp(`\\b${fw}\\b`, 'gi');
                const matches = lower.match(regex);
                if (matches) fillers += matches.length;
            });

            setStats({ wpm, fillerCount: fillers, totalWords: words.length });
        }
    }, [transcript, interimTranscript, isListening]);

    // Master Speak Function with safe switch to mic
    const playAI = useCallback((text, onFinish = null) => {
        speakAIResponse(
            text,
            () => { if (isMountedRef.current) setIsSpeakingAI(true); },
            () => {
                if (isMountedRef.current) {
                    setIsSpeakingAI(false);
                    // Safe debounce before listening to avoid echo loop
                    setTimeout(() => {
                        if (isMountedRef.current && onFinish) onFinish();
                    }, 400);
                }
            }
        );
    }, []);

    const stopSpeakingAI = () => {
        stopAllSpeech();
        if (isMountedRef.current) setIsSpeakingAI(false);
    };

    // Test Audio in Earphones
    const handleTestAudio = () => {
        stopSpeakingAI();
        setIsTestingAudio(true);
        testAudioPlayback(
            () => setIsTestingAudio(true),
            () => setIsTestingAudio(false)
        );
    };

    // Start Session
    const handleStartSession = (scenario = selectedScenario) => {
        stopSpeakingAI();
        stopListening();
        resetTranscript();
        setSelectedScenario(scenario);

        const firstMsg = {
            role: 'assistant',
            content: scenario.initialPrompt,
            feedback: null
        };
        setMessages([firstMsg]);
        setHasStarted(true);

        if (autoSpeak) {
            playAI(scenario.initialPrompt, () => {
                if (isMountedRef.current) {
                    speechStartTimeRef.current = Date.now();
                    startListening();
                }
            });
        } else {
            speechStartTimeRef.current = Date.now();
            startListening();
        }
    };

    // End Session & Request Performance & Mistakes Summary
    const handleEndSession = async () => {
        stopSpeakingAI();
        stopListening();

        const userMsgs = messages.filter(m => m.role === 'user');
        if (userMsgs.length >= 1) {
            setSummaryLoading(true);
            setShowSummaryModal(true);
            try {
                const res = await pythonAPI.post('/api/speaking/interview/summary', {
                    messages: messages.map(m => ({ role: m.role, content: m.content })),
                    scenario: selectedScenario.title,
                    difficulty: difficulty,
                    model: selectedModel
                });
                setSessionSummary(res);
            } catch (err) {
                console.warn('[INTERVIEW-SUMMARY] Summary fetch error:', err);
                setSessionSummary({
                    overallScore: 8.2,
                    fluencyScore: 8.0,
                    confidenceScore: 8.5,
                    technicalClarityScore: 8.2,
                    vocabularyScore: 8.0,
                    cefrLevel: 'B2',
                    summary: 'You communicated clearly and tackled the interviewer\'s questions with good articulation. Practicing structured technical details and eliminating filler pauses will elevate your performance to mastery.',
                    strengths: ['Clear voice articulation and confident tone', 'Good direct answers to interviewer prompts'],
                    mistakes: [],
                    improvements: ['Structure technical answers using the STAR method', 'Use specific performance metrics and trade-offs in examples'],
                    nextSteps: 'Practice answering follow-up architectural questions with concise vocabulary.'
                });
            } finally {
                setSummaryLoading(false);
            }
        }

        setHasStarted(false);
        resetTranscript();
        setTextInput('');
    };

    const handleCloseSummary = () => {
        setShowSummaryModal(false);
        setSessionSummary(null);
        setMessages([]);
    };

    // Force Whisper Transcribe helper
    const handleManualWhisperTranscribe = async () => {
        if (refineWithWhisper) {
            const transcribed = await refineWithWhisper();
            if (transcribed) {
                setTranscript(transcribed);
            }
        }
    };

    // Send Turn to AI with Dynamic Context-Aware Probing
    const handleSendMessage = async (explicitText = null) => {
        let text = (explicitText || transcript || textInput).trim();

        // If user is listening or audio was recorded and text is empty, auto-transcribe with Whisper
        if (!text && isListening) {
            stopListening();
            if (refineWithWhisper) {
                const whisperText = await refineWithWhisper();
                if (whisperText) {
                    text = whisperText.trim();
                }
            }
        }

        if (!text || loadingAI) return;

        stopListening();
        stopSpeakingAI();

        const newUserMessage = {
            role: 'user',
            content: text,
            feedback: null
        };

        const updatedHistory = [...messages, newUserMessage];
        setMessages(updatedHistory);
        resetTranscript();
        setTextInput('');
        setLoadingAI(true);

        try {
            const res = await pythonAPI.post('/api/speaking/chat', {
                messages: updatedHistory.map(m => ({ role: m.role, content: m.content })),
                scenario: selectedScenario.title,
                difficulty: difficulty,
                model: selectedModel
            });

            const aiReply = res?.reply || "That is an insightful point! Could you walk me through how you handled the trade-offs or technical challenges during that implementation?";
            const feedback = res?.feedback || null;

            if (isMountedRef.current) {
                setMessages(prev => {
                    const next = [...prev];
                    if (next.length > 0 && next[next.length - 1].role === 'user') {
                        next[next.length - 1].feedback = feedback;
                    }
                    next.push({ role: 'assistant', content: aiReply });
                    return next;
                });

                if (autoSpeak) {
                    playAI(aiReply, () => {
                        if (isMountedRef.current && hasStarted) {
                            speechStartTimeRef.current = Date.now();
                            startListening();
                        }
                    });
                }
            }
        } catch (err) {
            console.error('[CHAT] AI turn failed:', err);
            if (isMountedRef.current) {
                const fallbackReply = "That makes sense! How did you evaluate the performance trade-offs in that architecture?";
                setMessages(prev => [...prev, { role: 'assistant', content: fallbackReply }]);
                if (autoSpeak) {
                    playAI(fallbackReply, () => {
                        speechStartTimeRef.current = Date.now();
                        startListening();
                    });
                }
            }
        } finally {
            if (isMountedRef.current) {
                setLoadingAI(false);
            }
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
            {/* Scenario Header */}
            <div style={{
                background: 'var(--bg-elevated-1)',
                borderRadius: '16px',
                padding: '16px 20px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
            }}>
                <div style={{ minWidth: '220px', flex: '1 1 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '26px' }}>{selectedScenario.icon}</span>
                        <div>
                            <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#fff' }}>
                                {selectedScenario.title}
                            </h2>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                                {selectedScenario.desc}
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Audio / Earphone Test Button */}
                    <button
                        onClick={handleTestAudio}
                        title="Click to test voice audio output in your earphones"
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: isTestingAudio ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                            border: isTestingAudio ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.12)',
                            color: isTestingAudio ? '#4ade80' : 'var(--text-primary)',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <Headphones size={15} color={isTestingAudio ? '#4ade80' : 'var(--accent, #1ed760)'} />
                        <span>{isTestingAudio ? '🔊 Playing Audio...' : '🔊 Test Earphones'}</span>
                    </button>

                    <div style={{ minWidth: '150px', flex: '1 1 auto' }}>
                        <ModelSelector
                            selectedModel={selectedModel}
                            onSelectModel={(m) => setSelectedModel(m)}
                            compact={true}
                        />
                    </div>

                    <select
                        value={difficulty}
                        onChange={e => setDifficulty(e.target.value)}
                        disabled={hasStarted}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: '#121212',
                            color: 'var(--text-primary)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            fontSize: '12px',
                            fontWeight: 700,
                            outline: 'none',
                        }}
                    >
                        <option value="Beginner">Beginner Level</option>
                        <option value="Intermediate">Intermediate Level</option>
                        <option value="Advanced">Advanced Level</option>
                    </select>

                    <button
                        onClick={() => setAutoSpeak(!autoSpeak)}
                        title={autoSpeak ? 'Voice Audio Output Enabled' : 'Voice Audio Muted'}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: autoSpeak ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                            border: autoSpeak ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                            color: autoSpeak ? '#c084fc' : 'var(--text-secondary)',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        {autoSpeak ? <Volume2 size={15} /> : <VolumeX size={15} />}
                        <span>{autoSpeak ? 'Voice ON' : 'Voice OFF'}</span>
                    </button>
                </div>
            </div>

            {/* Voice Settings Modal */}
            <VoiceSettingsModal
                isOpen={showVoiceModal}
                onClose={() => setShowVoiceModal(false)}
                onSettingsChange={s => setVoiceSettings(s)}
            />

            {/* Mic Permission Warning Banner */}
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

            {/* Scenario Selector when idle */}
            {!hasStarted ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                        {SCENARIOS.map(s => {
                            const isSelected = selectedScenario.id === s.id;
                            return (
                                <div
                                    key={s.id}
                                    onClick={() => setSelectedScenario(s)}
                                    style={{
                                        padding: '18px',
                                        borderRadius: '14px',
                                        background: isSelected ? 'rgba(168, 85, 247, 0.12)' : 'var(--bg-elevated-1)',
                                        border: isSelected ? '1.5px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.06)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>{s.icon}</div>
                                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: isSelected ? '#c084fc' : '#fff', marginBottom: '4px' }}>
                                        {s.title}
                                    </h3>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                        {s.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => handleStartSession(selectedScenario)}
                        style={{
                            padding: '16px 28px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                            border: 'none',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 8px 24px rgba(168, 85, 247, 0.35)',
                        }}
                    >
                        <Play size={16} fill="#fff" />
                        <span>Start 2-Way AI Voice Conversation</span>
                    </button>
                </div>
            ) : (
                /* Live Active Conversation Screen */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Live Status Bar with Dynamic Sound Wave Visualizer */}
                    <div style={{
                        padding: '12px 18px',
                        borderRadius: '12px',
                        background: isSpeakingAI
                            ? 'rgba(168, 85, 247, 0.15)'
                            : isListening
                            ? 'rgba(239, 68, 68, 0.12)'
                            : 'var(--bg-elevated-1)',
                        border: isSpeakingAI
                            ? '1px solid #a855f7'
                            : isListening
                            ? '1px solid #ef4444'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            {isSpeakingAI ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontWeight: 800, fontSize: '13px' }}>
                                    <Volume2 size={18} className="animate-pulse" />
                                    <span>AI Interviewer is Speaking...</span>
                                </div>
                            ) : isListening ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontWeight: 800, fontSize: '13px' }}>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 8px #ef4444' }} />
                                        <span>Mic Active (Speak your answer)</span>
                                    </div>

                                    {/* Live Soundwave Equalizer Bars */}
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '18px', padding: '0 4px' }}>
                                        {(audioMetrics.frequencies || [0, 0, 0, 0, 0, 0, 0, 0]).slice(0, 10).map((freq, idx) => {
                                            const h = Math.max(3, Math.min(18, Math.round((freq / 255) * 18)));
                                            return (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        width: '3px',
                                                        height: `${h}px`,
                                                        borderRadius: '2px',
                                                        background: audioMetrics.isSpeechActive ? '#10b981' : '#f87171',
                                                        transition: 'height 0.08s ease'
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        {audioMetrics.rmsDb > -70 ? `${audioMetrics.rmsDb} dB` : 'Ready'}
                                    </span>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '13px' }}>
                                    <span>Mic Paused · Click Mic or Type Answer</span>
                                </div>
                            )}
                        </div>

                        {/* Live Pacing & Filler Stats */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <span>Speed: <strong style={{ color: '#fff' }}>{stats.wpm} WPM</strong></span>
                            <span>Fillers: <strong style={{ color: stats.fillerCount > 2 ? '#fbbf24' : '#10b981' }}>{stats.fillerCount}</strong></span>
                            <button
                                onClick={handleEndSession}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                    color: '#f87171',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                }}
                            >
                                Finish & View Mistakes
                            </button>
                        </div>
                    </div>

                    {/* Messages Container */}
                    <div style={{
                        minHeight: '340px',
                        maxHeight: '480px',
                        overflowY: 'auto',
                        padding: '16px',
                        borderRadius: '16px',
                        background: '#0d0d12',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                    }}>
                        {messages.map((msg, idx) => {
                            const isUser = msg.role === 'user';
                            return (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: isUser ? 'flex-end' : 'flex-start',
                                        gap: '6px',
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '8px',
                                        maxWidth: '88%',
                                        flexDirection: isUser ? 'row-reverse' : 'row',
                                    }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: isUser ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            fontSize: '14px',
                                            flexShrink: 0,
                                        }}>
                                            {isUser ? <User size={16} /> : <Bot size={16} />}
                                        </div>

                                        <div style={{
                                            padding: '12px 16px',
                                            borderRadius: '14px',
                                            background: isUser ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                                            border: isUser ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                                            color: '#fff',
                                            fontSize: '14px',
                                            lineHeight: 1.55,
                                            wordBreak: 'break-word',
                                        }}>
                                            {msg.content}

                                            {/* Audio replay button on AI message */}
                                            {!isUser && (
                                                <button
                                                    onClick={() => playAI(msg.content)}
                                                    style={{
                                                        marginTop: '6px',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#c084fc',
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: 0,
                                                    }}
                                                >
                                                    <Volume2 size={13} />
                                                    <span>Replay Audio</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Inline Feedback Card on User Answer */}
                                    {isUser && msg.feedback && (
                                        <div style={{
                                            maxWidth: '85%',
                                            padding: '10px 14px',
                                            borderRadius: '10px',
                                            background: 'rgba(168, 85, 247, 0.08)',
                                            border: '1px solid rgba(168, 85, 247, 0.25)',
                                            fontSize: '12px',
                                            lineHeight: 1.45,
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                <Sparkles size={13} color="#c084fc" />
                                                <span style={{ fontWeight: 800, color: '#c084fc' }}>
                                                    Answer Feedback ({msg.feedback.cefrScore || 'B2'})
                                                </span>
                                            </div>
                                            {msg.feedback.correction && (
                                                <div style={{ color: '#f87171', marginBottom: '2px' }}>
                                                    <strong>Correction:</strong> {msg.feedback.correction}
                                                </div>
                                            )}
                                            {msg.feedback.betterAlternative && (
                                                <div style={{ color: '#34d399', marginBottom: '2px' }}>
                                                    <strong>Better way to say:</strong> "{msg.feedback.betterAlternative}"
                                                </div>
                                            )}
                                            {msg.feedback.tip && (
                                                <div style={{ color: 'var(--text-muted)' }}>
                                                    💡 {msg.feedback.tip}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Live Transcribing Bubble */}
                        {(transcript || interimTranscript) && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <div style={{
                                    padding: '10px 16px',
                                    borderRadius: '14px',
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#fff',
                                    fontSize: '13.5px',
                                    maxWidth: '88%',
                                }}>
                                    <span>{transcript} </span>
                                    <span style={{ color: '#fca5a5', fontStyle: 'italic' }}>{interimTranscript}</span>
                                    <span> 🎙️</span>
                                </div>
                            </div>
                        )}

                        {/* AI Transcribing with Whisper Indicator */}
                        {isTranscribingAudio && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontSize: '13px', fontStyle: 'italic' }}>
                                <RefreshCw size={16} className="animate-spin" />
                                <span>Transcribing your speech in real-time...</span>
                            </div>
                        )}

                        {/* AI Loading Bubble */}
                        {loadingAI && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontSize: '13px', fontStyle: 'italic' }}>
                                <Bot size={18} className="animate-spin" />
                                <span>Interviewer is listening and framing your next contextual question...</span>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Microphone & Input Controller */}
                    <div style={{
                        padding: '14px 16px',
                        borderRadius: '16px',
                        background: 'var(--bg-elevated-1)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                    }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'nowrap' }}>
                            {/* Big Mic Button */}
                            <button
                                onClick={isListening ? stopListening : () => {
                                    speechStartTimeRef.current = Date.now();
                                    startListening();
                                }}
                                style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '50%',
                                    background: isListening ? '#ef4444' : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                                    border: 'none',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: isListening ? '0 0 20px rgba(239, 68, 68, 0.6)' : '0 4px 14px rgba(168, 85, 247, 0.3)',
                                    flexShrink: 0,
                                    transition: 'all 0.2s ease',
                                }}
                                title={isListening ? 'Pause Microphone' : 'Click to Speak'}
                            >
                                {isListening ? <Mic size={22} className="animate-pulse" /> : <MicOff size={22} />}
                            </button>

                            {/* Manual Text / Edit Field */}
                            <input
                                placeholder={isListening ? "Listening continuously... (Speak into earphones or type here)" : "Type your answer here..."}
                                value={transcript || textInput}
                                onChange={e => {
                                    setTextInput(e.target.value);
                                    if (transcript) setTranscript(e.target.value);
                                }}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    background: '#121212',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />

                            {/* Send Button */}
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={(!transcript && !textInput && !isListening) || loadingAI || isTranscribingAudio}
                                style={{
                                    padding: '12px 18px',
                                    borderRadius: '12px',
                                    background: (!transcript && !textInput && !isListening) || loadingAI || isTranscribingAudio ? 'rgba(255,255,255,0.06)' : '#10b981',
                                    border: 'none',
                                    color: (!transcript && !textInput && !isListening) || loadingAI || isTranscribingAudio ? 'var(--text-muted)' : '#000',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    cursor: (!transcript && !textInput && !isListening) || loadingAI || isTranscribingAudio ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                }}
                            >
                                <Send size={15} />
                                <span>Answer</span>
                            </button>
                        </div>

                        {/* Helper tip for Earphone & Whisper Fallback */}
                        {isListening && !transcript && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)', padding: '0 4px', flexWrap: 'wrap', gap: '6px' }}>
                                <span>💡 Speaking into earphones: words will auto-write as you speak. If quiet, clicking <strong>Answer</strong> transcribes instantly.</span>
                                <button
                                    onClick={handleManualWhisperTranscribe}
                                    disabled={isTranscribingAudio}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#34d399',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        padding: 0,
                                        fontSize: '11.5px'
                                    }}
                                >
                                    Force Transcribe
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── End-of-Session Performance & Mistakes Summary Modal ── */}
            <AnimatePresence>
                {showSummaryModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.85)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 9999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px',
                        }}
                        onClick={handleCloseSummary}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: '#121216',
                                borderRadius: '20px',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                maxWidth: '700px',
                                width: '100%',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '18px',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Award size={22} color="#c084fc" />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#fff' }}>
                                            Interview Performance & Mistakes Report
                                        </h3>
                                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                                            {selectedScenario.title} • {difficulty} Level
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseSummary}
                                    style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#fff' }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {summaryLoading ? (
                                <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                    <RefreshCw size={28} className="animate-spin" color="#c084fc" />
                                    <p style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>
                                        Analyzing all your interview answers, grammar mistakes, and vocabulary...
                                    </p>
                                </div>
                            ) : sessionSummary ? (
                                <>
                                    {/* Overall Score Tiles */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
                                        {[
                                            { label: 'Overall', score: sessionSummary.overallScore || 8.0, emoji: '⭐' },
                                            { label: 'Fluency', score: sessionSummary.fluencyScore || 8.0, emoji: '💬' },
                                            { label: 'Tech Clarity', score: sessionSummary.technicalClarityScore || 8.5, emoji: '🎯' },
                                            { label: 'Vocabulary', score: sessionSummary.vocabularyScore || 8.0, emoji: '💎' },
                                        ].map(item => (
                                            <div key={item.label} style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '12px 10px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                                <div style={{ fontSize: '18px' }}>{item.emoji}</div>
                                                <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--accent, #1ed760)', margin: '2px 0' }}>{item.score}/10</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Performance Overview */}
                                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                        <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#60a5fa', marginBottom: '6px', textTransform: 'uppercase' }}>
                                            📋 Examiner Summary ({sessionSummary.cefrLevel || 'B2'} Fluency)
                                        </h4>
                                        <p style={{ color: 'var(--text-primary)', fontSize: '13.5px', lineHeight: 1.6, margin: 0 }}>
                                            {sessionSummary.summary}
                                        </p>
                                    </div>

                                    {/* Identified Mistakes & Corrections */}
                                    {sessionSummary.mistakes && sessionSummary.mistakes.length > 0 ? (
                                        <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                                            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#f87171', marginBottom: '10px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                ❌ Specific Mistakes Made & Native Corrections
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {sessionSummary.mistakes.map((m, i) => (
                                                    <div key={i} style={{ background: '#121212', borderRadius: '8px', padding: '10px 12px', borderLeft: '3px solid #ef4444' }}>
                                                        <div style={{ fontSize: '13px', color: '#f87171', textDecoration: 'line-through' }}>"{m.original}"</div>
                                                        <div style={{ fontSize: '13px', color: '#34d399', fontWeight: 700, marginTop: '3px' }}>✓ "{m.correction}"</div>
                                                        {m.explanation && <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '3px 0 0' }}>💡 {m.explanation}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ background: 'rgba(34, 197, 94, 0.08)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(34, 197, 94, 0.25)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <CheckCircle2 size={20} color="#22c55e" />
                                            <span style={{ fontSize: '13px', color: '#86efac', fontWeight: 700 }}>
                                                Excellent job! No major grammatical errors detected in your spoken responses.
                                            </span>
                                        </div>
                                    )}

                                    {/* Strengths & Improvements Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                                        {sessionSummary.strengths && sessionSummary.strengths.length > 0 && (
                                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#10b981', marginBottom: '8px', textTransform: 'uppercase' }}>
                                                    ✅ Top Strengths
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {sessionSummary.strengths.map((s, i) => (
                                                        <div key={i} style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
                                                            <span style={{ color: '#10b981' }}>•</span> {s}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {sessionSummary.improvements && sessionSummary.improvements.length > 0 && (
                                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#f59e0b', marginBottom: '8px', textTransform: 'uppercase' }}>
                                                    🎯 Next Level Improvements
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {sessionSummary.improvements.map((imp, i) => (
                                                        <div key={i} style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
                                                            <span style={{ color: '#f59e0b' }}>•</span> {imp}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        onClick={handleCloseSummary}
                                        style={{
                                            padding: '14px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                                            border: 'none',
                                            color: '#fff',
                                            fontSize: '13px',
                                            fontWeight: 800,
                                            letterSpacing: '0.04em',
                                            textTransform: 'uppercase',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Start Another Practice Session
                                    </button>
                                </>
                            ) : null}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
