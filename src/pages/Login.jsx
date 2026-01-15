import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { toast } from 'react-hot-toast';
import { ASSETS } from '@/config/assets.js';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import logger from '../lib/logger.js';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const handleSignup = async (event) => {
    event.preventDefault();
    try {
      setIsLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create default tenant for new user
      const tenantId = `tenant_${user.uid}`;
      await setDoc(doc(db, 'tenants', tenantId), {
        name: 'My Studio',
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        plan: 'free',
      });

      // Add user to tenant
      await setDoc(doc(db, 'tenants', tenantId, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        role: 'owner',
        addedAt: new Date().toISOString(),
      });

      toast.success('Account created successfully!');
      navigate('/', { replace: true });
    } catch (error) {
      logger.error(error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Email already in use');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password should be at least 6 characters');
      } else {
        toast.error('Failed to create account');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSignup) {
      return handleSignup(event);
    }
    try {
      setIsLoading(true);
      await login(email, password);
      navigate('/', { replace: true });
    } catch (error) {
      logger.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-4 overflow-hidden"
      style={ASSETS.backgroundLogin ? { backgroundImage: `url(${ASSETS.backgroundLogin})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
      {/* Animated gradient overlays */}
      <motion.div
        className="absolute top-0 left-0 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl"
        animate={{
          scale: [1.3, 1, 1.3],
          x: [0, -50, 0],
          y: [0, -30, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-black/70 p-8 shadow-[0_35px_80px_rgba(0,0,0,0.45)] backdrop-blur"
      >
        <div className="mb-8 text-center">
          <img src={ASSETS.logoMain} alt="Hustle Studio" className="mx-auto mb-4 h-14 w-14" />
          <h1 className="text-2xl font-semibold text-white">
            {isSignup ? 'Create Your Studio' : 'Welcome to Hustle Studio'}
          </h1>
          <p className="text-sm text-white/60">
            {isSignup
              ? 'Sign up to start your cinematic operations cockpit.'
              : 'Log in to resume your cinematic operations cockpit.'}
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
            {isLoading ? (isSignup ? 'Creating...' : 'Signing in...') : (isSignup ? 'Create Account' : 'Enter Studio')}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setEmail('');
              setPassword('');
            }}
            className="text-sm text-white/60 transition hover:text-white"
          >
            {isSignup ? 'Already have an account? Log in' : 'New to Hustle Studio? Create an account'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
