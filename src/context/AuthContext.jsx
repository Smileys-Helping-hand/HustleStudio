import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import PropTypes from 'prop-types';
import { auth, db } from '../lib/firebase';
import { toast } from 'react-hot-toast';

const AuthContext = createContext({
  user: null,
  role: null,
  tenantId: null,
  loading: true,
  login: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setTenantId(null);
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        setUser(firebaseUser);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setRole(data.role ?? 'staff');
          setTenantId(data.tenantId ?? null);
        } else {
          setRole('staff');
          setTenantId(null);
        }
      } catch (error) {
        console.error('Failed to load user profile', error);
        toast.error('Failed to load your profile information');
        setUser(firebaseUser);
        setRole('staff');
        setTenantId(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      const credentials = await signInWithEmailAndPassword(auth, email, password);
      const profile = await getDoc(doc(db, 'users', credentials.user.uid));
      setUser(credentials.user);
      if (profile.exists()) {
        const data = profile.data();
        setRole(data.role ?? 'staff');
        setTenantId(data.tenantId ?? null);
      } else {
        setRole('staff');
        setTenantId(null);
      }
      toast.success('Welcome back! 🎉');
    } catch (error) {
      console.error('Login error', error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        toast.error('Invalid email or password');
      } else {
        toast.error('Unable to log in right now');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setRole(null);
      setTenantId(null);
    } catch (error) {
      console.error('Sign-out error', error);
      toast.error('Unable to sign out');
      throw error;
    }
  };

  const value = useMemo(
    () => ({
      user,
      role,
      tenantId,
      loading,
      login,
      signOut,
    }),
    [user, role, tenantId, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useAuth = () => useContext(AuthContext);
