import { useEffect, useRef } from 'react';
import { pythonAPI } from '../services/api';
import useNotificationStore from '../store/notificationStore';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * useNewsPoller — polls /api/knowledge/news every 5 minutes.
 * When new articles appear (not in previous snapshot), fires a notification.
 */
export function useNewsPoller() {
    const addNotif = useNotificationStore(s => s.addNewsNotification);
    const seenTitles = useRef(new Set());
    const firstLoad = useRef(true);

    const poll = async () => {
        try {
            const data = await pythonAPI.get('/api/knowledge/news');
            const articles = Array.isArray(data.articles || data) ? (data.articles || data) : [];

            articles.forEach(article => {
                const key = article.title;
                if (!key) return;

                if (firstLoad.current) {
                    // On first load, just mark them as seen but don't notify
                    seenTitles.current.add(key);
                } else if (!seenTitles.current.has(key)) {
                    // New article found — fire notification
                    seenTitles.current.add(key);
                    addNotif(article);
                }
            });

            firstLoad.current = false;
        } catch {
            // Silently fail polling — don't disrupt the app
        }
    };

    useEffect(() => {
        // First poll on mount
        poll();

        // Poll every 5 minutes
        const timer = setInterval(poll, POLL_INTERVAL_MS);
        return () => clearInterval(timer);
    }, []);
}
