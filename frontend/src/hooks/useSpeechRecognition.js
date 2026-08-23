import { useState, useRef, useCallback, useEffect } from 'react';
import { pythonAPI } from '../services/api';

/**
 * Google Assistant-Style Continuous Speech Recognition Hook
 * 1. Zero Word Loss: Auto-commits interim text on pauses so no word ever vanishes.
 * 2. Pause-Tolerant: Mic stays continuously alive during natural speaking pauses.
 * 3. Live Web Audio Level Meter: Real-time volume visualizer (0-100).
 * 4. Parallel Audio Recording: Captures raw audio for Whisper AI transcription.
 * 5. Multi-Accent Support: 'en-IN', 'en-US', 'en-GB'.
 */
export const useSpeechRecognition = (onSilenceDetected = null, initialLanguage = 'en-IN') => {
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [language, setLanguage] = useState(initialLanguage);
    const [error, setError] = useState(null);
    const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);

    const recognitionRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animFrameRef = useRef(null);

    const isListeningRef = useRef(false);
    const isMountedRef = useRef(true);
    const isStartingRef = useRef(false);
    const languageRef = useRef(language);

    const accumulatedTextRef = useRef('');
    const sessionFinalTextRef = useRef('');
    const lastInterimRef = useRef('');
    const restartTimerRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const consecutiveErrorsRef = useRef(0);

    useEffect(() => {
        languageRef.current = language;
    }, [language]);

    // Keep transcript state synchronized with accumulatedTextRef
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

    // Setup Web Audio Volume Meter & MediaRecorder
    const startAudioMeter = useCallback(async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

            // Reuse stream if already active
            let stream = mediaStreamRef.current;
            if (!stream || !stream.active) {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                mediaStreamRef.current = stream;
            }

            // Start parallel MediaRecorder for Whisper AI
            audioChunksRef.current = [];
            try {
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

                recorder.start(500); // 500ms time slices
            } catch (recErr) {
                console.warn('[AUDIO] MediaRecorder init notice:', recErr);
            }

            // Audio Visualizer setup
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;

            const audioCtx = new AudioCtx();
            audioContextRef.current = audioCtx;

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.4;
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
            console.warn('[AUDIO] Volume meter error:', err);
        }
    }, []);

    const stopAudioMeter = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try {
                mediaRecorderRef.current.stop();
            } catch (e) {}
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
                recognitionRef.current.abort();
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
        lastInterimRef.current = '';
        audioChunksRef.current = [];
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
        recognition.lang = languageRef.current || 'en-IN';
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
            lastInterimRef.current = currentInterim;

            updateFullTranscript(currentFinal, currentInterim);

            if (onSilenceDetected) {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = setTimeout(() => {
                    const fullText = (accumulatedTextRef.current + ' ' + (currentFinal || currentInterim)).trim();
                    if (isMountedRef.current && isListeningRef.current && fullText) {
                        onSilenceDetected(fullText);
                    }
                }, 3000); // 3 second learning pause tolerance
            }
        };

        recognition.onerror = (e) => {
            if (!isMountedRef.current) return;
            if (e.error === 'no-speech' || e.error === 'aborted') {
                return; // User just paused, ignore and stay active
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
        };

        recognition.onend = () => {
            if (!isMountedRef.current) return;

            // Commit final or interim words from this session to accumulated text
            const pendingText = (sessionFinalTextRef.current || lastInterimRef.current).trim();
            if (pendingText) {
                accumulatedTextRef.current = (accumulatedTextRef.current + (accumulatedTextRef.current ? ' ' : '') + pendingText).trim();
                sessionFinalTextRef.current = '';
                lastInterimRef.current = '';
                setTranscript(accumulatedTextRef.current);
                setInterimTranscript('');
            }

            // Google Assistant-Style Continuous Listening: Seamlessly re-engage without dropping words
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
                            console.warn('[SPEECH] Seamless restart notice:', err);
                        }
                    }
                }, 100);
            } else {
                setIsListening(false);
                setInterimTranscript('');
                stopAudioMeter();
            }
        };

        return recognition;
    }, [cleanupRecognition, onSilenceDetected, stopAudioMeter, updateFullTranscript]);

    const startListening = useCallback(() => {
        setError(null);
        isListeningRef.current = true;
        setIsListening(true);
        isStartingRef.current = true;
        consecutiveErrorsRef.current = 0;

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

        // Commit any remaining interim words
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

    // Transcribe with Groq Whisper AI (Ultra-high accuracy fallback)
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
        startListening,
        stopListening,
        resetTranscript,
        setTranscript,
        refineWithWhisper,
    };
};
