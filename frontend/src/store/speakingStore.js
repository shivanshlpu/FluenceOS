import { create } from 'zustand';

const useSpeakingStore = create((set) => ({
    sessions: [],
    stats: null,
    currentEvaluation: null,
    loading: false,

    setSessions: (sessions) => set({ sessions }),
    setStats: (stats) => set({ stats }),
    setCurrentEvaluation: (evaluation) => set({ currentEvaluation: evaluation }),
    setLoading: (loading) => set({ loading }),
    addSession: (session) => set((s) => ({ sessions: [session, ...s.sessions] })),
}));

export default useSpeakingStore;
