import { useState, useEffect, useRef, useCallback } from 'react';

export const useWebSocket = (url) => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const wsRef = useRef(null);

    useEffect(() => {
        if (!url) return;

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => setIsConnected(true);
        ws.onclose = () => setIsConnected(false);
        ws.onmessage = (event) => {
            try {
                setLastMessage(JSON.parse(event.data));
            } catch {
                setLastMessage(event.data);
            }
        };

        return () => ws.close();
    }, [url]);

    const sendMessage = useCallback((data) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
        }
    }, []);

    return { isConnected, lastMessage, sendMessage };
};
