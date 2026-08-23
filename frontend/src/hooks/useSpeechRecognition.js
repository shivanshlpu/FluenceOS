import { useState, useRef, useCallback, useEffect } from 'react';
import { pythonAPI } from '../services/api';

/**
 * Robust Cross-Platform Speech Recognition Hook (Android, iOS & Desktop)
 * - Zero microphone lock contention on Mobile Android / iOS
 * - Auto-commit interim text so pauses never wipe spoken words
 * - Real-time word streaming to response box
 * - Whisper AI high-accuracy transcription fallback
 */
export const useSpeechRecognition = (onSilenceDetected = null, initialLanguage = 'en-IN') => {
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [language, setLanguage] = useState(initialLanguage);
    const [error, setError] = useState(null);
    const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
    const [recognitionMode, setRecognitionMode] = useState('live'); // 'live' | 'whisper'

    const recognitionRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const isListeningRef = useRef(false);
    const isMountedRef = useRef(true);
    const isStartingRef = useRef(false);
    const languageRef = useRef(language);

    const accumulatedTextRef = useRef('');
    const sessionFinalTextRef = useRef('');
    const lastInterimRef = useRef('');
    const restartTimerRef = useRef(null);
    const silenceTimerRef = useRef(null);

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

    // Stop media recording cleanly
    const stopAudioRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try {
                mediaRecorderRef.current.stop();
            } catch (e) {}
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        setAudioLevel(0);
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
        stopAudioRecording();
    }, [stopAudioRecording]);

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
        setTranscript('');
        setInterimTranscript('');
    }, []);

    // Create browser SpeechRecognition instance
    const createRecognitionInstance = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Speech recognition is not supported in this browser. You can use Whisper AI Mode.');
            return null;
        }

        const recognition = new SpeechRecognition();
        // On Android Chrome, continuous=false with auto-restart provides the most reliable speech results
        recognition.continuous = !isMobile;
        recognition.interimResults = true;
        recognition.lang = languageRef.current || 'en-IN';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            if (!isMountedRef.current) return;
            isStartingRef.current = false;
            setError(null);
            setIsListening(true);
            setAudioLevel(50); // Visual indicator active
        };

        recognition.onresult = (event) => {
            if (!isMountedRef.current || !isListeningRef.current) return;

            let currentFinal = '';
            let currentInterim = '';

            for (let i = event.resultIndex || 0; i < event.results.length; i++) {
                const res = event.results[i];
                if (!res || !res[0]) continue;
                const text = res[0].transcript;
                if (res.isFinal) {
                    currentFinal += (currentFinal ? ' ' : '') + text.trim();
                } else {
                    currentInterim += (currentInterim ? ' ' : '') + text.trim();
                }
            }

            // On mobile devices where resultIndex is 0
            if (isMobile && !currentFinal && currentInterim) {
                // If text was received, track it
                lastInterimRef.current = currentInterim;
            }

            if (currentFinal) {
                sessionFinalTextRef.current = (sessionFinalTextRef.current ? `${sessionFinalTextRef.current} ` : '') + currentFinal;
            }
            lastInterimRef.current = currentInterim;

            updateFullTranscript(sessionFinalTextRef.current, currentInterim);

            if (onSilenceDetected) {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = setTimeout(() => {
                    const fullText = (accumulatedTextRef.current + ' ' + (sessionFinalTextRef.current || currentInterim)).trim();
                    if (isMountedRef.current && isListeningRef.current && fullText) {
                        onSilenceDetected(fullText);
                    }
                }, 3000);
            }
        };

        recognition.onerror = (e) => {
            if (!isMountedRef.current) return;
            if (e.error === 'no-speech' || e.error === 'aborted') {
                return; // Normal pause during speech
            }

            console.warn('[SPEECH] Recognition error:', e.error);

            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                isListeningRef.current = false;
                setIsListening(false);
                setError('Microphone permission denied. Please allow microphone access in your browser settings.');
                cleanupRecognition();
            }
        };

        recognition.onend = () => {
            if (!isMountedRef.current) return;

            // Auto-commit any spoken words from this session
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
                setAudioLevel(0);
            }
        };

        return recognition;
    }, [cleanupRecognition, isMobile, onSilenceDetected, updateFullTranscript]);

    // Start Live Web Speech
    const startListening = useCallback(() => {
        setError(null);
        isListeningRef.current = true;
        setIsListening(true);
        isStartingRef.current = true;

        try {
            const recognition = createRecognitionInstance();
            if (recognition) {
                recognitionRef.current = recognition;
                recognition.start();
            }
        } catch (e) {
            isStartingRef.current = false;
            console.warn('[SPEECH] Start error:', e);
        }
    }, [createRecognitionInstance]);

    // Start Whisper AI Direct Recording Mode
    const startWhisperRecording = useCallback(async () => {
        setError(null);
        audioChunksRef.current = [];
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            mediaStreamRef.current = stream;

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4');

            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.start(500);
            isListeningRef.current = true;
            setIsListening(true);
            setAudioLevel(60);
        } catch (err) {
            console.error('[WHISPER] Audio record error:', err);
            setError('Could not access microphone for Whisper recording. Please check permissions.');
        }
    }, []);

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

        cleanupRecognition();
    }, [cleanupRecognition]);

    // Transcribe with Groq Whisper AI (Fast & 100% accurate)
    const refineWithWhisper = useCallback(async () => {
        if (audioChunksRef.current.length === 0) return null;
        setIsTranscribingAudio(true);
        try {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('file', audioBlob, 'speech_recording.webm');

            const res = await pythonAPI.post('/api/speaking/transcribe', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 20000,
            });

            if (res && res.transcript) {
                const whisperText = res.transcript.trim();
                if (whisperText) {
                    accumulatedTextRef.current = whisperText;
                    setTranscript(whisperText);
                    setInterimTranscript('');
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
        transcript,
        interimTranscript,
        isListening,
        audioLevel,
        language,
        setLanguage,
        error,
        isTranscribingAudio,
        recognitionMode,
        setRecognitionMode,
        startListening,
        startWhisperRecording,
        stopListening,
        resetTranscript,
        setTranscript,
        refineWithWhisper,
    };
};
