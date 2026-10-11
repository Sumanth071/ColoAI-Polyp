import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { NotificationDropdown } from './NotificationDropdown';
import {
  LogOut,
  Bell,
  Sparkles,
  ChevronDown,
  Shield,
  FlaskConical,
  Stethoscope,
  Sun,
  Moon,
  Menu,
} from 'lucide-react';
import { UserRole } from '../types';

interface NavbarProps {
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar }) => {
  const { user, logout, quickDemoLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount, isConnected, isOpen: notifOpen, setIsOpen: setNotifOpen } = useNotifications();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const handleRoleSwitch = async (targetRole: UserRole) => {
    setRoleDropdownOpen(false);
    await quickDemoLogin(targetRole);
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#070f26]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs transition-colors duration-200">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          aria-label="Toggle Navigation Menu"
          className="md:hidden p-2 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="w-7 h-7 rounded-full object-cover sm:hidden shadow-xs" />
          <span className="hidden sm:inline-block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Clinical Decision Support System • AI Diagnostic Platform
          </span>
          <span className="sm:hidden text-xs font-bold text-slate-800 dark:text-white">
            Polyp<span className="text-cyan-500">AI</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Light / Dark Mode Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle Theme"
          className="flex items-center justify-center p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-750 transition-all duration-200"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform duration-300" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600 hover:-rotate-12 transition-transform duration-300" />
          )}
        </button>

        {/* Quick Demo Switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-200 transition-all border border-slate-200 dark:border-slate-700"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden md:inline text-slate-500 dark:text-slate-400">Role:</span>
            <span className="font-bold text-slate-900 dark:text-white">{user?.role || 'Guest'}</span>
            <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#0d1838] border border-slate-200 dark:border-slate-800 shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Instant Demo Role Switch
              </div>
              <button
                type="button"
                onClick={() => handleRoleSwitch('Admin')}
                className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2.5 font-medium">
                  <Shield className="w-4 h-4 text-rose-500" /> Administrator
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-semibold border border-rose-200 dark:border-rose-900">Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleSwitch('Researcher')}
                className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2.5 font-medium">
                  <FlaskConical className="w-4 h-4 text-blue-600 dark:text-blue-400" /> AI Researcher
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-900">Researcher</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleSwitch('Clinician')}
                className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2.5 font-medium">
                  <Stethoscope className="w-4 h-4 text-amber-500 dark:text-amber-400" /> Medical Reviewer
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-900">Clinician</span>
              </button>
            </div>
          )}
        </div>

        {/* Interactive Notification Bell with Badge & Live Sync indicator */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen(!notifOpen)}
            title={`Notifications (${unreadCount} unread) - ${isConnected ? 'Live Sync Active' : 'Connecting...'}`}
            aria-label="Notifications"
            className={`p-2 rounded-xl transition-all relative ${
              notifOpen
                ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-cyan-400 border border-blue-200 dark:border-blue-900/80'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'
            }`}
          >
            <Bell className="w-4 h-4" />

            {/* Unread Pill Badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex items-center justify-center rounded-full h-4 min-w-4 px-1 text-[9px] font-black bg-rose-600 text-white shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </span>
            )}

            {/* Subtle Live Sync Pulse Dot when no unread notifications */}
            {unreadCount === 0 && isConnected && (
              <span
                title="Live Sync Active"
                className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#070f26]"
              />
            )}
          </button>

          {/* Real-time Notification Dropdown */}
          {notifOpen && <NotificationDropdown onClose={() => setNotifOpen(false)} />}
        </div>

        <button
          type="button"
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
