import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { FiBarChart2, FiBox, FiSettings, FiImage, FiShield, FiShoppingBag, FiTool } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { role } = useAuth();

  const navItems = useMemo(() => {
    const base = [
      { to: '/dashboard', icon: <FiBarChart2 />, label: 'Dashboard' },
      { to: '/inventory', icon: <FiBox />, label: 'Inventory' },
      { to: '/till', icon: <FiShoppingBag />, label: 'Till' },
      { to: '/tools', icon: <FiTool />, label: 'Tools' },
      { to: '/reports', icon: <FiBarChart2 />, label: 'Reports' },
      { to: '/visuals', icon: <FiImage />, label: 'Visuals' },
      { to: '/settings', icon: <FiSettings />, label: 'Settings' },
    ];

    if (role === 'admin') {
      base.splice(1, 0, { to: '/admin', icon: <FiShield />, label: 'Admin' });
    }

    return base;
  }, [role]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/30 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white tracking-wide">Hustle Studio</h1>
        <div className="flex gap-5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1 rounded-md transition ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-indigo-500/30'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
