import axios from 'axios';

// Python FastAPI backend
export const pythonAPI = axios.create({
    baseURL: import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000',
    timeout: 30000,
});

// Java Spring Boot backend
export const javaAPI = axios.create({
    baseURL: import.meta.env.VITE_JAVA_API_URL || 'http://localhost:8085',
    timeout: 30000,
});

// Request interceptor — attach token to all requests
[pythonAPI, javaAPI].forEach((api) => {
    api.interceptors.request.use((config) => {
        const token = localStorage.getItem('authToken');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });

    api.interceptors.response.use(
        (response) => response.data,
        async (error) => {
            if (error.response?.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = '/auth';
            }
            return Promise.reject(error);
        }
    );
});
