// Voice Service for FluenceOS Speaking Coach
// Supports:
// 1. Browser Native Neural Voices (Free, Unlimited, Low-latency with GC protection)
// 2. Cloud AI Voice (ElevenLabs / Custom API Key) with automatic fallback
// 3. Audio Test & Verification Utility

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
        apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY) || '',
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
let activeUtteranceRef = null; // Prevents Chromium garbage-collection bug on SpeechSynthesisUtterance

// Preload available voices
let cachedVoices = [];
if (typeof window !== 'undefined' && window.speechSynthesis) {
    cachedVoices = window.speechSynthesis.getVoices() || [];
    window.speechSynthesis.onvoiceschanged = () => {
        try {
            cachedVoices = window.speechSynthesis.getVoices() || [];
        } catch (e) {}
    };
}

// Stop any ongoing voice audio (both browser and cloud)
export const stopAllSpeech = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
            window.speechSynthesis.cancel();
        } catch (e) {}
    }
    if (currentAudio) {
        try {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        } catch (e) {}
        currentAudio = null;
    }
    activeUtteranceRef = null;
};

// Play speech using Browser Native Synthesis (with GC & Resume Protection)
export const speakWithBrowser = (text, options = {}, onStart = null, onEnd = null, onError = null) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !text) {
        if (onEnd) onEnd();
        return;
    }

    try {
        stopAllSpeech();
        
        // Ensure synthesis engine is not suspended
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        activeUtteranceRef = utterance; // Prevent GC
        if (typeof window !== 'undefined') {
            window._activeVoiceUtterance = utterance;
        }

        utterance.lang = 'en-US';
        utterance.rate = options.speed || 0.95;
        utterance.pitch = options.pitch || 1.0;

        // Select the best natural-sounding English voice
        const voices = (cachedVoices && cachedVoices.length > 0) ? cachedVoices : (window.speechSynthesis.getVoices() || []);
        const preferredVoice = voices.find(v =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('David') || v.name.includes('George') || v.name.includes('Ava'))
        ) || voices.find(v => v.lang.startsWith('en-US') || v.lang.startsWith('en-GB')) || voices.find(v => v.lang.startsWith('en'));

        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        let hasFinished = false;
        const finish = () => {
            if (hasFinished) return;
            hasFinished = true;
            activeUtteranceRef = null;
            if (onEnd) onEnd();
        };

        utterance.onstart = () => {
            if (onStart) onStart();
        };

        utterance.onend = () => {
            finish();
        };

        utterance.onerror = (e) => {
            console.warn('[VOICE] Browser TTS notice:', e);
            finish();
        };

        // Fallback safety timeout if browser drops onend
        const words = text.split(/\s+/).length;
        const estDurationMs = Math.max(3000, (words / (120 * (options.speed || 0.95))) * 60000 + 2000);
        setTimeout(() => {
            if (!hasFinished && activeUtteranceRef === utterance) {
                finish();
            }
        }, estDurationMs);

        window.speechSynthesis.speak(utterance);
    } catch (err) {
        console.warn('[VOICE] Browser speech exception:', err);
        if (onEnd) onEnd();
    }
};

// Play speech using Cloud AI Voice with auto-fallback to browser voice
export const speakWithCloudAI = async (text, apiKey, voiceId, options = {}, onStart = null, onEnd = null) => {
    const key = apiKey || getVoiceSettings().apiKey;
    const vId = voiceId || getVoiceSettings().voiceId || '21m00Tcm4TlvDq8ikWAM';

    if (!key) {
        // Fallback directly to browser native voice
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
            console.warn(`[VOICE] Cloud TTS returned ${response.status}. Switching to Browser Voice.`);
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
        console.warn('[VOICE] Cloud speech exception, using fallback:', err);
        speakWithBrowser(text, options, onStart, onEnd);
    }
};

// Master Speak Function
export const speakAIResponse = (text, onStart = null, onEnd = null) => {
    const settings = getVoiceSettings();
    if (settings.engine === 'cloud' && settings.apiKey) {
        speakWithCloudAI(text, settings.apiKey, settings.voiceId, { speed: settings.speed, pitch: settings.pitch }, onStart, onEnd);
    } else {
        speakWithBrowser(text, { speed: settings.speed, pitch: settings.pitch }, onStart, onEnd);
    }
};

// Audio Verification & Earphones Tester Helper
export const testAudioPlayback = (onStart = null, onEnd = null) => {
    const testPhrase = "Hello! Your earphones and audio output are working perfectly. You can hear my voice loud and clear.";
    speakAIResponse(testPhrase, onStart, onEnd);
};
