import { useState, useRef, useCallback, useEffect } from 'react';

export const useSpeechRecognition = () => {
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState(null);
    const recognitionRef = useRef(null);
    const stopRequestedRef = useRef(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            stopRequestedRef.current = true;
            try {
                if (recognitionRef.current) {
                    recognitionRef.current.stop();
                }
            } catch (e) {
                // ignore cleanup errors
            }
        };
    }, []);

    const startListening = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Speech recognition not supported in this browser. Use Chrome or Edge.');
            return;
        }

        // Clean up previous instance if any
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {}
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            if (!isMountedRef.current) return;
            let finalText = '';
            let interimText = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalText += result[0].transcript + ' ';
                } else {
                    interimText += result[0].transcript;
                }
            }

            if (finalText) setTranscript((prev) => prev + finalText);
            setInterimTranscript(interimText);
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
                // Try restarting once if stopped unexpectedly (due to silence), but only if still mounted
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
            if (e.error === 'no-speech') {
                return;
            }
            console.warn('Speech recognition warning:', e.error);
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
            console.warn('Recognition start exception:', e);
        }
    }, []);

    const stopListening = useCallback(() => {
        stopRequestedRef.current = true;
        try {
            recognitionRef.current?.stop();
        } catch (e) {}
        if (isMountedRef.current) {
            setIsListening(false);
            setInterimTranscript('');
        }
    }, []);

    const resetTranscript = useCallback(() => {
        setTranscript('');
        setInterimTranscript('');
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
