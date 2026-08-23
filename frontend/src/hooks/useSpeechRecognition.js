import { useState, useRef, useCallback, useEffect } from 'react';

export const useSpeechRecognition = (onSilenceDetected = null) => {
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState(null);

    const recognitionRef = useRef(null);
    const isListeningRef = useRef(false);
    const isMountedRef = useRef(true);
    const accumulatedTextRef = useRef('');
    const sessionFinalTextRef = useRef('');
    const restartTimerRef = useRef(null);
    const silenceTimerRef = useRef(null);

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
    }, []);

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

        cleanupRecognition();

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            if (!isMountedRef.current) return;
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
                }, 2200);
            }
        };

        recognition.onerror = (e) => {
            if (!isMountedRef.current) return;
            if (e.error === 'no-speech') return; // Normal silence between words
            if (e.error === 'aborted') return;

            console.warn('[SPEECH] Recognition error:', e.error);
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                isListeningRef.current = false;
                setIsListening(false);
                setError('Microphone permission denied. Please allow microphone access in your browser.');
            }
        };

        recognition.onend = () => {
            if (!isMountedRef.current) return;

            // Commit final words from this session to accumulated text
            if (sessionFinalTextRef.current) {
                accumulatedTextRef.current = (accumulatedTextRef.current + (accumulatedTextRef.current ? ' ' : '') + sessionFinalTextRef.current).trim();
                sessionFinalTextRef.current = '';
            }

            // Smooth automatic restart without rapid toggling
            if (isListeningRef.current) {
                if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
                restartTimerRef.current = setTimeout(() => {
                    if (isMountedRef.current && isListeningRef.current) {
                        try {
                            const newRec = createRecognitionInstance();
                            if (newRec) {
                                recognitionRef.current = newRec;
                                newRec.start();
                            }
                        } catch (err) {
                            console.warn('[SPEECH] Safe restart notice:', err);
                        }
                    }
                }, 150);
            } else {
                setIsListening(false);
                setInterimTranscript('');
            }
        };

        return recognition;
    }, [cleanupRecognition, onSilenceDetected]);

    const startListening = useCallback(() => {
        setError(null);
        isListeningRef.current = true;
        setIsListening(true);

        try {
            const recognition = createRecognitionInstance();
            if (recognition) {
                recognitionRef.current = recognition;
                recognition.start();
            }
        } catch (e) {
            console.warn('[SPEECH] Start listening error:', e);
        }
    }, [createRecognitionInstance]);

    const stopListening = useCallback(() => {
        isListeningRef.current = false;
        setIsListening(false);
        setInterimTranscript('');
        cleanupRecognition();
    }, [cleanupRecognition]);

    return {
        transcript,
        interimTranscript,
        isListening,
        error,
        startListening,
        stopListening,
        resetTranscript,
    };
};
