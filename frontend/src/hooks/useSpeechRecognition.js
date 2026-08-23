import { useState, useRef, useCallback, useEffect } from 'react';

export const useSpeechRecognition = (onSilenceDetected = null) => {
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState(null);
    const recognitionRef = useRef(null);
    const stopRequestedRef = useRef(false);
    const isMountedRef = useRef(true);
    const silenceTimerRef = useRef(null);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            stopRequestedRef.current = true;
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            try {
                if (recognitionRef.current) {
                    recognitionRef.current.abort ? recognitionRef.current.abort() : recognitionRef.current.stop();
                }
            } catch (e) {}
        };
    }, []);

    const resetTranscript = useCallback(() => {
        setTranscript('');
        setInterimTranscript('');
    }, []);

    const startListening = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
            return;
        }

        // Clean up previous instance
        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort ? recognitionRef.current.abort() : recognitionRef.current.stop();
            } catch (e) {}
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            if (!isMountedRef.current) return;

            let finalStr = '';
            let interimStr = '';

            // Iterate over all results in current session from 0 to avoid duplicates
            for (let i = 0; i < event.results.length; i++) {
                const res = event.results[i];
                const text = res[0].transcript;
                if (res.isFinal) {
                    finalStr += (finalStr ? ' ' : '') + text.trim();
                } else {
                    interimStr += (interimStr ? ' ' : '') + text.trim();
                }
            }

            setTranscript(finalStr);
            setInterimTranscript(interimStr);

            // Silence auto-detection timer (if callback provided)
            if (onSilenceDetected && (finalStr || interimStr)) {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = setTimeout(() => {
                    if (isMountedRef.current && (finalStr || interimStr)) {
                        onSilenceDetected(finalStr || interimStr);
                    }
                }, 2200); // 2.2s of silence triggers auto-send
            }
        };

        recognition.onstart = () => {
            if (isMountedRef.current) {
                setIsListening(true);
                stopRequestedRef.current = false;
                setError(null);
            }
        };

        recognition.onend = () => {
            if (!isMountedRef.current) return;

            if (!stopRequestedRef.current) {
                // Auto-restart if disconnected prematurely
                try {
                    recognition.start();
                } catch (e) {
                    if (isMountedRef.current) {
                        setIsListening(false);
                        setInterimTranscript('');
                    }
                }
            } else {
                if (isMountedRef.current) {
                    setIsListening(false);
                    setInterimTranscript('');
                }
            }
        };

        recognition.onerror = (e) => {
            if (!isMountedRef.current) return;
            if (e.error === 'no-speech') return; // Silence is normal
            console.warn('[SPEECH] Recognition warning:', e.error);
            setError(e.error);
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                stopRequestedRef.current = true;
                setIsListening(false);
            }
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {
            console.warn('[SPEECH] Recognition start error:', e);
        }
    }, [onSilenceDetected]);

    const stopListening = useCallback(() => {
        stopRequestedRef.current = true;
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        try {
            recognitionRef.current?.stop();
        } catch (e) {}
        if (isMountedRef.current) {
            setIsListening(false);
            setInterimTranscript('');
        }
    }, []);

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
