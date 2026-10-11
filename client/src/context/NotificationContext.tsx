import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/client';
import { API_BASE_URL } from '../utils/apiConfig';
import { useAuth } from './AuthContext';
import { SystemNotification } from '../types';

interface NotificationContextType {
  notifications: SystemNotification[];
  unreadCount: number;
  isConnected: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  triggerTestNotification: () => Promise<void>;
  refresh: () => Promise<void>;
  latestLiveAlert: SystemNotification | null;
  dismissLiveAlert: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Web Audio API synthesized gentle chime (no external audio assets required)
const playChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Ignore audio autoplay restrictions
  }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [latestLiveAlert, setLatestLiveAlert] = useState<SystemNotification | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('coloai_notif_sound') !== 'disabled';
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('coloai_notif_sound', next ? 'enabled' : 'disabled');
      return next;
    });
  };

  const dismissLiveAlert = () => {
    setLatestLiveAlert(null);
  };

  // Fetch notifications via REST API
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/notifications');
      if (res.data?.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('[NotificationContext] Failed to fetch notifications:', err);
    }
  }, [token]);

  // Connect to live SSE stream
  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      setIsConnected(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    // Initial fetch
    fetchNotifications();

    let isCancelled = false;

    const connectSSE = () => {
      if (isCancelled) return;

      // Clean up existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Build target stream URL
      let base = API_BASE_URL;
      if (
        typeof window !== 'undefined' &&
        (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('vercel'))
      ) {
        base = 'https://coloai-backend.onrender.com/api';
      }
      const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
      const streamUrl = `${cleanBase}/notifications/stream?token=${encodeURIComponent(token)}`;

      try {
        const es = new EventSource(streamUrl);
        eventSourceRef.current = es;

        es.onopen = () => {
          if (!isCancelled) {
            setIsConnected(true);
            console.log('[NotificationContext] Live Sync SSE stream connected.');
          }
        };

        es.addEventListener('connected', () => {
          if (!isCancelled) {
            setIsConnected(true);
          }
        });

        es.addEventListener('notification', (event) => {
          try {
            const newNotif: SystemNotification = JSON.parse(event.data);
            if (!newNotif || !newNotif._id) return;

            setNotifications((prev) => {
              if (prev.some((n) => n._id === newNotif._id)) {
                return prev;
              }
              return [newNotif, ...prev];
            });

            setUnreadCount((prev) => prev + 1);

            // Pop toast alert
            setLatestLiveAlert(newNotif);
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = setTimeout(() => {
              setLatestLiveAlert(null);
            }, 6000);

            // Play audio chime if enabled
            if (soundEnabled) {
              playChime();
            }
          } catch (e) {
            console.warn('[NotificationContext] Error parsing incoming notification:', e);
          }
        });

        es.onerror = () => {
          if (!isCancelled) {
            setIsConnected(false);
            es.close();
            // Retry after 5 seconds
            reconnectTimeoutRef.current = setTimeout(connectSSE, 5000);
          }
        };
      } catch (err) {
        console.warn('[NotificationContext] SSE initialization error:', err);
        setIsConnected(false);
      }
    };

    connectSSE();

    // Secondary fallback polling (every 30s) to guarantee state accuracy
    const pollingInterval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => {
      isCancelled = true;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      clearInterval(pollingInterval);
    };
  }, [token, user?.role, fetchNotifications, soundEnabled]);

  // Actions
  const markAsRead = async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.warn('[NotificationContext] Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      await api.patch('/notifications/read-all');
    } catch (err) {
      console.warn('[NotificationContext] Failed to mark all as read:', err);
    }
  };

  const clearNotification = async (id: string) => {
    try {
      const target = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (target && !target.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      await api.delete(`/notifications/${id}`);
    } catch (err) {
      console.warn('[NotificationContext] Failed to delete notification:', err);
    }
  };

  const clearAll = async () => {
    try {
      setNotifications([]);
      setUnreadCount(0);
      await api.delete('/notifications/clear-all');
    } catch (err) {
      console.warn('[NotificationContext] Failed to clear all notifications:', err);
    }
  };

  const triggerTestNotification = async () => {
    try {
      const res = await api.post('/notifications/test');
      if (res.data?.success && res.data.notification) {
        // If SSE hasn't updated it yet, add directly
        const n = res.data.notification;
        setNotifications((prev) => {
          if (prev.some((item) => item._id === n._id)) return prev;
          return [n, ...prev];
        });
        setUnreadCount((prev) => prev + 1);
        setLatestLiveAlert(n);
        if (soundEnabled) playChime();
      }
    } catch (err) {
      console.warn('[NotificationContext] Failed to trigger test notification:', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        isOpen,
        setIsOpen,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
        triggerTestNotification,
        refresh: fetchNotifications,
        latestLiveAlert,
        dismissLiveAlert,
        soundEnabled,
        toggleSound,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
