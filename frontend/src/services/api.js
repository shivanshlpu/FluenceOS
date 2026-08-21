import axios from 'axios';

// Python FastAPI backend
export const pythonAPI = axios.create({
    baseURL: import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000',
    timeout: 15000,
});

// Java Spring Boot backend
export const javaAPI = axios.create({
    baseURL: import.meta.env.VITE_JAVA_API_URL || 'http://localhost:8085',
    timeout: 15000,
});

// Simple in-memory cache for high-concurrency 1000-user smooth browsing (TTL: 30 seconds)
const apiCache = new Map();

// Attach token & caching logic to all clients
[pythonAPI, javaAPI].forEach((api) => {
    api.interceptors.request.use((config) => {
        const token = localStorage.getItem('authToken');
        if (token) config.headers.Authorization = `Bearer ${token}`;

        // Cache GET requests
        if (config.method === 'get') {
            const cacheKey = `${config.baseURL}${config.url}?${JSON.stringify(config.params || {})}`;
            const cached = apiCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < 30000) {
                config.adapter = () => Promise.resolve({
                    data: cached.data,
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config,
                });
            }
        }

        return config;
    });

    api.interceptors.response.use(
        (response) => {
            // Store GET responses in cache
            if (response.config.method === 'get') {
                const cacheKey = `${response.config.baseURL}${response.config.url}?${JSON.stringify(response.config.params || {})}`;
                apiCache.set(cacheKey, { timestamp: Date.now(), data: response.data });
            }
            return response.data;
        },
        async (error) => {
            if (error.response?.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                if (window.location.pathname !== '/auth') {
                    window.location.href = '/auth';
                }
            }
            return Promise.reject(error);
        }
    );
});
