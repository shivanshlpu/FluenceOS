import { useState, useEffect } from 'react';
import { Volume2, Sparkles, Key, Check, X, Settings2, Sliders, Play, RotateCcw } from 'lucide-react';
import { getVoiceSettings, saveVoiceSettings, speakAIResponse, stopAllSpeech } from '../../../services/voiceService';

const CLOUD_VOICES = [
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'Female', desc: 'Warm, clear, and encouraging' },
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'Male', desc: 'Deep, confident, and professional' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'Male', desc: 'Calm, steady, and articulated' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'Female', desc: 'Expressive and friendly' },
];

export default function VoiceSettingsModal({ isOpen, onClose, onSettingsChange }) {
    const [settings, setSettings] = useState(getVoiceSettings());
    const [savedNotice, setSavedNotice] = useState(false);
    const [testingAudio, setTestingAudio] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSettings(getVoiceSettings());
            setSavedNotice(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        saveVoiceSettings(settings);
        setSavedNotice(true);
        if (onSettingsChange) onSettingsChange(settings);
        setTimeout(() => {
            setSavedNotice(false);
            onClose();
        }, 600);
    };

    const handleTestAudio = () => {
        stopAllSpeech();
        saveVoiceSettings(settings);
        setTestingAudio(true);
        const sampleText = settings.engine === 'cloud'
            ? "Hello! I am your AI Speaking Partner powered by cloud voice. Let's practice English together!"
            : "Hello! I am your AI Speaking Coach powered by browser voice. Let's improve your fluency and pronunciation!";

        speakAIResponse(
            sampleText,
            () => setTestingAudio(true),
            () => setTestingAudio(false)
        );
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
        }}>
            <div style={{
                background: '#13131a',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '540px',
                padding: '24px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '38px', height: '38px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Volume2 size={20} color="#fff" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#fff' }}>
                                AI Voice & Machine Settings
                            </h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                                Choose between Free Browser Voice or Cloud AI Voice
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            stopAllSpeech();
                            onClose();
                        }}
                        style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            width: '32px', height: '32px',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Voice Engine Toggle (Both Options) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
                        Select Voice Engine
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {/* Option 1: Browser Voice */}
                        <div
                            onClick={() => setSettings(prev => ({ ...prev, engine: 'browser' }))}
                            style={{
                                padding: '14px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                background: settings.engine === 'browser' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                border: `1.5px solid ${settings.engine === 'browser' ? '#10b981' : 'rgba(255, 255, 255, 0.08)'}`,
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 800, color: settings.engine === 'browser' ? '#34d399' : '#fff' }}>
                                    🌐 Browser Voice
                                </span>
                                {settings.engine === 'browser' && <Check size={16} color="#34d399" />}
                            </div>
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                                100% Free · Instant 0ms latency · Unlimited usage
                            </p>
                        </div>

                        {/* Option 2: Cloud AI Voice */}
                        <div
                            onClick={() => setSettings(prev => ({ ...prev, engine: 'cloud' }))}
                            style={{
                                padding: '14px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                background: settings.engine === 'cloud' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                border: `1.5px solid ${settings.engine === 'cloud' ? '#a855f7' : 'rgba(255, 255, 255, 0.08)'}`,
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 800, color: settings.engine === 'cloud' ? '#c084fc' : '#fff' }}>
                                    ⚡ Cloud AI Voice
                                </span>
                                {settings.engine === 'cloud' && <Check size={16} color="#c084fc" />}
                            </div>
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                                Ultra-realistic neural speech · Custom API key
                            </p>
                        </div>
                    </div>
                </div>

                {/* Cloud AI Settings (When Cloud Engine is chosen) */}
                {settings.engine === 'cloud' && (
                    <div style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: 'rgba(168, 85, 247, 0.06)',
                        border: '1px solid rgba(168, 85, 247, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                    }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#c084fc', display: 'block', marginBottom: '6px' }}>
                                Cloud TTS API Key
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: '#0d0d12',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: '10px',
                                    padding: '10px 14px',
                                }}>
                                    <Key size={15} color="#c084fc" />
                                    <input
                                        type="text"
                                        placeholder="sk_..."
                                        value={settings.apiKey}
                                        onChange={e => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                                        style={{
                                            flex: 1,
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#fff',
                                            fontSize: '13px',
                                            outline: 'none',
                                            fontFamily: 'monospace',
                                        }}
                                    />
                                </div>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                Your key is stored securely in your local browser storage.
                            </span>
                        </div>

                        {/* Voice Persona Selector */}
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#c084fc', display: 'block', marginBottom: '6px' }}>
                                Cloud Voice Persona
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {CLOUD_VOICES.map(v => (
                                    <button
                                        key={v.id}
                                        onClick={() => setSettings(prev => ({ ...prev, voiceId: v.id }))}
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            background: settings.voiceId === v.id ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                                            border: `1px solid ${settings.voiceId === v.id ? '#a855f7' : 'rgba(255, 255, 255, 0.08)'}`,
                                            color: settings.voiceId === v.id ? '#fff' : 'var(--text-secondary)',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <div style={{ fontSize: '13px', fontWeight: 800 }}>{v.name} ({v.gender})</div>
                                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{v.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Speed / Pacing Slider */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
                            Speaking Speed
                        </label>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>
                            {settings.speed}x {settings.speed === 0.95 ? '(Recommended)' : ''}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {[0.8, 0.95, 1.1].map(rate => (
                            <button
                                key={rate}
                                onClick={() => setSettings(prev => ({ ...prev, speed: rate }))}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    borderRadius: '8px',
                                    background: settings.speed === rate ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                    border: `1px solid ${settings.speed === rate ? '#fff' : 'rgba(255, 255, 255, 0.08)'}`,
                                    color: settings.speed === rate ? '#fff' : 'var(--text-secondary)',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                {rate === 0.8 ? 'Slow (0.8x)' : rate === 0.95 ? 'Normal (0.95x)' : 'Fast (1.1x)'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button
                        onClick={handleTestAudio}
                        disabled={testingAudio}
                        style={{
                            flex: 1,
                            padding: '13px',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 800,
                            cursor: testingAudio ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                        }}
                    >
                        <Play size={14} />
                        <span>{testingAudio ? 'Playing...' : 'Test Voice Audio'}</span>
                    </button>

                    <button
                        onClick={handleSave}
                        style={{
                            flex: 1,
                            padding: '13px',
                            borderRadius: '12px',
                            background: savedNotice ? '#10b981' : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                            border: 'none',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 14px rgba(168, 85, 247, 0.3)',
                        }}
                    >
                        <Check size={16} />
                        <span>{savedNotice ? 'Saved!' : 'Save Voice Choice'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
