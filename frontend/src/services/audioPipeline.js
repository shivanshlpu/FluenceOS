/**
 * Advanced Web Audio & VAD Pipeline for FluenceOS Reading Practice
 * 
 * Features:
 * 1. WebRTC Audio Constraints (AEC, AGC, Noise Suppression)
 * 2. Web Audio High-Pass 80Hz BiquadFilterNode (eliminates fan/sub-bass rumble)
 * 3. Real-Time Time & Frequency Domain Analyzer (RMS in dBFS, Peak, ZCR, Spectral Centroid)
 * 4. Adaptive Leaky Noise-Floor Tracker with dynamic SNR thresholding
 * 5. State-based Voice Activity Detection (VAD) with Attack/Hangover hysteresis
 * 6. Audio Quality Analyzer (Noise level, Volume, Clipping/Distortion, Speech Duration)
 * 7. Device Change Listener (Bluetooth/USB headset switching)
 */

export const AUDIO_CONFIG = {
    // WebRTC Constraints
    constraints: {
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: true },
        channelCount: { ideal: 1 },
        sampleRate: { ideal: 48000 },
    },
    // High-pass filter cutoff to remove sub-bass rumble (fan/AC/vibrations)
    highPassCutoffHz: 80,
    // VAD Parameters
    vad: {
        minSpeechThresholdDb: -38,   // Minimum dBFS level to consider as potential speech
        noiseFloorSnrMarginDb: 8,    // Speech must exceed noise floor by this margin (dB)
        attackTimeMs: 90,             // Sustained energy required to trigger speech (filters key clicks)
        hangoverTimeMs: 750,          // Duration of silence before speech end (preserves pauses)
        maxSilenceAutoStopMs: 4000,   // Silence duration to trigger auto-stop suggestion
        noiseFloorAlphaRise: 0.005,  // Slow rise for noise floor tracking
        noiseFloorAlphaFall: 0.05,   // Fast fall for noise floor tracking
        defaultNoiseFloorDb: -55,    // Initial estimated noise floor
    },
    // Quality Gating Thresholds
    quality: {
        minSnrDb: 6.0,                // Min acceptable Signal-to-Noise Ratio
        maxNoiseFloorDb: -26.0,       // Max ambient noise level allowed
        minSpeechRmsDb: -42.0,        // Min speech volume allowed (too quiet)
        maxClippingRatio: 0.05,       // Max allowable digital clipping ratio (5%)
        minSpeechDurationSec: 1.2,    // Min active speech time required
        minSpeechRatio: 0.15,         // Min ratio of active speech to session duration
    }
};

export class AudioPipeline {
    constructor(config = AUDIO_CONFIG) {
        this.config = config;
        this.audioContext = null;
        this.mediaStream = null;
        this.sourceNode = null;
        this.filterNode = null;
        this.analyserNode = null;
        this.gainNode = null;

        // Analysis state
        this.isInitialized = false;
        this.isProcessing = false;
        this.rafId = null;

        // VAD state
        this.noiseFloorDb = this.config.vad.defaultNoiseFloorDb;
        this.isSpeechActive = false;
        this.speechOnsetTimestamp = null;
        this.silenceOnsetTimestamp = null;
        this.lastVADState = false;

        // Session Quality Accumulator
        this.sessionStats = {
            startTime: 0,
            endTime: 0,
            totalFrames: 0,
            speechFrames: 0,
            clippedFrames: 0,
            sumRmsDb: 0,
            sumSpeechRmsDb: 0,
            minRmsDb: 0,
            maxRmsDb: -100,
            peakAmplitude: 0,
            noiseFloorSnapshots: [],
        };

        // Callbacks
        this.onVADChange = null;        // (isSpeech: boolean, metrics: object) => void
        this.onAudioMetrics = null;     // (metrics: object) => void
        this.onDeviceChange = null;     // () => void

        this._boundDeviceChangeListener = this._handleDeviceChange.bind(this);
    }

