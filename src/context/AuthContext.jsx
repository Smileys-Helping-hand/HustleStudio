import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import PropTypes from 'prop-types';
import { auth } from '../lib/firebase';
import { toast } from 'react-hot-toast';

const AuthContext = createContext({
  user: null,
  role: null,
  memberships: [],
  loading: true,
  offlineMode: false,
  login: async () => {},
  signOut: async () => {},
  reportOffline: () => {},
  refreshMemberships: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('staff');
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState([]);
  const [offlineMode] = useState(false);

  const loadMemberships = useCallback(async (uid) => {
    console.log('[AuthContext] loadMemberships called with uid:', uid);
    if (!uid) {
      console.log('[AuthContext] No uid provided, clearing memberships');
      setMemberships([]);
      return [];
    }

    try {
      // TODO: Replace with API call to /api/v1/tenants?uid=
      // For now, create a default membership
      const defaultMembership = {
        tenantId: 'default',
        role: 'Owner',
        uid,
      };
      
      console.log('[AuthContext] Using default membership');
      setMemberships([defaultMembership]);
      return [defaultMembership];
    } catch (error) {
      console.error('[Auth] Failed to load tenant memberships.', error);
      setMemberships([]);
      return [];
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.info(
        '[AuthState] Auth change detected.',
        firebaseUser ? firebaseUser.uid : 'signed out'
      );
      
      if (!firebaseUser) {
        setUser(null);
        setRole('staff');
        setMemberships([]);
        setLoading(false);
        return;
      }

      try {
        // Set user immediately
        setUser(firebaseUser);
        setRole('Owner'); // Default role for now
        
        // Load memberships
        await loadMemberships(firebaseUser.uid);
      } catch (error) {
        console.error('[Auth] Failed to initialize user.', error);
        setUser(firebaseUser);
        setRole('staff');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [loadMemberships]);

  const login = useCallback(
    async (email, password) => {
      try {
        setLoading(true);
        const credentials = await signInWithEmailAndPassword(auth, email, password);
        console.info('[AuthState] Login successful.', credentials.user.uid);
        
        setRole('Owner');
        await loadMemberships(credentials.user.uid);
        
        toast.success('Signed in successfully');
      } catch (error) {
        console.error('[AuthState] Login failed:', error);
        if (error.code === 'auth/invalid-credential') {
          toast.error('Invalid email or password');
        } else if (error.code === 'auth/too-many-requests') {
          toast.error('Too many attempts. Please try again later.');
        } else {
          toast.error('Failed to sign in');
        }
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [loadMemberships]
  );

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setRole('staff');
      setMemberships([]);
      toast.success('Signed out');
    } catch (error) {
      console.error('[AuthState] Sign out failed:', error);
      toast.error('Failed to sign out');
      throw error;
    }
  }, []);

  const refreshMemberships = useCallback(
    async (uid) => {
      const effectiveUid = uid || user?.uid;
      if (!effectiveUid) {
        console.log('[AuthContext] Cannot refresh memberships without uid');
        return [];
      }
      return loadMemberships(effectiveUid);
    },
    [user, loadMemberships]
  );

  const value = useMemo(
    () => ({
      user,
      role,
      memberships,
      loading,
      offlineMode,
      login,
      signOut,
      reportOffline: () => {},
      refreshMemberships,
    }),
    [user, role, memberships, loading, offlineMode, login, signOut, refreshMemberships]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useAuth = () => useContext(AuthContext);
