// Voice Service for FluenceOS Speaking Coach
// Supports both:
// 1. Browser Native Neural Voices (Free, Unlimited, Low-latency)
// 2. Cloud AI Voice (ElevenLabs / Custom API Key) with automatic fallback

const STORAGE_KEYS = {
    ENGINE: 'fluence_voice_engine', // 'browser' | 'cloud'
    API_KEY: 'fluence_voice_api_key',
    VOICE_ID: 'fluence_voice_id',
    SPEED: 'fluence_voice_speed',
    PITCH: 'fluence_voice_pitch',
};

export const getVoiceSettings = () => {
    return {
        engine: localStorage.getItem(STORAGE_KEYS.ENGINE) || 'browser',
        apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY) || 'sk_63a77ea40dc22cbb0b8ad8eaf48d5614d9fd5bba147fac5a',
        voiceId: localStorage.getItem(STORAGE_KEYS.VOICE_ID) || '21m00Tcm4TlvDq8ikWAM', // Rachel default in ElevenLabs
        speed: parseFloat(localStorage.getItem(STORAGE_KEYS.SPEED) || '0.95'),
        pitch: parseFloat(localStorage.getItem(STORAGE_KEYS.PITCH) || '1.0'),
    };
};

export const saveVoiceSettings = (settings) => {
    if (settings.engine) localStorage.setItem(STORAGE_KEYS.ENGINE, settings.engine);
    if (settings.apiKey !== undefined) localStorage.setItem(STORAGE_KEYS.API_KEY, settings.apiKey);
    if (settings.voiceId) localStorage.setItem(STORAGE_KEYS.VOICE_ID, settings.voiceId);
    if (settings.speed) localStorage.setItem(STORAGE_KEYS.SPEED, String(settings.speed));
    if (settings.pitch) localStorage.setItem(STORAGE_KEYS.PITCH, String(settings.pitch));
};

let currentAudio = null;

// Stop any ongoing voice audio (both browser and cloud)
export const stopAllSpeech = () => {
    if (window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    if (currentAudio) {
        try {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        } catch (e) {}
        currentAudio = null;
    }
};

// Play speech using Browser Native Synthesis
export const speakWithBrowser = (text, options = {}, onStart = null, onEnd = null, onError = null) => {
    if (!window.speechSynthesis || !text) {
        if (onEnd) onEnd();
        return;
    }

    try {
        stopAllSpeech();
        window.speechSynthesis.resume();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = options.speed || 0.95;
        utterance.pitch = options.pitch || 1.0;

        const voices = window.speechSynthesis.getVoices?.() || [];
        const preferredVoice = voices.find(v =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('David'))
        ) || voices.find(v => v.lang.startsWith('en'));

        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => { if (onStart) onStart(); };
        utterance.onend = () => { if (onEnd) onEnd(); };
        utterance.onerror = (e) => {
            console.warn('[VOICE] Browser TTS warning:', e);
            if (onEnd) onEnd();
        };

        window.speechSynthesis.speak(utterance);
    } catch (err) {
        console.warn('[VOICE] Browser speech exception:', err);
        if (onEnd) onEnd();
    }
};

// Play speech using ElevenLabs Cloud AI Voice with auto-fallback to browser voice
export const speakWithCloudAI = async (text, apiKey, voiceId, options = {}, onStart = null, onEnd = null) => {
    const key = apiKey || getVoiceSettings().apiKey;
    const vId = voiceId || getVoiceSettings().voiceId || '21m00Tcm4TlvDq8ikWAM';

    if (!key) {
        // Fallback to browser
        speakWithBrowser(text, options, onStart, onEnd);
        return;
    }

    try {
        stopAllSpeech();
        if (onStart) onStart();

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': key,
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_turbo_v2_5',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                }
            })
        });

        if (!response.ok) {
            console.warn(`[VOICE] Cloud TTS returned ${response.status}. Switching to Browser Voice fallback.`);
            speakWithBrowser(text, options, onStart, onEnd);
            return;
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        currentAudio = audio;

        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            currentAudio = null;
            if (onEnd) onEnd();
        };

        audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            currentAudio = null;
            speakWithBrowser(text, options, onStart, onEnd);
        };

        await audio.play();
    } catch (err) {
        console.warn('[VOICE] Cloud speech failed, using fallback:', err);
        speakWithBrowser(text, options, onStart, onEnd);
    }
};

// Master Speak Function that respects the user's active choice
export const speakAIResponse = (text, onStart = null, onEnd = null) => {
    const settings = getVoiceSettings();
    if (settings.engine === 'cloud' && settings.apiKey) {
        speakWithCloudAI(text, settings.apiKey, settings.voiceId, { speed: settings.speed, pitch: settings.pitch }, onStart, onEnd);
    } else {
        speakWithBrowser(text, { speed: settings.speed, pitch: settings.pitch }, onStart, onEnd);
    }
};
