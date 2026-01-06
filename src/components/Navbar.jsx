import React, { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FiActivity,
  FiBell,
  FiBarChart2,
  FiBox,
  FiBriefcase,
  FiCpu,
  FiGrid,
  FiImage,
  FiLayers,
  FiKey,
  FiSettings,
  FiLock,
  FiShield,
  FiShoppingBag,
  FiSliders,
  FiTool,
  FiTrendingUp,
  FiZap,
  FiLogOut,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../theme/ThemeContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import NotificationsDrawer from './NotificationsDrawer.jsx';
import TenantSwitcher from './TenantSwitcher.jsx';
import ThemeSelector from './ThemeSelector.jsx';
import LivePresenceBar from './LivePresenceBar.jsx';
import { useTenant } from '../context/TenantContext.jsx';
import { canManage, canView } from '../lib/permissions.js';
import { getBooleanEnv } from '../lib/env.js';
import { ASSETS } from '../config/assets.js';

const navLinkBase =
  'flex items-center gap-2 rounded-full px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

export default function Navbar() {
  const { role, signOut } = useAuth();
  const { activeMembership, brand } = useTenant();
  const membershipRole = activeMembership?.role ?? role ?? 'viewer';
  const { cycleTheme, themeKey } = useTheme();
  const location = useLocation();
  const currentPath = location.pathname === '/' ? '/dashboard' : location.pathname;
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications } = useNotifications();
  const unreadCount = notifications.filter((item) => !item.read).length;
  const biReportsEnabled = useMemo(() => getBooleanEnv('VITE_BI_REPORTS_ENABLED', true), []);

  const navItems = useMemo(() => {
    const base = [
      { to: '/projects', icon: <FiLayers />, label: 'Projects', section: 'projects' },
      { to: '/hustles', icon: <FiBriefcase />, label: 'My Hustles', section: 'projects' },
      { to: '/finance', icon: <FiBriefcase />, label: 'Finance', section: 'finance' },
      { to: '/crm', icon: <FiGrid />, label: 'CRM', section: 'crm', matches: ['/crm'] },
      { to: '/marketing/lab', icon: <FiTrendingUp />, label: 'Marketing', section: 'marketing', matches: ['/marketing'] },
      { to: '/marketing/scheduler', icon: <FiTool />, label: 'Scheduler', section: 'marketing', matches: ['/marketing/scheduler'] },
      { to: '/analytics', icon: <FiActivity />, label: 'Analytics', section: 'analytics' },
      { to: '/analytics/cloud', icon: <FiActivity />, label: 'Analytics Cloud', section: 'analytics' },
      { to: '/analytics/forecasts', icon: <FiActivity />, label: 'Forecasts', section: 'analytics' },
      { to: '/insights', icon: <FiActivity />, label: 'Insights', section: 'analytics' },
      { to: '/ai-hub', icon: <FiZap />, label: 'AI Hub', matches: ['/ai/', '/ai-hub'], section: 'ai' },
      { to: '/ai/orchestrator', icon: <FiSliders />, label: 'Orchestrator', section: 'ai' },
      { to: '/ai/growth-coach', icon: <FiCpu />, label: 'Growth Coach', section: 'ai' },
      { to: '/dashboard', icon: <FiBarChart2 />, label: 'Dashboard', section: 'dashboard' },
      { to: '/inventory', icon: <FiBox />, label: 'Inventory', section: 'inventory' },
      { to: '/till', icon: <FiShoppingBag />, label: 'Till', section: 'till' },
      { to: '/tools', icon: <FiTool />, label: 'Tools', section: 'tools' },
      { to: '/reports', icon: <FiBarChart2 />, label: 'Reports', section: 'reports' },
      { to: '/visuals', icon: <FiImage />, label: 'Visuals', section: 'visuals' },
      { to: '/monitor', icon: <FiActivity />, label: 'Monitor', section: 'monitor' },
      { to: '/marketplace', icon: <FiLayers />, label: 'Marketplace', section: 'marketplace' },
      { to: '/app-store', icon: <FiLayers />, label: 'App Store', section: 'marketplace' },
      { to: '/affiliates', icon: <FiTrendingUp />, label: 'Affiliates', section: 'affiliates' },
      { to: '/partners', icon: <FiBriefcase />, label: 'Partners', section: 'partners', matches: ['/partners'] },
      { to: '/settings', icon: <FiSettings />, label: 'Settings', section: 'settings' },
    ];

    if (canManage(membershipRole)) {
      base.splice(1, 0, { to: '/admin', icon: <FiShield />, label: 'Admin', section: 'admin' });
      base.splice(2, 0, { to: '/admin/branding', icon: <FiShield />, label: 'Branding', section: 'branding' });
      base.splice(3, 0, { to: '/admin/api-keys', icon: <FiKey />, label: 'API Keys', section: 'api' });
      base.splice(4, 0, { to: '/admin/security', icon: <FiLock />, label: 'Security', section: 'security' });
      if (biReportsEnabled) {
        base.splice(5, 0, {
          to: '/admin/bi-reports',
          icon: <FiTrendingUp />,
          label: 'BI Reports',
          section: 'analytics',
        });
      }
    } else if (canView(membershipRole, 'admin')) {
      base.splice(1, 0, { to: '/admin', icon: <FiShield />, label: 'Admin', section: 'admin' });
    }

    return base.filter((item) => canView(membershipRole, item.section ?? 'general'));
  }, [biReportsEnabled, membershipRole]);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-[#1a1a1a]/95 via-[#16131f]/95 to-[#0d0d0d]/95 shadow-[0_10px_40px_rgba(12,10,30,0.6)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-5 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35em] text-white/60 transition hover:border-white/30 sm:hidden"
          >
            {collapsed ? 'Show Nav' : 'Hide Nav'}
          </button>
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            className="sm:hidden flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35em] text-white/60 transition hover:border-white/30"
            aria-label="Open notifications"
          >
            <FiBell className="text-base" />
            Alerts
            {unreadCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[11px] font-semibold text-white shadow-[0_0_10px_rgba(99,102,241,0.45)]">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={signOut}
            className="sm:hidden flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35em] text-red-400/80 transition hover:border-red-400/50 hover:bg-red-500/10"
            aria-label="Log out"
          >
            <FiLogOut className="text-base" />
          </button>
          <div className="flex flex-1 items-center justify-center gap-3">
            <TenantSwitcher />
            <span className="flex items-center gap-3">
              <img
                src={brand?.logo || ASSETS.logoMain}
                alt={`${brand?.name || 'Hustle Studio'} logo`}
                className="hidden h-8 w-auto rounded-full border border-white/10 bg-white/10 object-contain p-1 sm:block"
              />
              <span className="page-heading text-lg font-semibold tracking-[0.3em] text-white/90 sm:text-xl">
                {brand?.name || 'Hustle Studio OS'}
              </span>
            </span>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              className="relative flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35em] text-white/60 transition hover:border-white/30"
              aria-label="Open notifications"
            >
              <FiBell className="text-base" />
              Alerts
              {unreadCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[11px] font-semibold text-white shadow-[0_0_10px_rgba(99,102,241,0.45)]">
                  {unreadCount}
                </span>
              )}
            </button>
            <ThemeSelector />
            <button
              type="button"
              onClick={signOut}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35em] text-white/60 transition hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-400"
              aria-label="Log out"
            >
              <FiLogOut className="text-base" />
              Log Out
            </button>
          </div>
        </div>

        <div
          className={`grid gap-2 overflow-hidden transition-[max-height,opacity] duration-300 ${
            collapsed ? 'max-h-0 opacity-0 sm:max-h-96 sm:opacity-100' : 'max-h-96 opacity-100'
          }`}
        >
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => {
                  const extraMatches = item.matches ?? [];
                  const isMatch =
                    isActive ||
                    currentPath.startsWith(item.to) ||
                    extraMatches.some((match) => currentPath.startsWith(match));
                  return `${navLinkBase} ${
                    isMatch
                      ? 'bg-indigo-500/30 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)]'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`;
                }}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
        <LivePresenceBar />
      </div>
      </nav>
      <NotificationsDrawer open={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
}
