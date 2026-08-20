import { create } from 'zustand';

const useRoadmapStore = create((set) => ({
    roadmap: null,
    weeklyPlan: [],
    progress: 0,
    loading: false,

    setRoadmap: (roadmap) => set({ roadmap }),
    setWeeklyPlan: (plan) => set({ weeklyPlan: plan }),
    setProgress: (progress) => set({ progress }),
    setLoading: (loading) => set({ loading }),
    clear: () => set({ roadmap: null, weeklyPlan: [], progress: 0 }),
}));

export default useRoadmapStore;
