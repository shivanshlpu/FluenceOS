import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, RefreshCw, Sparkles, Send, Award, CheckCircle2, AlertCircle, Play, Square, MessageSquare } from 'lucide-react';
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

    const [hasStarted, setHasStarted] = useState(false);

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
            recognitionRef.current.stop();
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

    // Setup Web Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                let interim = '';
                let final = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        final += event.results[i][0].transcript;
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }

                const fullText = (currentTranscript + ' ' + final + ' ' + interim).trim();
                setCurrentTranscript(fullText);

                // Calculate WPM and filler words
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
            };

            recognition.onerror = (event) => {
                console.warn('Speech recognition error:', event.error);
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }
    }, [currentTranscript]);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert('Your browser does not support Speech Recognition. Please use Google Chrome or Microsoft Edge.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            setCurrentTranscript('');
            speechStartTimeRef.current = Date.now();
            window.speechSynthesis.cancel();
            setIsSpeakingAI(false);
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (err) {
                console.warn('Recognition start failed:', err);
            }
        }
    };

    const speakText = (text) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Try to pick a natural sounding English voice
        const voices = window.speechSynthesis.getVoices();
        const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('David')));
        if (naturalVoice) utterance.voice = naturalVoice;

        utterance.onstart = () => setIsSpeakingAI(true);
        utterance.onend = () => setIsSpeakingAI(false);
        utterance.onerror = () => setIsSpeakingAI(false);

        window.speechSynthesis.speak(utterance);
    };

    const stopSpeakingAI = () => {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setIsSpeakingAI(false);
        }
    };

    const handleSendMessage = async (textToSend) => {
        const text = (textToSend || currentTranscript).trim();
        if (!text || loadingAI) return;

        if (isListening) {
            recognitionRef.current?.stop();
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

            const aiReply = res.reply || "I understand. Could you tell me more about that?";
            const feedback = res.feedback || null;

            setMessages([...updatedHistory, {
                role: 'assistant',
                content: aiReply,
                feedback: feedback
            }]);

            if (autoSpeak) {
                speakText(aiReply);
            }
        } catch (err) {
            console.error('AI chat failed:', err);
            setMessages([...updatedHistory, {
                role: 'assistant',
                content: "That sounds great! Could you elaborate on what you learned from that experience?",
                feedback: null
            }]);
        } finally {
            setLoadingAI(false);
        }
    };

    if (!hasStarted) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Scenario Selection Grid */}
                <div style={{
                    padding: '24px',
                    background: 'var(--bg-elevated-1)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '4px', color: '#fff' }}>
                        1. Select Practice Scenario
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Choose what you want to practice. The AI coach will tailor questions to your goal:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        {SCENARIOS.map(sc => {
                            const isSelected = selectedScenario.id === sc.id;
                            return (
                                <div
                                    key={sc.id}
                                    onClick={() => setSelectedScenario(sc)}
                                    style={{
                                        padding: '16px',
                                        borderRadius: 'var(--radius-md, 12px)',
                                        background: isSelected ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(99, 102, 241, 0.25))' : 'var(--bg-elevated-2)',
                                        border: isSelected ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.06)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '24px' }}>{sc.icon}</span>
                                        <h4 style={{ fontSize: '15px', fontWeight: 800, color: isSelected ? '#a855f7' : 'var(--text-primary)' }}>
                                            {sc.title}
                                        </h4>
                                    </div>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                        {sc.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Difficulty & Launch Bar */}
                <div style={{
                    padding: '24px',
                    background: 'var(--bg-elevated-1)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>2. Choose Difficulty Level</h4>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Affects vocabulary complexity and evaluation depth
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                                <button
                                    key={lvl}
                                    onClick={() => setDifficulty(lvl)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontWeight: 800,
                                        border: 'none',
                                        cursor: 'pointer',
                                        background: difficulty === lvl ? '#a855f7' : 'var(--bg-elevated-2)',
                                        color: difficulty === lvl ? '#fff' : 'var(--text-secondary)',
                                        boxShadow: difficulty === lvl ? '0 2px 10px rgba(168, 85, 247, 0.4)' : 'none',
                                    }}
                                >
                                    {lvl}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Big Prominent Start Button */}
                    <button
                        onClick={() => handleStartSession()}
                        style={{
                            width: '100%',
                            padding: '16px 24px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '15px',
                            fontWeight: 900,
                            letterSpacing: '0.5px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            boxShadow: '0 4px 20px rgba(168, 85, 247, 0.4)',
                            transition: 'transform 0.15s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <span>🚀</span> Start {selectedScenario.title} Session
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Active Session Header Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '14px 18px',
                background: 'var(--bg-elevated-1)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{selectedScenario.icon}</span>
                    <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                            {selectedScenario.title}
                        </h4>
                        <span style={{ fontSize: '11px', color: '#a855f7', fontWeight: 700 }}>
                            {difficulty} Level
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Live Speech Metrics */}
                    <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span>⚡ <strong style={{ color: '#60a5fa' }}>{stats.wpm} WPM</strong></span>
                        <span>⚠️ Fillers: <strong style={{ color: stats.fillerCount > 3 ? '#ef4444' : '#10b981' }}>{stats.fillerCount}</strong></span>
                    </div>

                    <button
                        onClick={() => setAutoSpeak(!autoSpeak)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'transparent',
                            border: 'none',
                            color: autoSpeak ? '#10b981' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 700,
                        }}
                    >
                        {autoSpeak ? <Volume2 size={15} /> : <VolumeX size={15} />}
                        {autoSpeak ? 'Voice ON' : 'Muted'}
                    </button>

                    <button
                        onClick={handleEndSession}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.08)',
                            color: '#fff',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        🔄 End / Change Mode
                    </button>
                </div>
            </div>

            {/* Chat Messages Box */}
            <div style={{
                height: '420px',
                overflowY: 'auto',
                background: 'var(--bg-elevated-1)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.06)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
            }}>
                {messages.map((msg, idx) => {
                    const isAI = msg.role === 'assistant';
                    return (
                        <div
                            key={idx}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: isAI ? 'flex-start' : 'flex-end',
                                gap: '6px',
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: isAI ? '#a855f7' : '#60a5fa',
                            }}>
                                <span>{isAI ? '🤖 AI Coach' : '👤 You'}</span>
                                {isAI && (
                                    <button
                                        onClick={() => speakText(msg.content)}
                                        title="Replay Voice"
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                                    >
                                        <Volume2 size={13} />
                                    </button>
                                )}
                            </div>

                            <div style={{
                                maxWidth: '80%',
                                padding: '14px 18px',
                                borderRadius: isAI ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                                background: isAI ? 'var(--bg-elevated-2)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                                color: '#fff',
                                fontSize: '14px',
                                lineHeight: 1.6,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            }}>
                                {msg.content}
                            </div>

                            {/* Real-time Inline Feedback for AI messages */}
                            {isAI && msg.feedback && (
                                <div style={{
                                    maxWidth: '85%',
                                    marginTop: '4px',
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    background: 'rgba(16, 185, 129, 0.08)',
                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                    fontSize: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Award size={14} /> Speech Analysis
                                        </span>
                                        {msg.feedback.cefrLevel && (
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                background: '#a855f722',
                                                color: '#c084fc',
                                                fontWeight: 800,
                                            }}>
                                                CEFR: {msg.feedback.cefrLevel}
                                            </span>
                                        )}
                                    </div>

                                    {msg.feedback.grammarCorrection && msg.feedback.grammarCorrection !== 'Great grammar!' && (
                                        <div style={{ color: 'var(--text-secondary)' }}>
                                            <strong style={{ color: '#ef4444' }}>Correction:</strong> {msg.feedback.grammarCorrection}
                                        </div>
                                    )}

                                    {msg.feedback.betterPhrasing && (
                                        <div style={{ color: 'var(--text-secondary)' }}>
                                            <strong style={{ color: '#60a5fa' }}>💡 Native Phrasing:</strong> "{msg.feedback.betterPhrasing}"
                                        </div>
                                    )}

                                    {msg.feedback.praise && (
                                        <div style={{ color: '#10b981' }}>
                                            ✓ {msg.feedback.praise}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Live Speech Recognition Transcript Indicator */}
                {isListening && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '4px',
                    }}>
                        <span style={{ fontSize: '11px', color: '#ec4899', fontWeight: 800, animation: 'pulse 1s infinite' }}>
                            🎤 Listening live...
                        </span>
                        <div style={{
                            maxWidth: '80%',
                            padding: '12px 16px',
                            borderRadius: '16px 4px 16px 16px',
                            background: 'rgba(236, 72, 153, 0.15)',
                            border: '1px dashed #ec4899',
                            color: '#fff',
                            fontSize: '14px',
                            fontStyle: 'italic',
                        }}>
                            {currentTranscript || 'Start speaking...'}
                        </div>
                    </div>
                )}

                {loadingAI && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7', fontSize: '13px', fontStyle: 'italic' }}>
                        <RefreshCw size={14} className="animate-spin" /> AI Coach is thinking & formulating response...
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Bottom Microphone and Push-to-Talk Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: 'var(--bg-elevated-1)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.06)',
            }}>
                <button
                    onClick={toggleListening}
                    style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        background: isListening ? '#ef4444' : 'linear-gradient(135deg, #a855f7, #6366f1)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isListening ? '0 0 20px rgba(239, 68, 68, 0.6)' : '0 4px 15px rgba(168, 85, 247, 0.4)',
                        transition: 'all 0.2s ease',
                        flexShrink: 0,
                    }}
                    title={isListening ? "Stop Speaking & Send" : "Click to Speak (Web Speech API - 100% Free)"}
                >
                    {isListening ? <Square size={20} /> : <Mic size={24} />}
                </button>

                <input
                    type="text"
                    placeholder={isListening ? "Listening to your voice..." : "Or type your response here..."}
                    value={currentTranscript}
                    onChange={(e) => setCurrentTranscript(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    style={{
                        flex: 1,
                        background: 'var(--bg-elevated-2)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        color: '#fff',
                        fontSize: '14px',
                        outline: 'none',
                    }}
                />

                <button
                    onClick={() => handleSendMessage()}
                    disabled={!currentTranscript.trim() || loadingAI}
                    style={{
                        padding: '14px 20px',
                        borderRadius: '12px',
                        background: currentTranscript.trim() ? '#a855f7' : 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        border: 'none',
                        cursor: currentTranscript.trim() ? 'pointer' : 'default',
                        fontWeight: 700,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}
                >
                    <Send size={15} /> Send
                </button>
            </div>
        </div>
    );
}
