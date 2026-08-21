import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, RefreshCw, Sparkles, Send, Award, CheckCircle2, AlertCircle, Play, Square, MessageSquare } from 'lucide-react';
import { pythonAPI } from '../../../services/api';

const SCENARIOS = [
    {
        id: 'interview',
        title: 'Tech Job Interview',
        icon: '💼',
        desc: 'Practice answering behavioral & system design questions for software roles.',
        initialPrompt: "Hello! Thank you for joining today's technical interview. To start off, could you briefly introduce yourself and tell me about a challenging project you worked on recently?"
    },
    {
        id: 'daily_chat',
        title: 'Casual Conversation',
        icon: '☕',
        desc: 'Relaxed daily chit-chat about hobbies, current events, and weekend plans.',
        initialPrompt: "Hey there! How is your day going so far? Did you do anything interesting or fun today?"
    },
    {
        id: 'ielts_speaking',
        title: 'IELTS / TOEFL Prep',
        icon: '🎓',
        desc: 'Structured 2-minute prompt cards with rigorous fluency and vocabulary grading.',
        initialPrompt: "Welcome to your speaking assessment. Let's start with Part 1: Describe a city you have visited that left a strong impression on you."
    },
    {
        id: 'negotiation',
        title: 'Salary & Client Negotiation',
        icon: '🤝',
        desc: 'Assertive, polite professional communication for career and business growth.',
        initialPrompt: "Thanks for meeting with me to discuss the offer. What compensation range and benefits are you targeting for this role?"
    }
];

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'actually', 'basically', 'literally', 'sort of'];

