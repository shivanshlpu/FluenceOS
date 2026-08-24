import { useState, useRef, useCallback, useEffect } from 'react';
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
 * Enterprise Audio-Processing & Speech Recognition Hook
 * 
 * - WebRTC Audio Constraints with Echo Cancellation, Noise Suppression, and AGC
 * - High-pass 80Hz BiquadFilter to cancel air-conditioner and fan rumble
 * - Real-time Web Audio VAD with dynamic noise-floor tracking and hysteresis
 * - Real spectrum analyzer data for accurate UI sound-wave visualization
 * - Confidence-score aggregation across recognition alternatives
 * - Audio Quality Detection & Pre-scoring Gating (detects noise, low volume, clipping, no speech)
 * - Clean device-change handling for Bluetooth & USB headsets
 */
export const useSpeechRecognition = (onSilenceDetected = null, initialLanguage = 'en-IN') => {
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
    const [recognitionMode, setRecognitionMode] = useState('live'); // 'live' | 'whisper'

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
    const confidencesRef = useRef([]);

    const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    useEffect(() => {
        languageRef.current = language;
    }, [language]);

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
        setTranscript('');
        setInterimTranscript('');
        setConfidence(1.0);
        setConfidenceHistory([]);
        setQualityReport(null);
        setRecordingState(RECORDING_STATES.IDLE);
    }, []);

    // Create Browser Web Speech Recognition instance
    const createRecognitionInstance = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Web Speech recognition is not supported in this browser. You can use Whisper AI Mode.');
            return null;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = !isMobile;
        recognition.interimResults = true;
        recognition.lang = languageRef.current || 'en-IN';
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
                
                // Track confidence score
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

            if (isMobile && !currentFinal && currentInterim) {
                lastInterimRef.current = currentInterim;
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
                }, 3500);
            }
        };

        recognition.onerror = (e) => {
            if (!isMountedRef.current) return;
            if (e.error === 'no-speech' || e.error === 'aborted') {
                return; // Normal pause in speech
            }

            console.warn('[SPEECH] Recognition error:', e.error);

            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                isListeningRef.current = false;
                setIsListening(false);
                setRecordingState(RECORDING_STATES.ERROR);
                setError('Microphone permission denied. Please allow microphone access in your browser settings.');
                cleanupRecognition();
            }
        };

        recognition.onend = () => {
            if (!isMountedRef.current) return;

            // Auto-commit spoken words
            const pendingText = (sessionFinalTextRef.current || lastInterimRef.current).trim();
            if (pendingText) {
                accumulatedTextRef.current = (accumulatedTextRef.current + (accumulatedTextRef.current ? ' ' : '') + pendingText).trim();
                sessionFinalTextRef.current = '';
                lastInterimRef.current = '';
                setTranscript(accumulatedTextRef.current);
                setInterimTranscript('');
            }

            // Keep listening continuously if user has not clicked stop
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
                            console.warn('[SPEECH] Restart recovery:', err);
                        }
                    }
                }, isMobile ? 120 : 80);
            } else {
                setIsListening(false);
                setInterimTranscript('');
            }
        };

        return recognition;
    }, [cleanupRecognition, isMobile, onSilenceDetected, updateFullTranscript]);

    /**
     * Start Live Web Speech with full Web Audio Pipeline & VAD
     */
    const startListening = useCallback(async () => {
        setError(null);
        setQualityReport(null);
        isListeningRef.current = true;
        setIsListening(true);
        isStartingRef.current = true;
        setRecordingState(RECORDING_STATES.INITIALIZING);

        try {
            // 1. Initialize Web Audio Pipeline with WebRTC Noise Suppression & 80Hz rumble filter
            const pipeline = new AudioPipeline(AUDIO_CONFIG);
            audioPipelineRef.current = pipeline;

            pipeline.onAudioMetrics = (metrics) => {
                if (!isMountedRef.current) return;
                setAudioMetrics(metrics);
            };

            pipeline.onVADChange = (isSpeechActive) => {
                if (!isMountedRef.current || !isListeningRef.current) return;
                if (isSpeechActive) {
                    setRecordingState(RECORDING_STATES.SPEECH_DETECTED);
                } else {
                    setRecordingState(RECORDING_STATES.PAUSED_IN_SPEECH);
                }
            };

            pipeline.onDeviceChange = () => {
                console.log('[SPEECH] Headset/Device change handled seamlessly.');
            };

            await pipeline.initialize();

            // 2. Start Live Web Speech Engine
            const recognition = createRecognitionInstance();
            if (recognition) {
                recognitionRef.current = recognition;
                recognition.start();
            }
        } catch (e) {
            isStartingRef.current = false;
            console.warn('[SPEECH] Start error:', e);
            setError(e.message || 'Could not start audio recording.');
            setRecordingState(RECORDING_STATES.ERROR);
        }
    }, [createRecognitionInstance]);

    /**
     * Start Whisper AI Direct Recording Mode with Web Audio Analysis & Quality Gating
     */
    const startWhisperRecording = useCallback(async () => {
        setError(null);
        setQualityReport(null);
        audioChunksRef.current = [];
        isListeningRef.current = true;
        setIsListening(true);
        setRecordingState(RECORDING_STATES.INITIALIZING);

        try {
            // 1. Initialize Web Audio Pipeline with constraints
            const pipeline = new AudioPipeline(AUDIO_CONFIG);
            audioPipelineRef.current = pipeline;

            pipeline.onAudioMetrics = (metrics) => {
                if (!isMountedRef.current) return;
                setAudioMetrics(metrics);
            };

            pipeline.onVADChange = (isSpeechActive) => {
                if (!isMountedRef.current || !isListeningRef.current) return;
                setRecordingState(isSpeechActive ? RECORDING_STATES.SPEECH_DETECTED : RECORDING_STATES.PAUSED_IN_SPEECH);
            };

            await pipeline.initialize();
            mediaStreamRef.current = pipeline.mediaStream;

            // 2. Start MediaRecorder
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4');

            const recorder = new MediaRecorder(pipeline.mediaStream, { mimeType });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.start(250);
            setRecordingState(RECORDING_STATES.LISTENING);
        } catch (err) {
            console.error('[WHISPER] Audio record error:', err);
            setError('Could not access microphone for Whisper recording. Please check permissions.');
            setRecordingState(RECORDING_STATES.ERROR);
            setIsListening(false);
            isListeningRef.current = false;
        }
    }, []);

    /**
     * Stop Listening and evaluate session audio quality
     */
    const stopListening = useCallback(() => {
        isListeningRef.current = false;
        isStartingRef.current = false;
        setIsListening(false);

        // Commit any remaining words
        const pendingText = (sessionFinalTextRef.current || lastInterimRef.current).trim();
        if (pendingText) {
            accumulatedTextRef.current = (accumulatedTextRef.current + (accumulatedTextRef.current ? ' ' : '') + pendingText).trim();
            sessionFinalTextRef.current = '';
            lastInterimRef.current = '';
            setTranscript(accumulatedTextRef.current);
            setInterimTranscript('');
        }

        // Run session audio quality evaluation
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

    /**
     * Transcribe with Groq Whisper AI (With verbose confidence & segment analysis)
     */
    const refineWithWhisper = useCallback(async () => {
        if (audioChunksRef.current.length === 0) return null;
        setIsTranscribingAudio(true);
        try {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('file', audioBlob, 'speech_recording.webm');

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
            console.warn('[WHISPER] Whisper refinement error:', err);
        } finally {
            setIsTranscribingAudio(false);
        }
        return null;
    }, []);

    return {
        // Text & Confidence
        transcript,
        interimTranscript,
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
        // Actions
        startListening,
        startWhisperRecording,
        stopListening,
        resetTranscript,
        setTranscript,
        refineWithWhisper,
    };
};
