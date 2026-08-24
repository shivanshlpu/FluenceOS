import { pythonAPI, javaAPI } from './api';

export const marketService = {
    analyzeRole: async (role) => {
        try {
            return await pythonAPI.get(`/api/market/analyze?role=${encodeURIComponent(role)}`);
        } catch (err) {
            console.warn('[MARKET] Python backend failed, trying Java fallback:', err);
            return await javaAPI.get(`/api/java/market/analyze?role=${encodeURIComponent(role)}`);
        }
    },

    getSkillsForRole: async (role) => {
        try {
            return await pythonAPI.get(`/api/market/skills?role=${encodeURIComponent(role)}`);
        } catch (err) {
            return await javaAPI.get(`/api/java/market/skills?role=${encodeURIComponent(role)}`);
        }
    },
};
