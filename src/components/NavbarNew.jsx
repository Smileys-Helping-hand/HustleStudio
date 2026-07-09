import React, { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FiChevronDown,
  FiBell,
  FiSettings,
  FiLogOut,
  FiBarChart2,
  FiBriefcase,
  FiShoppingBag,
  FiBox,
  FiZap,
  FiMessageSquare,
  FiShield,
  FiTrendingUp,
  FiGrid,
  FiTool,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import NotificationsDrawer from './NotificationsDrawer.jsx';
import TenantSwitcher from './TenantSwitcher.jsx';
import ThemeSelector from './ThemeSelector.jsx';
import { useTenant } from '../context/TenantContext.jsx';
import { canManage } from '../lib/permissions.js';
import { ASSETS } from '../config/assets.js';

const NavbarNew = () => {
  const { role, signOut } = useAuth();
  const { activeMembership, brand } = useTenant();
  const membershipRole = activeMembership?.role ?? role ?? 'viewer';
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [expandedSection, setExpandedSection] = useState('core');
  const { notifications } = useNotifications();
  const unreadCount = notifications.filter((item) => !item.read).length;

  const isActive = (path, extraMatches = []) => {
    return location.pathname.startsWith(path) || extraMatches.some((m) => location.pathname.startsWith(m));
  };

  const navSections = useMemo(
    () => ({
      core: {
        label: '📊 Core Business',
        icon: <FiBriefcase />,
        items: [
          { to: '/dashboard', label: 'Dashboard', icon: <FiBarChart2 /> },
          { to: '/projects', label: 'Projects', icon: <FiBriefcase /> },
          { to: '/hustles', label: 'My Hustles', icon: <FiBriefcase /> },
          { to: '/crm', label: 'CRM', icon: <FiGrid /> },
          {
            to: '/crm/business-documents',
            label: 'Invoices & Quotes',
            icon: <FiShoppingBag />,
            extraMatches: ['/crm/invoices', '/crm/quotes'],
          },
        ],
      },
      operations: {
        label: '⚙️ Operations',
        icon: <FiBox />,
        items: [
          { to: '/inventory', label: 'Inventory', icon: <FiBox /> },
          { to: '/till', label: 'Point of Sale', icon: <FiShoppingBag /> },
          { to: '/finance', label: 'Finance', icon: <FiBriefcase /> },
          { to: '/messaging', label: 'Messaging', icon: <FiMessageSquare /> },
        ],
      },
      intelligence: {
        label: '🧠 Intelligence',
        icon: <FiZap />,
        items: [
          { to: '/ai-hub', label: 'AI Hub', icon: <FiZap />, extraMatches: ['/ai/'] },
          { to: '/analytics', label: 'Analytics', icon: <FiBarChart2 /> },
          { to: '/insights', label: 'Insights', icon: <FiBarChart2 /> },
          { to: '/reports', label: 'Reports', icon: <FiBarChart2 /> },
          { to: '/tools', label: 'Tools', icon: <FiTool /> },
        ],
      },
      marketing: {
        label: '📈 Growth',
        icon: <FiTrendingUp />,
        items: [
          { to: '/marketing/lab', label: 'Marketing Lab', icon: <FiTrendingUp /> },
          { to: '/marketing/scheduler', label: 'Scheduler', icon: <FiTool /> },
          { to: '/affiliates', label: 'Affiliates', icon: <FiTrendingUp /> },
          { to: '/partners', label: 'Partners', icon: <FiBriefcase /> },
        ],
      },
      ...(canManage(membershipRole) && {
        admin: {
          label: '🔐 Administration',
          icon: <FiShield />,
          items: [
            { to: '/admin', label: 'Admin Panel', icon: <FiShield /> },
            { to: '/admin/branding', label: 'Branding', icon: <FiShield /> },
            { to: '/admin/security', label: 'Security', icon: <FiShield /> },
          ],
        },
      }),
      settings: {
        label: '⚙️ Settings',
        icon: <FiSettings />,
        items: [
          { to: '/settings', label: 'Settings', icon: <FiSettings /> },
        ],
      },
    }),
    [membershipRole]
  );

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-[#1a1a1a]/95 via-[#16131f]/95 to-[#0d0d0d]/95 shadow-[0_10px_40px_rgba(12,10,30,0.6)] backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 sm:px-8">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex flex-1 items-center justify-center gap-3">
              <TenantSwitcher />
              <span className="page-heading hidden sm:flex items-center gap-2 text-lg font-semibold tracking-[0.3em] text-white/90">
                <img
                  src={brand?.logo || ASSETS.logoMain}
                  alt="Logo"
                  className="h-8 w-8 rounded-full border border-white/10 bg-white/10 object-contain p-1"
                />
                {brand?.name || 'Hustle Studio OS'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowNotifications(true)}
                className="relative flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35em] text-white/60 transition hover:border-white/30"
              >
                <FiBell className="text-base" />
                {unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(99,102,241,0.45)]">
                    {unreadCount}
                  </span>
                )}
              </button>
              <ThemeSelector />
              <button
                type="button"
                onClick={signOut}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35em] text-white/60 transition hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-400"
              >
                <FiLogOut /> Logout
              </button>
            </div>
          </div>

          {/* Navigation Sections */}
          <div className="flex flex-wrap gap-1">
            {Object.entries(navSections).map(([key, section]) => (
              <div key={key} className="relative group">
                <button
                  onClick={() => setExpandedSection(expandedSection === key ? '' : key)}
                  className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-indigo-400/60 hover:bg-indigo-500/10 hover:text-white"
                >
                  <span>{section.label}</span>
                  <FiChevronDown
                    size={14}
                    className={`transition-transform ${expandedSection === key ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown */}
                <div className="absolute left-0 top-full mt-1 min-w-max rounded-lg border border-white/10 bg-[#1a1a1a]/95 shadow-xl backdrop-blur opacity-0 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:pointer-events-auto">
                  <div className="space-y-1 p-2">
                    {section.items.map((item) => {
                      const active = isActive(item.to, item.extraMatches);
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                            active
                              ? 'bg-indigo-500/30 text-white'
                              : 'text-white/70 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className="text-base">{item.icon}</span>
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </nav>

      <NotificationsDrawer open={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
};

export default NavbarNew;
