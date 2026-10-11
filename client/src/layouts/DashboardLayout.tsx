import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { NotificationToast } from '../components/NotificationToast';

export const DashboardLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  // Automatically close mobile sidebar on route navigation
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-[#f8fafc] dark:bg-[#070f26] text-slate-800 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      <NotificationToast />
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-8 bg-[#f8fafc] dark:bg-[#070f26] transition-colors duration-200">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
