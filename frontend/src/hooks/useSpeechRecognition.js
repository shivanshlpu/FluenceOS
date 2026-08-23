import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Enhanced, Rock-Solid Speech Recognition Hook
 * - Smooth, resilient single-session audio lifecycle (no rapid hardware toggling)
 * - Live Web Audio API volume level detection (audioLevel: 0-100)
 * - Multi-accent support: 'en-IN', 'en-US', 'en-GB'
 * - Real-time word stream accumulation with zero dropped syllables
 */
export const useSpeechRecognition = (onSilenceDetected = null, initialLanguage = 'en-US') => {
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0); // 0 to 100 volume meter
    const [language, setLanguage] = useState(initialLanguage);
    const [error, setError] = useState(null);

    const recognitionRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animFrameRef = useRef(null);

    const isListeningRef = useRef(false);
    const isMountedRef = useRef(true);
    const isStartingRef = useRef(false);
    const languageRef = useRef(language);

    const accumulatedTextRef = useRef('');
    const sessionFinalTextRef = useRef('');
    const restartTimerRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const consecutiveErrorsRef = useRef(0);

    // Keep languageRef synchronized
    useEffect(() => {
        languageRef.current = language;
    }, [language]);

    // Setup Web Audio Volume Meter
    const startAudioMeter = useCallback(async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            mediaStreamRef.current = stream;

            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;

            const audioCtx = new AudioCtx();
            audioContextRef.current = audioCtx;

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.5;
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateMeter = () => {
                if (!isListeningRef.current || !analyserRef.current) {
                    setAudioLevel(0);
                    return;
                }
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const avg = sum / bufferLength;
                const normalized = Math.min(100, Math.round((avg / 128) * 100));
                setAudioLevel(normalized);

                animFrameRef.current = requestAnimationFrame(updateMeter);
            };

            updateMeter();
        } catch (err) {
            console.warn('[AUDIO] Volume meter init notice:', err);
        }
    }, []);

    const stopAudioMeter = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (audioContextRef.current) {
            try {
                audioContextRef.current.close();
            } catch (e) {}
            audioContextRef.current = null;
        }
        analyserRef.current = null;
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
                recognitionRef.current.stop();
            } catch (e) {}
            recognitionRef.current = null;
        }
        stopAudioMeter();
    }, [stopAudioMeter]);

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
        setTranscript('');
        setInterimTranscript('');
    }, []);

    const createRecognitionInstance = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
            return null;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = languageRef.current || 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            if (!isMountedRef.current) return;
            isStartingRef.current = false;
            consecutiveErrorsRef.current = 0;
            setError(null);
            setIsListening(true);
        };

        recognition.onresult = (event) => {
            if (!isMountedRef.current || !isListeningRef.current) return;

            let currentFinal = '';
            let currentInterim = '';

            for (let i = 0; i < event.results.length; i++) {
                const res = event.results[i];
                const text = res[0].transcript;
                if (res.isFinal) {
                    currentFinal += (currentFinal ? ' ' : '') + text.trim();
                } else {
                    currentInterim += (currentInterim ? ' ' : '') + text.trim();
                }
            }

            sessionFinalTextRef.current = currentFinal;

            const fullFinal = (accumulatedTextRef.current + (accumulatedTextRef.current && currentFinal ? ' ' : '') + currentFinal).trim();
            setTranscript(fullFinal);
            setInterimTranscript(currentInterim);

            if (onSilenceDetected && (fullFinal || currentInterim)) {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = setTimeout(() => {
                    if (isMountedRef.current && isListeningRef.current && fullFinal) {
                        onSilenceDetected(fullFinal);
                    }
                }, 2400);
            }
        };

        recognition.onerror = (e) => {
            if (!isMountedRef.current) return;
            if (e.error === 'no-speech') {
                // User simply paused, keep listening calmly
                return;
            }
            if (e.error === 'aborted') {
                return;
            }

            console.warn('[SPEECH] Recognition error event:', e.error);

            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                isListeningRef.current = false;
                setIsListening(false);
                setError('Microphone access denied. Please click the lock or camera/mic icon in your browser URL bar to allow microphone access.');
                cleanupRecognition();
                return;
            }

            consecutiveErrorsRef.current += 1;
            if (consecutiveErrorsRef.current > 5) {
                setError('Microphone disconnected or unavailable. Please check your system audio settings.');
            }
        };

        recognition.onend = () => {
            if (!isMountedRef.current) return;

            // Commit final words from this session to accumulated text
            if (sessionFinalTextRef.current) {
                accumulatedTextRef.current = (accumulatedTextRef.current + (accumulatedTextRef.current ? ' ' : '') + sessionFinalTextRef.current).trim();
                sessionFinalTextRef.current = '';
            }

            // Smooth automatic restart if user hasn't explicitly clicked stop
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
                            console.warn('[SPEECH] Safe restart recovery:', err);
                        }
                    }
                }, 250);
            } else {
                setIsListening(false);
                setInterimTranscript('');
                stopAudioMeter();
            }
        };

        return recognition;
    }, [cleanupRecognition, onSilenceDetected, stopAudioMeter]);

    const startListening = useCallback(() => {
        setError(null);
        isListeningRef.current = true;
        setIsListening(true);
        isStartingRef.current = true;
        consecutiveErrorsRef.current = 0;

        // Initialize audio visualizer meter
        startAudioMeter();

        try {
            const recognition = createRecognitionInstance();
            if (recognition) {
                recognitionRef.current = recognition;
                recognition.start();
            }
        } catch (e) {
            isStartingRef.current = false;
            console.warn('[SPEECH] Start listening error:', e);
        }
    }, [createRecognitionInstance, startAudioMeter]);

    const stopListening = useCallback(() => {
        isListeningRef.current = false;
        isStartingRef.current = false;
        setIsListening(false);
        setInterimTranscript('');
        cleanupRecognition();
    }, [cleanupRecognition]);

    return {
        transcript,
        interimTranscript,
        isListening,
        audioLevel,
        language,
        setLanguage,
        error,
        startListening,
        stopListening,
        resetTranscript,
    };
};
