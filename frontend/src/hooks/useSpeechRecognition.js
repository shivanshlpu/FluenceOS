import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { pythonAPI } from '../services/api';
import { AudioPipeline, AUDIO_CONFIG } from '../services/audioPipeline';

/**
 * Recording Finite State Machine States:
 * IDLE -> INITIALIZING -> LISTENING -> SPEECH_DETECTED -> RECORDING -> PAUSED_IN_SPEECH -> SILENCE_DETECTED -> PROCESSING -> SCORING -> RESULT
 */
export const RECORDING_STATES = {
    IDLE: 'IDLE',
    INITIALIZING: 'INITIALIZING',
    LISTENING: 'LISTENING',
    SPEECH_DETECTED: 'SPEECH_DETECTED',
    RECORDING: 'RECORDING',
    PAUSED_IN_SPEECH: 'PAUSED_IN_SPEECH',
    SILENCE_DETECTED: 'SILENCE_DETECTED',
    PROCESSING: 'PROCESSING',
    SCORING: 'SCORING',
    RESULT: 'RESULT',
    REJECTED: 'REJECTED',
    ERROR: 'ERROR',
};

/**
 * Enterprise Audio-Processing & Speech Recognition Hook (ChatGPT Voice & Gemini Live Style)
 * 
 * - Real-time Live Word Streaming: Everything spoken immediately streams into liveTranscript character-by-character
 * - Hybrid Architecture: Concurrently captures live audio buffer via MediaRecorder while running Web Speech API
 * - Automatic Whisper AI / Gemini fallback transcription if Web Speech is silent or unsupported
 * - Continuous VAD Auto-Transcription: When user speaks into earphones/mic, automatically transcribes and writes down answers
 * - WebRTC Audio Constraints with Echo Cancellation, Noise Suppression, and AGC
 * - High-pass 80Hz BiquadFilter to cancel air-conditioner and fan rumble
 * - Real-time Web Audio VAD with dynamic noise-floor tracking and hysteresis
 * - Real spectrum analyzer data for accurate UI sound-wave visualization
 */
