import { useState, useRef, useCallback } from 'react';

export const useSpeechRecognition = () => {
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState(null);
    const recognitionRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const stopRequestedRef = useRef(false);

    const startListening = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Speech recognition not supported. Use Chrome or Edge.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
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
            setIsListening(true);
            stopRequestedRef.current = false;
        };
        recognition.onend = () => {
            if (!stopRequestedRef.current) {
                // Browser stopped it automatically (due to silence). Restart it.
                try {
                    recognition.start();
                } catch (e) {
                    setIsListening(false);
                    setInterimTranscript('');
                }
            } else {
                setIsListening(false);
                setInterimTranscript('');
            }
        };
        recognition.onerror = (e) => {
            if (e.error === 'no-speech') {
                // Ignore no-speech errors, let it continue or let onend restart it
                return;
            }
            setError(e.error);
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {
            console.error(e);
        }
    }, []);

    const stopListening = useCallback(() => {
        stopRequestedRef.current = true;
        recognitionRef.current?.stop();
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
