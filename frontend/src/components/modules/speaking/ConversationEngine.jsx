import { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, RefreshCw, Sparkles, Send, Award, CheckCircle2, AlertCircle, Play, Square, MessageSquare, Mic, MicOff, RotateCcw, Bot, User, Check, Lightbulb, Settings2 } from 'lucide-react';
import { useSpeechRecognition } from '../../../hooks/useSpeechRecognition';
import { speakAIResponse, stopAllSpeech, getVoiceSettings } from '../../../services/voiceService';
import VoiceSettingsModal from './VoiceSettingsModal';
import { pythonAPI } from '../../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const SCENARIOS = [
    {
        id: 'interview',
        title: 'Tech Job Interview',
        icon: '💼',
        desc: 'Practice answering behavioral & technical questions for software and engineering roles.',
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
        desc: 'Structured speaking prompt cards with rigorous fluency, vocabulary, and grammar feedback.',
        initialPrompt: "Welcome to your English speaking assessment. Let's start with Part 1: Describe a city or place you have visited that left a strong impression on you."
    },
    {
        id: 'negotiation',
        title: 'Salary & Client Negotiation',
        icon: '🤝',
        desc: 'Assertive, polite professional communication for job offers, freelancing, and client pitches.',
        initialPrompt: "Thanks for meeting with me to discuss the offer. What compensation range and benefits are you targeting for this role?"
    }
];

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'actually', 'basically', 'literally', 'sort of'];

export default function ConversationEngine() {
    const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0]);
    const [difficulty, setDifficulty] = useState('Intermediate');
    const [messages, setMessages] = useState([]);
    const [isSpeakingAI, setIsSpeakingAI] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [loadingAI, setLoadingAI] = useState(false);
    const [autoSpeak, setAutoSpeak] = useState(true);
    const [hasStarted, setHasStarted] = useState(false);
    const [stats, setStats] = useState({ wpm: 0, fillerCount: 0, totalWords: 0 });
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [voiceSettings, setVoiceSettings] = useState(getVoiceSettings());

    const messagesEndRef = useRef(null);
    const speechStartTimeRef = useRef(null);
    const isMountedRef = useRef(true);

    const {
        transcript,
        interimTranscript,
        isListening,
        startListening,
        stopListening,
        resetTranscript
    } = useSpeechRecognition();

    // Clean unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            stopAllSpeech();
        };
    }, []);

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, transcript, interimTranscript, loadingAI]);

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

    // Master Speak Function
    const playAI = useCallback((text, onFinish = null) => {
        speakAIResponse(
            text,
            () => { if (isMountedRef.current) setIsSpeakingAI(true); },
            () => {
                if (isMountedRef.current) setIsSpeakingAI(false);
                if (onFinish) onFinish();
            }
        );
    }, []);

    const stopSpeakingAI = () => {
        stopAllSpeech();
        if (isMountedRef.current) setIsSpeakingAI(false);
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

    const handleEndSession = () => {
        stopSpeakingAI();
        stopListening();
        setHasStarted(false);
        setMessages([]);
        resetTranscript();
        setTextInput('');
    };

    // Send Turn to AI
    const handleSendMessage = async (explicitText = null) => {
        const text = (explicitText || transcript || textInput).trim();
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
                difficulty: difficulty
            });

            const aiReply = res?.reply || "That's a very interesting point! Could you elaborate a bit more on that?";
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
                const fallbackReply = "That makes sense! How did you handle the challenges that came with that?";
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Scenario Header */}
            <div style={{
                background: 'var(--bg-elevated-1)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>{selectedScenario.icon}</span>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#fff' }}>
                                {selectedScenario.title}
                            </h2>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                                {selectedScenario.desc}
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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

                    {/* Voice Engine Toggle & Settings */}
                    <button
                        onClick={() => setShowVoiceModal(true)}
                        title="Configure AI Voice / Switch between Browser and Cloud Voice"
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: voiceSettings.engine === 'cloud' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                            border: `1px solid ${voiceSettings.engine === 'cloud' ? '#a855f7' : '#10b981'}`,
                            color: voiceSettings.engine === 'cloud' ? '#c084fc' : '#34d399',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <Settings2 size={15} />
                        <span>{voiceSettings.engine === 'cloud' ? '⚡ Cloud Voice' : '🌐 Browser Voice'}</span>
                    </button>

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

            {/* Scenario Selector when idle */}
            {!hasStarted ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
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
                    {/* Live Status Bar */}
                    <div style={{
                        padding: '12px 18px',
                        borderRadius: '12px',
                        background: isSpeakingAI
                            ? 'rgba(168, 85, 247, 0.15)'
                            : isListening
                            ? 'rgba(239, 68, 68, 0.15)'
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {isSpeakingAI ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontWeight: 800, fontSize: '13px' }}>
                                    <Volume2 size={18} />
                                    <span>AI Partner is Speaking... (Listening paused)</span>
                                </div>
                            ) : isListening ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 800, fontSize: '13px' }}>
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                                    <span>Microphone Active — Listening to you... (Speak now)</span>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '13px' }}>
                                    <span>Microphone Paused · Click Mic or Type Answer</span>
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
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#f87171',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                End Session
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
                                        maxWidth: '85%',
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
                                            maxWidth: '82%',
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
                                                    Speaking Feedback ({msg.feedback.cefrScore || 'B2'})
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
                                    maxWidth: '85%',
                                }}>
                                    <span>{transcript} </span>
                                    <span style={{ color: '#fca5a5', fontStyle: 'italic' }}>{interimTranscript}</span>
                                    <span> 🎙️</span>
                                </div>
                            </div>
                        )}

                        {/* AI Loading Bubble */}
                        {loadingAI && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontSize: '13px', fontStyle: 'italic' }}>
                                <Bot size={18} className="animate-spin" />
                                <span>AI Partner is thinking...</span>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Microphone & Input Controller */}
                    <div style={{
                        padding: '16px',
                        borderRadius: '16px',
                        background: 'var(--bg-elevated-1)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                    }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            {/* Big Mic Button */}
                            <button
                                onClick={isListening ? stopListening : () => {
                                    speechStartTimeRef.current = Date.now();
                                    startListening();
                                }}
                                style={{
                                    width: '52px',
                                    height: '52px',
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
                                {isListening ? <Mic size={22} /> : <MicOff size={22} />}
                            </button>

                            {/* Manual Text / Edit Field */}
                            <input
                                placeholder={isListening ? "Listening continuously... (Speak or edit text)" : "Type your response here..."}
                                value={transcript || textInput}
                                onChange={e => {
                                    setTextInput(e.target.value);
                                }}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                style={{
                                    flex: 1,
                                    padding: '14px 18px',
                                    borderRadius: '12px',
                                    background: '#121212',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                }}
                            />

                            {/* Send Button */}
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={(!transcript && !textInput) || loadingAI}
                                style={{
                                    padding: '14px 20px',
                                    borderRadius: '12px',
                                    background: (!transcript && !textInput) || loadingAI ? 'rgba(255,255,255,0.06)' : '#10b981',
                                    border: 'none',
                                    color: (!transcript && !textInput) || loadingAI ? 'var(--text-muted)' : '#000',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    cursor: (!transcript && !textInput) || loadingAI ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                <Send size={15} />
                                <span>Send Answer</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
