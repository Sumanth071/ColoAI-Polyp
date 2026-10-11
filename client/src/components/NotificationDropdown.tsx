import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Sparkles,
  CheckCheck,
  Trash2,
  Stethoscope,
  FileText,
  Activity,
  AlertCircle,
  Info,
  ExternalLink,
  Volume2,
  VolumeX,
  Radio,
  Check,
  X,
  FolderOpen,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { SystemNotification, NotificationType } from '../types';

interface NotificationDropdownProps {
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    triggerTestNotification,
    soundEnabled,
    toggleSound,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [isSimulating, setIsSimulating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'unread') return !item.read;
    return true;
  });

  const handleSimulate = async () => {
    setIsSimulating(true);
    await triggerTestNotification();
    setTimeout(() => setIsSimulating(false), 500);
  };

  const handleItemClick = (notification: SystemNotification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
    if (notification.link) {
      navigate(notification.link);
      onClose();
    }
  };

  const formatRelativeTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSec < 45) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'ANALYSIS':
        return <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
      case 'REVIEW':
        return <Stethoscope className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'CASE':
        return <FolderOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'REPORT':
        return <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'MODEL':
        return <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />;
      case 'SYSTEM':
      default:
        return <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getTypeBadgeStyle = (type: NotificationType) => {
    switch (type) {
      case 'ANALYSIS':
        return 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
      case 'REVIEW':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'CASE':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'REPORT':
        return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'MODEL':
        return 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800';
      case 'SYSTEM':
      default:
        return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  };

  const getBorderAccent = (type: NotificationType, severity: string) => {
    if (severity === 'warning') return 'border-l-amber-500';
    if (severity === 'error') return 'border-l-rose-500';
    switch (type) {
      case 'ANALYSIS':
        return 'border-l-cyan-500';
      case 'REVIEW':
        return 'border-l-amber-500';
      case 'CASE':
        return 'border-l-emerald-500';
      case 'REPORT':
        return 'border-l-indigo-500';
      default:
        return 'border-l-blue-500';
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-[#0b1533] border border-slate-200 dark:border-slate-800/90 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
      style={{ filter: 'drop-shadow(0 20px 25px rgba(0, 0, 0, 0.18))' }}
    >
      {/* Top Header */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0e1b40]/80 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="relative p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white leading-none">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Live Sync Status Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                isConnected
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
              title={isConnected ? 'Live sync stream active (SSE)' : 'Reconnecting live stream...'}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
                }`}
              />
              <span className="hidden sm:inline">{isConnected ? 'Live Sync' : 'Connecting'}</span>
            </div>

            {/* Sound toggle */}
            <button
              type="button"
              onClick={toggleSound}
              title={soundEnabled ? 'Mute notification sound' : 'Enable notification sound'}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab & Simulation Quickbar */}
        <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800/80 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                activeTab === 'unread'
                  ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                title="Mark all as read"
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors"
              >
                <CheckCheck className="w-3 h-3" />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSimulate}
              disabled={isSimulating}
              title="Trigger simulated live event to verify live sync"
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:opacity-90 active:scale-95 transition-all shadow-xs disabled:opacity-50"
            >
              <Radio className={`w-3 h-3 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>Test Sync</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Scroll Area */}
      <div className="max-h-80 sm:max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
        {filteredNotifications.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <Check className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-[220px] mx-auto">
              Real-time diagnosis, clinical reviews, and PDF reports will synchronize automatically here.
            </p>
            <button
              type="button"
              onClick={handleSimulate}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
            >
              <Sparkles className="w-3 h-3" /> Simulate Live Alert
            </button>
          </div>
        ) : (
          filteredNotifications.map((item) => (
            <div
              key={item._id}
              onClick={() => handleItemClick(item)}
              className={`p-3 transition-colors border-l-4 cursor-pointer group flex items-start gap-3 relative ${
                getBorderAccent(item.type, item.severity)
              } ${
                item.read
                  ? 'bg-white dark:bg-[#0b1533] hover:bg-slate-50 dark:hover:bg-[#0f1d47]'
                  : 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/40'
              }`}
            >
              {/* Type Icon Badge */}
              <div
                className={`p-2 rounded-xl border shrink-0 transition-transform group-hover:scale-105 ${getTypeBadgeStyle(
                  item.type
                )}`}
              >
                {getNotificationIcon(item.type)}
              </div>

              {/* Notification Content */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h4
                    className={`text-xs font-bold truncate ${
                      item.read
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-900 dark:text-white font-extrabold'
                    }`}
                  >
                    {item.title}
                  </h4>
                  {!item.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-cyan-400 shrink-0" />
                  )}
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                  {item.message}
                </p>

                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                  <span>{formatRelativeTime(item.createdAt)}</span>
                  {item.link && (
                    <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-cyan-400 font-semibold group-hover:underline">
                      View details <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
              </div>

              {/* Item Hover Quick Actions */}
              <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!item.read && (
                  <button
                    type="button"
                    title="Mark as read"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(item._id);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  title="Remove notification"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearNotification(item._id);
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Footer */}
      {notifications.length > 0 && (
        <div className="p-2.5 px-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0e1b40]/80 flex items-center justify-between text-[11px]">
          <button
            type="button"
            onClick={clearAll}
            className="text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-semibold transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Clear all
          </button>

          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            Auto-synced with ColoAI Engine
          </span>
        </div>
      )}
    </div>
  );
};
