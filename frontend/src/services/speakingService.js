import { pythonAPI } from './api';

export const speakingService = {
    getModels: () =>
        pythonAPI.get('/api/speaking/models'),

    getTopicExplanation: (topic, model = 'auto', angle = null, seed = null) => {
        let url = `/api/speaking/generate-topic?topic=${encodeURIComponent(topic)}&model=${encodeURIComponent(model || 'auto')}`;
        if (angle) url += `&angle=${encodeURIComponent(angle)}`;
        if (seed !== null && seed !== undefined) url += `&seed=${encodeURIComponent(seed)}`;
        return pythonAPI.get(url);
    },

    getReadingParagraph: (topic, level = 'beginner', model = 'auto', angle = null) => {
        let url = `/api/speaking/reading/paragraph?topic=${encodeURIComponent(topic)}&level=${encodeURIComponent(level)}&model=${encodeURIComponent(model || 'auto')}`;
        if (angle) url += `&angle=${encodeURIComponent(angle)}`;
        return pythonAPI.get(url);
    },

    evaluateSpeech: (data) =>
        pythonAPI.post('/api/speaking/evaluate', data),

    evaluateReading: (data) =>
        pythonAPI.post('/api/speaking/reading/evaluate', data),

    chatVoiceCoach: (data) =>
        pythonAPI.post('/api/speaking/chat', data),

    getHistory: (limit = 10) =>
        pythonAPI.get(`/api/speaking/history?limit=${limit}`),

    getStats: () =>
        pythonAPI.get('/api/speaking/stats'),
};

