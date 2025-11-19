import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { toast } from 'react-hot-toast';
import { ASSETS } from '@/config/assets.js';

const presets = [
  { email: 'admin@studio.com', label: 'Log in as Admin' },
  { email: 'staff@studio.com', label: 'Log in as Staff' },
];

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@studio.com');
  const [password, setPassword] = useState('Admin123!');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setIsLoading(true);
      await login(email, password);
      navigate('/', { replace: true });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyPreset = (presetEmail) => {
    setEmail(presetEmail);
    setPassword(presetEmail === 'admin@studio.com' ? 'Admin123!' : 'Staff123!');
    toast.success(`Using ${presetEmail} credentials`);
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-cover bg-center px-4"
      style={{ backgroundImage: `url(${ASSETS.backgroundLogin})` }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-black/70 p-8 shadow-[0_35px_80px_rgba(0,0,0,0.45)] backdrop-blur"
      >
        <div className="mb-8 text-center">
          <img src={ASSETS.logoMain} alt="Hustle Studio" className="mx-auto mb-4 h-14 w-14" />
          <h1 className="text-2xl font-semibold text-white">Welcome to Hustle Studio</h1>
          <p className="text-sm text-white/60">
            Log in to resume your cinematic operations cockpit.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="mb-2 block text-xs font-semibold uppercase tracking-widest text-white/60"
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              className="w-full rounded-lg border border-white/10 bg-black/60 px-4 py-3 text-white outline-none transition focus:border-brand-500"
              placeholder="you@studio.com"
              required
            />
          </div>
          <div>
            <label
              className="mb-2 block text-xs font-semibold uppercase tracking-widest text-white/60"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="w-full rounded-lg border border-white/10 bg-black/60 px-4 py-3 text-white outline-none transition focus:border-brand-500"
              placeholder="••••••••"
              required
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--theme-highlight)]/80 px-4 py-3 font-semibold uppercase tracking-[0.3em] text-white shadow-[0_18px_45px_rgba(184,164,108,0.25)] transition hover:bg-[var(--theme-highlight)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Signing in...' : 'Enter Studio'}
          </motion.button>
        </form>

        <div className="mt-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Quick presets
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {presets.map((preset) => (
              <button
                key={preset.email}
                type="button"
                onClick={() => applyPreset(preset.email)}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-brand-500/60 hover:text-white"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
