import { create } from 'zustand';
import { pythonAPI } from '../services/api';

const useAuthStore = create((set) => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('authToken') || null,
    loading: false,
    error: null,

    login: async (email, password) => {
        set({ loading: true, error: null });
        try {
            const data = await pythonAPI.post('/api/auth/login', { email, password });
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            set({ user: data.user, token: data.token, loading: false });
            return true;
        } catch (err) {
            set({ error: err.response?.data?.detail || 'Login failed', loading: false });
            return false;
        }
    },

    register: async (name, email, password) => {
        set({ loading: true, error: null });
        try {
            const data = await pythonAPI.post('/api/auth/register', { name, email, password });
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            set({ user: data.user, token: data.token, loading: false });
            return true;
        } catch (err) {
            set({ error: err.response?.data?.detail || 'Registration failed', loading: false });
            return false;
        }
    },

    logout: () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        set({ user: null, token: null });
        window.location.href = '/auth';
    },

    clearError: () => set({ error: null }),
}));

export default useAuthStore;