export default function ConversationEngine() {
    const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0]);
    const [difficulty, setDifficulty] = useState('Intermediate');
    const [messages, setMessages] = useState([]);
    const [isListening, setIsListening] = useState(false);
    const [isSpeakingAI, setIsSpeakingAI] = useState(false);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [loadingAI, setLoadingAI] = useState(false);
    const [autoSpeak, setAutoSpeak] = useState(true);
    const [stats, setStats] = useState({ wpm: 0, fillerCount: 0, totalWords: 0 });

    const recognitionRef = useRef(null);
    const messagesEndRef = useRef(null);
    const speechStartTimeRef = useRef(null);
    const isMountedRef = useRef(true);

    const [hasStarted, setHasStarted] = useState(false);

    // Unmount cleanup: cancel speech and stop mic
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (window.speechSynthesis) {
                try { window.speechSynthesis.cancel(); } catch (e) {}
            }
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) {}
            }
        };
    }, []);

    const handleStartSession = (scenario = selectedScenario) => {
        stopSpeakingAI();
        setSelectedScenario(scenario);
        setMessages([
            {
                role: 'assistant',
                content: scenario.initialPrompt,
                feedback: null
            }
        ]);
        setHasStarted(true);
        if (autoSpeak) {
            speakText(scenario.initialPrompt);
        }
    };

    const handleEndSession = () => {
        stopSpeakingAI();
        if (isListening && recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) {}
            setIsListening(false);
        }
        setHasStarted(false);
        setMessages([]);
        setCurrentTranscript('');
    };

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentTranscript]);

    // Setup Web Speech Recognition once on mount
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                if (!isMountedRef.current) return;
                let interim = '';
                let final = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        final += event.results[i][0].transcript;
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }

                setCurrentTranscript(prev => {
                    const fullText = (prev + ' ' + final + ' ' + interim).trim();

                    // Calculate stats
                    if (speechStartTimeRef.current) {
                        const elapsedMin = (Date.now() - speechStartTimeRef.current) / 60000;
                        const words = fullText.split(/\s+/).filter(Boolean);
                        const wpm = elapsedMin > 0.05 ? Math.round(words.length / elapsedMin) : 0;

                        let fillers = 0;
                        const lower = fullText.toLowerCase();
                        FILLER_WORDS.forEach(fw => {
                            const regex = new RegExp(`\\b${fw}\\b`, 'gi');
                            const matches = lower.match(regex);
                            if (matches) fillers += matches.length;
                        });

                        setStats({ wpm, fillerCount: fillers, totalWords: words.length });
                    }
                    return fullText;
                });
            };

            recognition.onerror = (event) => {
                if (isMountedRef.current) {
                    console.warn('Speech recognition event warning:', event.error);
                    setIsListening(false);
                }
            };

            recognition.onend = () => {
                if (isMountedRef.current) {
                    setIsListening(false);
                }
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) {}
            }
        };
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert('Your browser does not support Speech Recognition. Please use Google Chrome or Microsoft Edge.');
            return;
        }

        if (isListening) {
            try { recognitionRef.current.stop(); } catch (e) {}
            setIsListening(false);
        } else {
            setCurrentTranscript('');
            speechStartTimeRef.current = Date.now();
            stopSpeakingAI();
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (err) {
                console.warn('Recognition start caught error:', err);
            }
        }
    };

    const speakText = (text) => {
        if (!window.speechSynthesis || !text) return;
        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            const voices = window.speechSynthesis.getVoices?.() || [];
            const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('David')));
            if (naturalVoice) utterance.voice = naturalVoice;

            utterance.onstart = () => { if (isMountedRef.current) setIsSpeakingAI(true); };
            utterance.onend = () => { if (isMountedRef.current) setIsSpeakingAI(false); };
            utterance.onerror = () => { if (isMountedRef.current) setIsSpeakingAI(false); };

            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.warn('Speech synthesis error:', e);
        }
    };

    const stopSpeakingAI = () => {
        if (window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch (e) {}
            if (isMountedRef.current) setIsSpeakingAI(false);
        }
    };

    const handleSendMessage = async (textToSend) => {
        const text = (textToSend || currentTranscript).trim();
        if (!text || loadingAI) return;

        if (isListening) {
            try { recognitionRef.current?.stop(); } catch (e) {}
            setIsListening(false);
        }

        const newUserMessage = {
            role: 'user',
            content: text,
            feedback: null
        };

        const updatedHistory = [...messages, newUserMessage];
        setMessages(updatedHistory);
        setCurrentTranscript('');
        setLoadingAI(true);

        try {
            const res = await pythonAPI.post('/api/speaking/chat', {
                messages: updatedHistory.map(m => ({ role: m.role, content: m.content })),
                scenario: selectedScenario.title,
                difficulty: difficulty
            });

            const aiReply = res?.reply || "I understand. Could you tell me more about that?";
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
                    speakText(aiReply);
                }
            }
        } catch (err) {
            console.error('AI chat failed:', err);
            if (isMountedRef.current) {
                const fallbackReply = "That's a very interesting point! What else would you like to explore regarding this topic?";
                setMessages(prev => [...prev, { role: 'assistant', content: fallbackReply }]);
                if (autoSpeak) speakText(fallbackReply);
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
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                border: '1px solid var(--border-subtle)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px 0', color: '#fff' }}>
                            {selectedScenario.icon} {selectedScenario.title}
                        </h2>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                            {selectedScenario.desc}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select
                            value={difficulty}
                            onChange={e => setDifficulty(e.target.value)}
                            style={{
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-subtle)',
                                color: '#fff',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '12px'
                            }}
                        >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                        </select>

                        <button
                            type="button"
                            onClick={() => setAutoSpeak(!autoSpeak)}
                            style={{
                                background: autoSpeak ? '#8b5cf6' : 'var(--bg-surface)',
                                border: 'none',
                                color: '#fff',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            {autoSpeak ? <Volume2 size={14} /> : <VolumeX size={14} />}
                            {autoSpeak ? 'AI Voice ON' : 'AI Voice OFF'}
                        </button>
                    </div>
                </div>

                {/* Scenario Selector Pills */}
                {!hasStarted && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '16px' }}>
                        {SCENARIOS.map(sc => (
                            <div
                                key={sc.id}
                                onClick={() => setSelectedScenario(sc)}
                                style={{
                                    padding: '12px',
                                    borderRadius: '10px',
                                    background: selectedScenario.id === sc.id ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-surface)',
                                    border: `1px solid ${selectedScenario.id === sc.id ? '#8b5cf6' : 'var(--border-subtle)'}`,
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>{sc.icon} {sc.title}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{sc.desc}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Main Conversation Container */}
            <div style={{
                background: 'var(--bg-elevated-1)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                border: '1px solid var(--border-subtle)',
                minHeight: '340px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
            }}>
                {!hasStarted ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>{selectedScenario.icon}</div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#fff' }}>Ready for your session?</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 20px' }}>
                            Practice speaking naturally. AI provides real-time CEFR metrics and instant suggestions.
                        </p>
                        <button
                            type="button"
                            onClick={() => handleStartSession(selectedScenario)}
                            style={{
                                background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                                color: '#fff',
                                border: 'none',
                                padding: '12px 28px',
                                borderRadius: '24px',
                                fontWeight: 700,
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            🚀 Start Conversation
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Messages Area */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '420px', overflowY: 'auto', paddingRight: '6px' }}>
                            {messages.map((m, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                                        maxWidth: '85%',
                                        background: m.role === 'user' ? '#7c3aed' : 'var(--bg-surface)',
                                        borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                                        padding: '12px 16px',
                                        color: '#fff',
                                        fontSize: '13.5px',
                                        lineHeight: 1.45,
                                        border: m.role === 'user' ? 'none' : '1px solid var(--border-subtle)'
                                    }}
                                >
                                    <div style={{ fontWeight: 700, fontSize: '11px', color: m.role === 'user' ? '#e9d5ff' : '#a78bfa', marginBottom: '4px' }}>
                                        {m.role === 'user' ? 'You' : 'AI Coach'}
                                    </div>
                                    <div>{m.content}</div>

                                    {m.feedback && (
                                        <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '11px', color: '#34d399' }}>
                                            ✨ {m.feedback}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {loadingAI && (
                                <div style={{ alignSelf: 'flex-start', background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: '12px', color: '#a78bfa', fontSize: '12px' }}>
                                    💭 AI Coach is thinking...
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input and Mic Controls */}
                        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                            {currentTranscript && (
                                <div style={{ padding: '8px 12px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', fontSize: '13px', color: '#c4b5fd', marginBottom: '10px' }}>
                                    🎙️ "{currentTranscript}"
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    onClick={toggleListening}
                                    style={{
                                        width: '46px',
                                        height: '46px',
                                        borderRadius: '50%',
                                        background: isListening ? '#ef4444' : '#8b5cf6',
                                        border: 'none',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        flexShrink: 0
                                    }}
                                >
                                    {isListening ? <Square size={18} /> : <Play size={18} />}
                                </button>

                                <input
                                    type="text"
                                    placeholder={isListening ? "Listening to your voice..." : "Type or speak your answer..."}
                                    value={currentTranscript}
                                    onChange={e => setCurrentTranscript(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSendMessage(currentTranscript)}
                                    style={{
                                        flex: 1,
                                        background: 'var(--bg-surface)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: '24px',
                                        padding: '12px 18px',
                                        color: '#fff',
                                        fontSize: '13px',
                                        outline: 'none'
                                    }}
                                />

                                <button
                                    type="button"
                                    onClick={() => handleSendMessage(currentTranscript)}
                                    disabled={!currentTranscript.trim() || loadingAI}
                                    style={{
                                        background: (!currentTranscript.trim() || loadingAI) ? 'var(--bg-elevated-3)' : '#8b5cf6',
                                        border: 'none',
                                        color: '#fff',
                                        padding: '12px 18px',
                                        borderRadius: '24px',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        cursor: (!currentTranscript.trim() || loadingAI) ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Send size={14} />
                                    Send
                                </button>

                                <button
                                    type="button"
                                    onClick={handleEndSession}
                                    style={{
                                        background: 'var(--bg-surface)',
                                        border: '1px solid var(--border-subtle)',
                                        color: '#a5a0c2',
                                        padding: '12px',
                                        borderRadius: '24px',
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    End
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