    /**
     * Request microphone access with high-fidelity WebRTC processing constraints
     */
    async initialize(mediaStream = null) {
        try {
            if (typeof window === 'undefined') return false;

            // Stop any existing stream
            this.cleanup();

            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                console.warn('[AUDIO-PIPELINE] AudioContext not supported in this browser.');
                return false;
            }

            this.audioContext = new AudioContextClass();
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            if (mediaStream) {
                this.mediaStream = mediaStream;
            } else {
                this.mediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: this.config.constraints,
                    video: false
                });
            }

            // Listen for device changes (Bluetooth headset connection/disconnection)
            if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
                navigator.mediaDevices.addEventListener('devicechange', this._boundDeviceChangeListener);
            }

            // Create Web Audio Processing Graph
            // Source -> High-Pass 80Hz Filter -> AnalyserNode
            this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
            
            // 80Hz High-Pass Filter (eliminates AC drone, fan rumble, desk vibrations)
            this.filterNode = this.audioContext.createBiquadFilter();
            this.filterNode.type = 'highpass';
            this.filterNode.frequency.setValueAtTime(this.config.highPassCutoffHz, this.audioContext.currentTime);
            this.filterNode.Q.setValueAtTime(0.707, this.audioContext.currentTime); // Butterworth characteristic

            // Analyser for real-time time & frequency analysis
            this.analyserNode = this.audioContext.createAnalyser();
            this.analyserNode.fftSize = 1024;
            this.analyserNode.smoothingTimeConstant = 0.4;

            // Connect graph
            this.sourceNode.connect(this.filterNode);
            this.filterNode.connect(this.analyserNode);

            this.isInitialized = true;
            this._resetSessionStats();
            this._startAnalysisLoop();

            console.log('[AUDIO-PIPELINE] Audio graph initialized successfully with 80Hz rumble filter & WebRTC constraints.');
            return true;
        } catch (err) {
            console.error('[AUDIO-PIPELINE] Initialization error:', err);
            this.cleanup();
            throw err;
        }
    }

    _resetSessionStats() {
        this.noiseFloorDb = this.config.vad.defaultNoiseFloorDb;
        this.isSpeechActive = false;
        this.speechOnsetTimestamp = null;
        this.silenceOnsetTimestamp = null;
        this.lastVADState = false;

        this.sessionStats = {
            startTime: Date.now(),
            endTime: 0,
            totalFrames: 0,
            speechFrames: 0,
            clippedFrames: 0,
            sumRmsDb: 0,
            sumSpeechRmsDb: 0,
            minRmsDb: 0,
            maxRmsDb: -100,
            peakAmplitude: 0,
            noiseFloorSnapshots: [],
        };
    }

    _handleDeviceChange() {
        console.log('[AUDIO-PIPELINE] Audio hardware device change detected (e.g. Bluetooth/USB switch).');
        if (this.onDeviceChange) {
            this.onDeviceChange();
        }
    }

    _startAnalysisLoop() {
        if (!this.analyserNode) return;
        this.isProcessing = true;

        const timeData = new Float32Array(this.analyserNode.fftSize);
        const freqData = new Uint8Array(this.analyserNode.frequencyBinCount);

        const analyze = () => {
            if (!this.isProcessing || !this.analyserNode) return;

            this.analyserNode.getFloatTimeDomainData(timeData);
            this.analyserNode.getByteFrequencyData(freqData);

            // 1. Calculate RMS & Peak Amplitude
            let sumSquares = 0;
            let peak = 0;
            let zeroCrossings = 0;
            const len = timeData.length;

            for (let i = 0; i < len; i++) {
                const sample = timeData[i];
                const absSample = Math.abs(sample);
                if (absSample > peak) peak = absSample;
                sumSquares += sample * sample;
                if (i > 0 && ((timeData[i] >= 0 && timeData[i - 1] < 0) || (timeData[i] < 0 && timeData[i - 1] >= 0))) {
                    zeroCrossings++;
                }
            }

            const rms = Math.sqrt(sumSquares / len);
            // Convert to dBFS (0 dBFS = max digital level, -100 dBFS = digital silence)
            const currentRmsDb = rms > 0.00001 ? 20 * Math.log10(rms) : -100;
            const isClipped = peak >= 0.985;
            const zcr = zeroCrossings / len;

            // 2. Spectral Analysis (Speech Band Energy 300Hz-3400Hz vs Total)
            const sampleRate = this.audioContext?.sampleRate || 48000;
            const binWidth = (sampleRate / 2) / freqData.length;
            const speechStartBin = Math.floor(300 / binWidth);
            const speechEndBin = Math.min(freqData.length - 1, Math.floor(3400 / binWidth));

            let speechBandEnergy = 0;
            let totalEnergy = 0;
            for (let i = 0; i < freqData.length; i++) {
                const val = freqData[i];
                totalEnergy += val;
                if (i >= speechStartBin && i <= speechEndBin) {
                    speechBandEnergy += val;
                }
            }
            const speechBandRatio = totalEnergy > 0 ? speechBandEnergy / totalEnergy : 0;

            // 3. Adaptive Noise Floor Tracking (Leaky follower)
            // If current level is lower than noise floor, drop quickly; if higher, rise very slowly
            if (currentRmsDb < this.noiseFloorDb) {
                this.noiseFloorDb += this.config.vad.noiseFloorAlphaFall * (currentRmsDb - this.noiseFloorDb);
            } else if (!this.isSpeechActive && currentRmsDb < this.noiseFloorDb + 10) {
                this.noiseFloorDb += this.config.vad.noiseFloorAlphaRise * (currentRmsDb - this.noiseFloorDb);
            }
            // Clamp noise floor to sensible range [-80dBFS, -20dBFS]
            this.noiseFloorDb = Math.max(-80, Math.min(-20, this.noiseFloorDb));

            // 4. Dynamic VAD Calculation with Hysteresis & SNR Margin
            const dynamicSpeechThreshold = Math.max(
                this.config.vad.minSpeechThresholdDb,
                this.noiseFloorDb + this.config.vad.noiseFloorSnrMarginDb
            );

            const isEnergyAboveThreshold = currentRmsDb > dynamicSpeechThreshold;
            const isLikelySpeechFrame = isEnergyAboveThreshold && (speechBandRatio > 0.25 || zcr < 0.45);
            const now = Date.now();

            if (isLikelySpeechFrame) {
                this.silenceOnsetTimestamp = null;
                if (!this.speechOnsetTimestamp) {
                    this.speechOnsetTimestamp = now;
                }
                // Attack hysteresis: must sustain energy for attackTimeMs
                if (now - this.speechOnsetTimestamp >= this.config.vad.attackTimeMs) {
                    this.isSpeechActive = true;
                }
            } else {
                this.speechOnsetTimestamp = null;
                if (!this.silenceOnsetTimestamp) {
                    this.silenceOnsetTimestamp = now;
                }
                // Hangover hysteresis: must sustain silence for hangoverTimeMs
                if (now - this.silenceOnsetTimestamp >= this.config.vad.hangoverTimeMs) {
                    this.isSpeechActive = false;
                }
            }

            // 5. Update Session Stats
            this.sessionStats.totalFrames++;
            this.sessionStats.sumRmsDb += currentRmsDb;
            if (isClipped) this.sessionStats.clippedFrames++;
            if (this.isSpeechActive) {
                this.sessionStats.speechFrames++;
                this.sessionStats.sumSpeechRmsDb += currentRmsDb;
            }
            if (currentRmsDb > this.sessionStats.maxRmsDb) this.sessionStats.maxRmsDb = currentRmsDb;
            if (peak > this.sessionStats.peakAmplitude) this.sessionStats.peakAmplitude = peak;
            if (this.sessionStats.totalFrames % 30 === 0) {
                this.sessionStats.noiseFloorSnapshots.push(this.noiseFloorDb);
            }

            // 6. Notify Listeners
            const snrDb = Math.max(0, currentRmsDb - this.noiseFloorDb);
            const visualLevel = Math.min(100, Math.max(0, Math.round(((currentRmsDb + 60) / 60) * 100)));

            const metrics = {
                rmsDb: Math.round(currentRmsDb * 10) / 10,
                noiseFloorDb: Math.round(this.noiseFloorDb * 10) / 10,
                snrDb: Math.round(snrDb * 10) / 10,
                visualLevel,
                peak: Math.round(peak * 100) / 100,
                isClipped,
                isSpeechActive: this.isSpeechActive,
                speechBandRatio: Math.round(speechBandRatio * 100) / 100,
                frequencies: Array.from(freqData.slice(0, 16)), // First 16 frequency bands for UI visualizer
            };

            if (this.onAudioMetrics) {
                this.onAudioMetrics(metrics);
            }

            if (this.lastVADState !== this.isSpeechActive) {
                this.lastVADState = this.isSpeechActive;
                if (this.onVADChange) {
                    this.onVADChange(this.isSpeechActive, metrics);
                }
            }

            this.rafId = requestAnimationFrame(analyze);
        };

        this.rafId = requestAnimationFrame(analyze);
    }

    /**
     * Stop analysis and evaluate full session audio quality against rejection thresholds
     */
    evaluateSessionQuality() {
        this.sessionStats.endTime = Date.now();
        const durationSec = Math.max(0.1, (this.sessionStats.endTime - this.sessionStats.startTime) / 1000);
        const totalFrames = Math.max(1, this.sessionStats.totalFrames);
        const speechFrames = this.sessionStats.speechFrames;
        
        const avgRmsDb = this.sessionStats.sumRmsDb / totalFrames;
        const avgSpeechRmsDb = speechFrames > 0 ? this.sessionStats.sumSpeechRmsDb / speechFrames : -100;
        const clippingRatio = this.sessionStats.clippedFrames / totalFrames;
        const speechRatio = speechFrames / totalFrames;
        const activeSpeechDurationSec = durationSec * speechRatio;
        const avgNoiseFloorDb = this.sessionStats.noiseFloorSnapshots.length > 0
            ? this.sessionStats.noiseFloorSnapshots.reduce((a, b) => a + b, 0) / this.sessionStats.noiseFloorSnapshots.length
            : this.noiseFloorDb;

        const effectiveSnrDb = speechFrames > 0 ? Math.max(0, avgSpeechRmsDb - avgNoiseFloorDb) : 0;

        // Gating validations
        const isExcessiveNoise = effectiveSnrDb < this.config.quality.minSnrDb || avgNoiseFloorDb > this.config.quality.maxNoiseFloorDb;
        const isTooQuiet = speechFrames === 0 || avgSpeechRmsDb < this.config.quality.minSpeechRmsDb;
        const isSeverelyClipped = clippingRatio > this.config.quality.maxClippingRatio;
        const isInsufficientSpeech = activeSpeechDurationSec < this.config.quality.minSpeechDurationSec || speechRatio < this.config.quality.minSpeechRatio;
        const isSilent = speechFrames === 0 || activeSpeechDurationSec < 0.5;

        let isAcceptable = true;
        let rejectionReason = null;
        let userMessage = null;

        if (isSilent) {
            isAcceptable = false;
            rejectionReason = 'silence';
            userMessage = 'No speech detected. Please check your microphone and speak clearly into the mic.';
        } else if (isExcessiveNoise) {
            isAcceptable = false;
            rejectionReason = 'noise_too_high';
            userMessage = 'Your surroundings are too noisy (fan, AC, or background talking). Please move closer to the microphone and try again.';
        } else if (isTooQuiet) {
            isAcceptable = false;
            rejectionReason = 'too_quiet';
            userMessage = 'Your voice was too quiet or faint. Please speak louder and adjust your microphone input volume.';
        } else if (isSeverelyClipped) {
            isAcceptable = false;
            rejectionReason = 'clipped';
            userMessage = 'Your audio was distorted or clipping. Please move slightly further from the microphone and speak naturally.';
        } else if (isInsufficientSpeech) {
            isAcceptable = false;
            rejectionReason = 'insufficient_speech';
            userMessage = 'Speech duration was too short. Please read the passage completely.';
        }

        // Composite Quality Score (0-100%)
        let qualityScore = 100;
        if (effectiveSnrDb < 15) qualityScore -= (15 - effectiveSnrDb) * 3;
        if (clippingRatio > 0.01) qualityScore -= clippingRatio * 300;
        if (avgSpeechRmsDb < -30) qualityScore -= (-30 - avgSpeechRmsDb) * 2;
        qualityScore = Math.max(0, Math.min(100, Math.round(qualityScore)));

        return {
            isAcceptable,
            rejectionReason,
            userMessage,
            qualityScore,
            metrics: {
                durationSec: Math.round(durationSec * 10) / 10,
                activeSpeechDurationSec: Math.round(activeSpeechDurationSec * 10) / 10,
                speechRatio: Math.round(speechRatio * 100) / 100,
                avgSpeechRmsDb: Math.round(avgSpeechRmsDb * 10) / 10,
                avgNoiseFloorDb: Math.round(avgNoiseFloorDb * 10) / 10,
                snrDb: Math.round(effectiveSnrDb * 10) / 10,
                clippingRatio: Math.round(clippingRatio * 1000) / 1000,
                peakAmplitude: Math.round(this.sessionStats.peakAmplitude * 100) / 100,
            }
        };
    }

    cleanup() {
        this.isProcessing = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
            navigator.mediaDevices.removeEventListener('devicechange', this._boundDeviceChangeListener);
        }

        if (this.sourceNode) {
            try { this.sourceNode.disconnect(); } catch (e) {}
            this.sourceNode = null;
        }
        if (this.filterNode) {
            try { this.filterNode.disconnect(); } catch (e) {}
            this.filterNode = null;
        }
        if (this.analyserNode) {
            try { this.analyserNode.disconnect(); } catch (e) {}
            this.analyserNode = null;
        }
        if (this.audioContext && this.audioContext.state !== 'closed') {
            try { this.audioContext.close(); } catch (e) {}
            this.audioContext = null;
        }

        this.isInitialized = false;
    }
}
