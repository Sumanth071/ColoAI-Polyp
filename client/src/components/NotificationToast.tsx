import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink, Activity, Stethoscope, FolderOpen, FileText, Sparkles, Info } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { NotificationType } from '../types';

export const NotificationToast: React.FC = () => {
  const { latestLiveAlert, dismissLiveAlert, markAsRead } = useNotifications();
  const navigate = useNavigate();

  if (!latestLiveAlert) return null;

  const handleAction = () => {
    markAsRead(latestLiveAlert._id);
    if (latestLiveAlert.link) {
      navigate(latestLiveAlert.link);
    }
    dismissLiveAlert();
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

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-white/95 dark:bg-[#0c173b]/95 backdrop-blur-md border border-slate-200 dark:border-blue-900/60 rounded-2xl shadow-2xl p-3.5 flex items-start gap-3 relative overflow-hidden">
        {/* Left Glow Stripe */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-500 to-cyan-400" />

        {/* Icon */}
        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 shrink-0 mt-0.5">
          {getNotificationIcon(latestLiveAlert.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Live Sync
            </span>
            <span className="text-[10px] text-slate-400">Just now</span>
          </div>

          <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
            {latestLiveAlert.title}
          </h5>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2 mt-0.5">
            {latestLiveAlert.message}
          </p>

          {latestLiveAlert.link && (
            <button
              type="button"
              onClick={handleAction}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-cyan-400 hover:underline"
            >
              <span>View details</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={dismissLiveAlert}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