export const useSpeechRecognition = (onSilenceDetected = null, initialLanguage = 'en-US') => {
    // Transcript State
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [confidence, setConfidence] = useState(1.0);
    const [confidenceHistory, setConfidenceHistory] = useState([]);
    
    // Engine & Lifecycle State
    const [recordingState, setRecordingState] = useState(RECORDING_STATES.IDLE);
    const [isListening, setIsListening] = useState(false);
    const [language, setLanguage] = useState(initialLanguage);
    const [error, setError] = useState(null);
    const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
    const [recognitionMode, setRecognitionMode] = useState('hybrid'); // 'hybrid' | 'live' | 'whisper'

    // Real-Time Audio Metrics (powered by AudioPipeline AnalyserNode)
    const [audioMetrics, setAudioMetrics] = useState({
        rmsDb: -60,
        noiseFloorDb: -55,
        snrDb: 0,
        visualLevel: 0,
        peak: 0,
        isClipped: false,
        isSpeechActive: false,
        frequencies: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });

    // Session Quality Report (generated upon completion)
    const [qualityReport, setQualityReport] = useState(null);

    // References
    const recognitionRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioPipelineRef = useRef(null);

    const isListeningRef = useRef(false);
    const isMountedRef = useRef(true);
    const isStartingRef = useRef(false);
    const languageRef = useRef(language);

    const accumulatedTextRef = useRef('');
    const sessionFinalTextRef = useRef('');
    const lastInterimRef = useRef('');
    const restartTimerRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const autoTranscribeTimerRef = useRef(null);
    const confidencesRef = useRef([]);
    const hadSpeechActivityRef = useRef(false);

    const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    useEffect(() => {
        languageRef.current = language;
    }, [language]);

    // Live Combined Real-Time Stream (Everything spoken so far + current speaking clause)
    const liveTranscript = useMemo(() => {
        const fullFinal = transcript.trim();
        const interim = interimTranscript.trim();
        if (fullFinal && interim) {
            return `${fullFinal} ${interim}`;
        }
        return fullFinal || interim || '';
    }, [transcript, interimTranscript]);

    const updateFullTranscript = useCallback((finalPart = '', interimPart = '') => {
        const base = accumulatedTextRef.current.trim();
        const finalChunk = finalPart.trim();
        const interimChunk = interimPart.trim();

        let fullFinal = base;
        if (finalChunk) {
            fullFinal = base ? `${base} ${finalChunk}` : finalChunk;
        }

        setTranscript(fullFinal);
        setInterimTranscript(interimChunk);
        lastInterimRef.current = interimChunk;
    }, []);

    // Clean up media streams & audio pipeline
    const stopAudioHardware = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try {
                mediaRecorderRef.current.stop();
            } catch (e) {}
        }

        if (audioPipelineRef.current) {
            try {
                audioPipelineRef.current.cleanup();
            } catch (e) {}
            audioPipelineRef.current = null;
        }

        if (mediaStreamRef.current) {
            try {
                mediaStreamRef.current.getTracks().forEach(track => {
                    track.stop();
                });
            } catch (e) {}
            mediaStreamRef.current = null;
        }

        setAudioMetrics({
            rmsDb: -60,
            noiseFloorDb: -55,
            snrDb: 0,
            visualLevel: 0,
            peak: 0,
            isClipped: false,
            isSpeechActive: false,
            frequencies: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        });
    }, []);

    const cleanupRecognition = useCallback(() => {
        if (restartTimerRef.current) {
            clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
        if (autoTranscribeTimerRef.current) {
            clearTimeout(autoTranscribeTimerRef.current);
            autoTranscribeTimerRef.current = null;
        }
        if (recognitionRef.current) {
            try {
                recognitionRef.current.onstart = null;
                recognitionRef.current.onresult = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.onend = null;
                recognitionRef.current.abort();
            } catch (e) {}
            recognitionRef.current = null;
        }
        stopAudioHardware();
    }, [stopAudioHardware]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            isListeningRef.current = false;
            cleanupRecognition();
        };
    }, [cleanupRecognition]);

    const resetTranscript = useCallback(() => {
        accumulatedTextRef.current = '';
        sessionFinalTextRef.current = '';
        lastInterimRef.current = '';
        audioChunksRef.current = [];
        confidencesRef.current = [];
        hadSpeechActivityRef.current = false;
        setTranscript('');
        setInterimTranscript('');
        setConfidence(1.0);
        setConfidenceHistory([]);
        setQualityReport(null);
        setRecordingState(RECORDING_STATES.IDLE);
    }, []);

    // Direct Whisper AI Audio Transcription
    const refineWithWhisper = useCallback(async () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try {
                mediaRecorderRef.current.stop();
            } catch (e) {}
        }

        // 120ms buffer flush delay
        await new Promise(r => setTimeout(r, 120));

        if (audioChunksRef.current.length === 0) {
            return null;
        }

        setIsTranscribingAudio(true);
        try {
            const mimeType = audioChunksRef.current[0]?.type || 'audio/webm';
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            
            if (audioBlob.size < 400) {
                setIsTranscribingAudio(false);
                return null;
            }

            const formData = new FormData();
            const filename = mimeType.includes('mp4') ? 'speech_recording.mp4' : 'speech_recording.webm';
            formData.append('file', audioBlob, filename);

            const res = await pythonAPI.post('/api/speaking/transcribe', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 25000,
            });

            if (res && res.transcript) {
                const whisperText = res.transcript.trim();
                if (whisperText) {
                    accumulatedTextRef.current = whisperText;
                    setTranscript(whisperText);
                    setInterimTranscript('');
                    if (res.confidence) {
                        setConfidence(res.confidence);
                    }
                    return whisperText;
                }
            }
        } catch (err) {
            console.warn('[WHISPER] AI transcription error:', err);
        } finally {
            if (isMountedRef.current) {
                setIsTranscribingAudio(false);
            }
        }
        return null;
    }, []);

    // Create Browser Web Speech Recognition instance
    const createRecognitionInstance = useCallback(() => {
        const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
        if (!SpeechRecognition) {
            return null;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = languageRef.current || 'en-US';
            recognition.maxAlternatives = 3;

            recognition.onstart = () => {
                if (!isMountedRef.current) return;
                isStartingRef.current = false;
                setError(null);
                setIsListening(true);
                setRecordingState(RECORDING_STATES.LISTENING);
            };

            recognition.onresult = (event) => {
                if (!isMountedRef.current || !isListeningRef.current) return;

                let currentFinal = '';
                let currentInterim = '';
                let totalConfidence = 0;
                let confCount = 0;

                for (let i = event.resultIndex || 0; i < event.results.length; i++) {
                    const res = event.results[i];
                    if (!res || !res[0]) continue;
                    
                    const alt = res[0];
                    const text = alt.transcript;
                    
                    if (alt.confidence !== undefined && alt.confidence > 0) {
                        totalConfidence += alt.confidence;
                        confCount++;
                        confidencesRef.current.push(alt.confidence);
                    }

                    if (res.isFinal) {
                        currentFinal += (currentFinal ? ' ' : '') + text.trim();
                    } else {
                        currentInterim += (currentInterim ? ' ' : '') + text.trim();
                    }
                }

                if (confCount > 0) {
                    const avgConf = Math.round((totalConfidence / confCount) * 100) / 100;
                    setConfidence(avgConf);
                    setConfidenceHistory([...confidencesRef.current]);
                }

                if (currentFinal) {
                    sessionFinalTextRef.current = (sessionFinalTextRef.current ? `${sessionFinalTextRef.current} ` : '') + currentFinal;
                }
                lastInterimRef.current = currentInterim;

                updateFullTranscript(sessionFinalTextRef.current, currentInterim);
                setRecordingState(RECORDING_STATES.RECORDING);

                if (onSilenceDetected) {
                    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = setTimeout(() => {
                        const fullText = (accumulatedTextRef.current + ' ' + (sessionFinalTextRef.current || currentInterim)).trim();
                        if (isMountedRef.current && isListeningRef.current && fullText) {
                            onSilenceDetected(fullText);
                        }
                    }, 2400);
                }
            };

            recognition.onerror = (e) => {
                if (!isMountedRef.current) return;
                if (e.error === 'no-speech' || e.error === 'aborted') {
                    return;
                }

                if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                    setError('Microphone permission denied. Please allow microphone access in your browser settings.');
                }
            };

            recognition.onend = () => {
                if (!isMountedRef.current) return;

                const pendingText = (sessionFinalTextRef.current || lastInterimRef.current).trim();
                if (pendingText) {
                    accumulatedTextRef.current = (accumulatedTextRef.current + (accumulatedTextRef.current ? ' ' : '') + pendingText).trim();
                    sessionFinalTextRef.current = '';
                    lastInterimRef.current = '';
                    setTranscript(accumulatedTextRef.current);
                    setInterimTranscript('');
                }

                if (isListeningRef.current) {
                    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
                    restartTimerRef.current = setTimeout(() => {
                        if (isMountedRef.current && isListeningRef.current && !isStartingRef.current) {
                            try {
                                isStartingRef.current = true;
                                const newRec = createRecognitionInstance();
                                if (newRec) {
                                    recognitionRef.current = newRec;
                                    newRec.start();
                                }
                            } catch (err) {
                                isStartingRef.current = false;
                            }
                        }
                    }, isMobile ? 120 : 60);
                } else {
                    setIsListening(false);
                    setInterimTranscript('');
                }
            };

            return recognition;
        } catch (err) {
            console.warn('[SPEECH] SpeechRecognition creation error:', err);
            return null;
        }
    }, [isMobile, onSilenceDetected, updateFullTranscript]);

    /**
     * Start Live Web Speech with simultaneous MediaRecorder audio buffering & Web Audio VAD
     */
    const startListening = useCallback(async () => {
        setError(null);
        setQualityReport(null);
        audioChunksRef.current = [];
        hadSpeechActivityRef.current = false;
        isListeningRef.current = true;
        setIsListening(true);
        isStartingRef.current = true;
        setRecordingState(RECORDING_STATES.INITIALIZING);

        try {
            // 1. Initialize Web Audio Pipeline
            const pipeline = new AudioPipeline(AUDIO_CONFIG);
            audioPipelineRef.current = pipeline;

            pipeline.onAudioMetrics = (metrics) => {
                if (!isMountedRef.current) return;
                setAudioMetrics(metrics);
                if (metrics.isSpeechActive) {
                    hadSpeechActivityRef.current = true;
                }
            };

            pipeline.onVADChange = (isSpeechActive) => {
                if (!isMountedRef.current || !isListeningRef.current) return;
                if (isSpeechActive) {
                    hadSpeechActivityRef.current = true;
                    setRecordingState(RECORDING_STATES.SPEECH_DETECTED);
                    if (autoTranscribeTimerRef.current) {
                        clearTimeout(autoTranscribeTimerRef.current);
                        autoTranscribeTimerRef.current = null;
                    }
                } else {
                    setRecordingState(RECORDING_STATES.PAUSED_IN_SPEECH);
                    // If user was speaking and Web Speech didn't write anything after 2s of silence, auto-transcribe with Whisper!
                    if (hadSpeechActivityRef.current && !accumulatedTextRef.current && !sessionFinalTextRef.current) {
                        if (autoTranscribeTimerRef.current) clearTimeout(autoTranscribeTimerRef.current);
                        autoTranscribeTimerRef.current = setTimeout(async () => {
                            if (isMountedRef.current && isListeningRef.current && !accumulatedTextRef.current) {
                                refineWithWhisper();
                            }
                        }, 1800);
                    }
                }
            };

            pipeline.onDeviceChange = () => {
                console.log('[SPEECH] Headset/Device change handled seamlessly.');
            };

            await pipeline.initialize();
            mediaStreamRef.current = pipeline.mediaStream;

            // 2. Concurrently start MediaRecorder for reliable audio buffer capture
            if (typeof MediaRecorder !== 'undefined' && pipeline.mediaStream) {
                try {
                    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                        ? 'audio/webm;codecs=opus'
                        : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : ''));
                    
                    const recorder = mimeType ? new MediaRecorder(pipeline.mediaStream, { mimeType }) : new MediaRecorder(pipeline.mediaStream);
                    mediaRecorderRef.current = recorder;

                    recorder.ondataavailable = (event) => {
                        if (event.data && event.data.size > 0) {
                            audioChunksRef.current.push(event.data);
                        }
                    };

                    recorder.start(250);
                } catch (recErr) {
                    console.warn('[SPEECH] MediaRecorder start notice:', recErr);
                }
            }

            // 3. Start Live Web Speech Engine for real-time subtitling
            const recognition = createRecognitionInstance();
            if (recognition) {
                recognitionRef.current = recognition;
                try {
                    recognition.start();
                } catch (recStartErr) {
                    console.warn('[SPEECH] Web Speech recognition.start notice:', recStartErr);
                }
            }
            setRecordingState(RECORDING_STATES.LISTENING);
        } catch (e) {
            isStartingRef.current = false;
            isListeningRef.current = false;
            setIsListening(false);
            console.warn('[SPEECH] Start error:', e);
            setError(e.message || 'Could not access microphone. Please check permissions.');
            setRecordingState(RECORDING_STATES.ERROR);
        }
    }, [createRecognitionInstance, refineWithWhisper]);

    /**
     * Stop Listening and evaluate session audio quality
     */
    const stopListening = useCallback(() => {
        isListeningRef.current = false;
        isStartingRef.current = false;
        setIsListening(false);

        if (autoTranscribeTimerRef.current) {
            clearTimeout(autoTranscribeTimerRef.current);
            autoTranscribeTimerRef.current = null;
        }

        const pendingText = (sessionFinalTextRef.current || lastInterimRef.current).trim();
        if (pendingText) {
            accumulatedTextRef.current = (accumulatedTextRef.current + (accumulatedTextRef.current ? ' ' : '') + pendingText).trim();
            sessionFinalTextRef.current = '';
            lastInterimRef.current = '';
            setTranscript(accumulatedTextRef.current);
            setInterimTranscript('');
        }

        let report = null;
        if (audioPipelineRef.current) {
            try {
                report = audioPipelineRef.current.evaluateSessionQuality();
                setQualityReport(report);
            } catch (e) {
                console.warn('[SPEECH] Quality evaluation error:', e);
            }
        }

        if (report && !report.isAcceptable) {
            setRecordingState(RECORDING_STATES.REJECTED);
        } else {
            setRecordingState(RECORDING_STATES.PROCESSING);
        }

        cleanupRecognition();
        return report;
    }, [cleanupRecognition]);

    return {
        // Text & Live Streaming
        transcript,
        interimTranscript,
        liveTranscript,
        confidence,
        confidenceHistory,
        // State Machine
        recordingState,
        setRecordingState,
        isListening,
        language,
        setLanguage,
        error,
        isTranscribingAudio,
        recognitionMode,
        setRecognitionMode,
        // Audio Pipeline Metrics & Quality Report
        audioMetrics,
        qualityReport,
        hasAudioRecorded: audioChunksRef.current.length > 0,
        // Actions
        startListening,
        stopListening,
        resetTranscript,
        setTranscript,
        refineWithWhisper,
        transcribeCurrentAudio: refineWithWhisper,
    };
};
