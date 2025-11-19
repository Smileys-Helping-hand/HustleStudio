import { Fragment } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../theme/ThemeContext.jsx';
import { ASSETS } from '@/config/assets.js';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/reports', label: 'Reports' },
  { to: '/team', label: 'Team' },
  { to: '/settings', label: 'Settings' },
  { to: '/visuals', label: 'Visuals' },
  { to: '/monitor', label: 'Monitor' },
];

const Navbar = () => {
  const { signOut, user, role } = useAuth();
  const location = useLocation();
  const { cycleTheme, theme } = useTheme();

  return (
    <div className="flex w-full items-center justify-between gap-4 border-b border-white/10 bg-black/40 px-6 py-4 backdrop-blur">
      <Link to="/" className="flex items-center gap-3 text-xl font-semibold text-white">
        <img src={ASSETS.logoMain} alt="Hustle Studio" className="h-10 w-10" />
        <span className="hidden font-serif tracking-[0.4em] text-sm uppercase text-white/70 sm:block">
          Hustle Studio
        </span>
      </Link>

      <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-sm font-medium md:flex">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative rounded-full px-4 py-2 transition hover:text-white ${
                isActive || location.pathname === item.to ? 'text-white' : 'text-white/60'
              }`
            }
          >
            {({ isActive }) => (
              <span className="relative z-10">
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-brand-500/30"
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  />
                )}
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={cycleTheme}
          className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/70 transition hover:border-white/30 hover:text-white lg:inline-flex"
        >
          {theme.label}
        </button>
        <Menu as="div" className="relative">
          <Menu.Button className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white/80">
          <div>
            <p className="font-semibold text-white">{user?.email ?? 'Guest'}</p>
            <p className="text-xs uppercase tracking-widest text-white/50">{role ?? 'member'}</p>
          </div>
          <span className="text-lg">▾</span>
          </Menu.Button>
          <Transition
            as={Fragment}
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <Menu.Items className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 p-1 text-sm shadow-xl">
              <Menu.Item>
                {({ active }) => (
                  <Link
                    to="/settings"
                    className={`block rounded-lg px-4 py-2 ${active ? 'bg-white/10' : ''}`}
                  >
                    Profile & Settings
                  </Link>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={signOut}
                    className={`block w-full rounded-lg px-4 py-2 text-left ${active ? 'bg-white/10' : ''}`}
                  >
                    Sign out
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </div>
  );
};

export default Navbar;
