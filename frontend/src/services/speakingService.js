import { pythonAPI } from './api';

export const speakingService = {
    getTopicExplanation: (topic) =>
        pythonAPI.get(`/api/speaking/generate-topic?topic=${encodeURIComponent(topic)}`),

    evaluateSpeech: (data) =>
        pythonAPI.post('/api/speaking/evaluate', data),

    getHistory: (limit = 10) =>
        pythonAPI.get(`/api/speaking/history?limit=${limit}`),

    getStats: () =>
        pythonAPI.get('/api/speaking/stats'),
};
