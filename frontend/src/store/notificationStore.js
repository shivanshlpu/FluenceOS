import { create } from 'zustand';

/**
 * Global notification store.
 * Notifications are generated when new news articles arrive.
 * Each notification: { id, title, body, time, read, type }
 */
const useNotificationStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,

    addNewsNotification: (article) => {
        const existing = get().notifications.find(n => n.title === article.title);
        if (existing) return; // deduplicate
        const notif = {
            id: `${Date.now()}-${Math.random()}`,
            title: article.title,
            body: article.category ? `[${article.category}] ${article.summary?.slice(0, 80) || ''}...` : article.summary?.slice(0, 90) || '',
            time: new Date().toISOString(),
            read: false,
            type: 'news',
            url: article.url,
        };
        set(state => ({
            notifications: [notif, ...state.notifications].slice(0, 50),
            unreadCount: state.unreadCount + 1,
        }));
    },

    markAllRead: () => set(state => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
    })),

    markRead: (id) => set(state => {
        const updated = state.notifications.map(n => n.id === id ? { ...n, read: true } : n);
        return { notifications: updated, unreadCount: updated.filter(n => !n.read).length };
    }),

    clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));

export default useNotificationStore;
