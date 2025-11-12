import { Fragment } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext.jsx';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/candidates', label: 'Candidates' },
  { to: '/cv-generator', label: 'CV Generator' },
  { to: '/admin/recruitment-analytics', label: 'Recruitment Analytics' },
  { to: '/admin/cv-manager', label: 'CV Manager' },
  { to: '/admin/system-health', label: 'System Health' },
  { to: '/reports', label: 'Reports' },
  { to: '/team', label: 'Team' },
  { to: '/settings', label: 'Settings' },
];

const Navbar = () => {
  const { signOut, user, role } = useAuth();
  const location = useLocation();

  return (
    <div className="flex w-full items-center justify-between gap-4 border-b border-white/10 bg-black/40 px-6 py-4 backdrop-blur">
      <Link to="/" className="flex items-center gap-3 text-xl font-semibold">
        <span className="rounded-full bg-brand-500/20 p-2 text-brand-500">⚡</span>
        Side Hustle Studio
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
  );
};

Navbar.propTypes = {
  compact: PropTypes.bool,
};

export default Navbar;
