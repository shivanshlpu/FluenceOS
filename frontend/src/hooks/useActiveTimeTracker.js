import { useEffect, useState, useRef } from 'react';
import { pythonAPI } from '../services/api';

const IDLE_TIMEOUT_SECONDS = 180; // 3 minutes without interaction -> pause timer
const HEARTBEAT_INTERVAL_SECONDS = 30; // Sync to server every 30s

export function getTodayDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function formatTimeHoursMinsSecs(totalSeconds) {
    const sec = Math.max(0, Math.floor(totalSeconds || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;

    if (h > 0) {
        return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    }
    return `${m}m ${String(s).padStart(2, '0')}s`;
}

export function formatTimeCompact(totalSeconds) {
    const sec = Math.max(0, Math.floor(totalSeconds || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);

    if (h > 0) {
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${Math.max(1, m)}m`;
}

export function useActiveTimeTracker() {
    const todayKey = `fluence_active_sec_${getTodayDateString()}`;
    
    // Initial read from local storage
    const getStoredSeconds = () => {
        try {
            const raw = localStorage.getItem(todayKey);
            return raw ? parseInt(raw, 10) : 0;
        } catch {
            return 0;
        }
    };

    const [todaySeconds, setTodaySeconds] = useState(getStoredSeconds);
    const [isIdle, setIsIdle] = useState(false);
    const [isTracking, setIsTracking] = useState(true);

    const secondsRef = useRef(todaySeconds);
    const lastSyncSecRef = useRef(todaySeconds);
    const lastActivityTimeRef = useRef(Date.now());
    const isVisibleRef = useRef(!document.hidden);

    // Keep ref in sync
    useEffect(() => {
        secondsRef.current = todaySeconds;
    }, [todaySeconds]);

    // Send heartbeat to backend
    const syncHeartbeat = async (forcedDelta = null) => {
        const currentTotal = secondsRef.current;
        const delta = forcedDelta !== null ? forcedDelta : (currentTotal - lastSyncSecRef.current);
        if (delta <= 0) return;

        try {
            await pythonAPI.post('/api/tracker/heartbeat', {
                durationSeconds: delta,
                date: getTodayDateString(),
                activityType: 'active_usage'
            });
            lastSyncSecRef.current = currentTotal;
        } catch (e) {
            // Quietly fallback
        }
    };

    useEffect(() => {
        // User activity listeners to reset idle timer
        const handleUserActivity = () => {
            lastActivityTimeRef.current = Date.now();
            if (isIdle) setIsIdle(false);
        };

        const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
        activityEvents.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }));

        const handleVisibilityChange = () => {
            const visible = document.visibilityState === 'visible';
            isVisibleRef.current = visible;
            if (!visible) {
                // Sync accumulated seconds on tab switch or minimize
                syncHeartbeat();
            } else {
                lastActivityTimeRef.current = Date.now();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 1-second continuous live ticker
        const intervalId = setInterval(() => {
            const now = Date.now();
            const timeSinceActivity = (now - lastActivityTimeRef.current) / 1000;
            const userActive = timeSinceActivity < IDLE_TIMEOUT_SECONDS && isVisibleRef.current;

            if (userActive) {
                setTodaySeconds(prev => {
                    const next = prev + 1;
                    try {
                        localStorage.setItem(todayKey, next.toString());
                    } catch {}
                    
                    // Dispatch global event for live widget updates
                    window.dispatchEvent(new CustomEvent('fluence_active_time_tick', {
                        detail: { todaySeconds: next, formatted: formatTimeHoursMinsSecs(next) }
                    }));

                    return next;
                });
                setIsIdle(false);
                setIsTracking(true);
            } else {
                setIsIdle(true);
                setIsTracking(false);
            }
        }, 1000);

        // 30-second periodic heartbeat sync
        const heartbeatIntervalId = setInterval(() => {
            if (isVisibleRef.current) {
                syncHeartbeat();
            }
        }, HEARTBEAT_INTERVAL_SECONDS * 1000);

        // Cleanup and sync on unmount / window close
        const handleBeforeUnload = () => {
            syncHeartbeat();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            clearInterval(intervalId);
            clearInterval(heartbeatIntervalId);
            activityEvents.forEach(evt => window.removeEventListener(evt, handleUserActivity));
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            syncHeartbeat();
        };
    }, []);

    return {
        todaySeconds,
        todayMinutes: Math.floor(todaySeconds / 60),
        formattedTime: formatTimeHoursMinsSecs(todaySeconds),
        formattedCompact: formatTimeCompact(todaySeconds),
        isIdle,
        isTracking
    };
}
