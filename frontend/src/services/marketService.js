import { javaAPI } from './api';

export const marketService = {
    analyzeRole: (role) =>
        javaAPI.get(`/api/java/market/analyze?role=${encodeURIComponent(role)}`),

    getSkillsForRole: (role) =>
        javaAPI.get(`/api/java/market/skills?role=${encodeURIComponent(role)}`),
};
