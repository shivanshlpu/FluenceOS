import { create } from 'zustand';

const useMarketStore = create((set) => ({
    marketData: null,
    loading: false,
    error: null,

    setMarketData: (data) => set({ marketData: data }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    clear: () => set({ marketData: null, error: null }),
}));

export default useMarketStore;
