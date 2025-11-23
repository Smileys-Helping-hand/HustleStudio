import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import PropTypes from 'prop-types';
import { auth, db } from '../lib/firebase';
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
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState([]);
  const [offlineMode, setOfflineMode] = useState(false);

  const reportOffline = useCallback(() => {
    console.warn('[Firestore] Connection issue detected — switching to offline mode.');
    setOfflineMode(true);
  }, []);

  const loadMemberships = useCallback(
    async (uid) => {
      if (!uid) {
        setMemberships([]);
        return [];
      }
      try {
        const membershipsQuery = query(
          collectionGroup(db, 'users'),
          where('uid', '==', uid)
        );
        const snapshot = await getDocs(membershipsQuery);
        const mapped = snapshot.docs.map((docSnapshot) => ({
          tenantId: docSnapshot.ref.parent.parent?.id ?? docSnapshot.data().tenantId ?? 'default',
          role: docSnapshot.data().role ?? 'viewer',
          ...docSnapshot.data(),
        }));
        setMemberships(mapped);
        return mapped;
      } catch (error) {
        console.error('[Firestore] Failed to load tenant memberships.', error);
        setMemberships([]);
        return [];
      }
    },
    []
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.info(
        '[AuthState] Auth change detected.',
        firebaseUser ? firebaseUser.uid : 'signed out'
      );
      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setMemberships([]);
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        await loadMemberships(firebaseUser.uid);
        setUser(firebaseUser);
        setRole(userDoc.exists() ? (userDoc.data().role ?? 'staff') : 'staff');
        setOfflineMode(false);
      } catch (error) {
        console.error('[Firestore] Failed to load user profile.', error);
        toast.error('Profile is unavailable — using offline defaults.');
        setUser(firebaseUser);
        setRole('staff');
        reportOffline();
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [loadMemberships, reportOffline]);

  const login = useCallback(
    async (email, password) => {
      try {
        setLoading(true);
        const credentials = await signInWithEmailAndPassword(auth, email, password);
        console.info('[AuthState] Login successful.', credentials.user.uid);
        try {
          const profile = await getDoc(doc(db, 'users', credentials.user.uid));
          await loadMemberships(credentials.user.uid);
          setRole(profile.exists() ? (profile.data().role ?? 'staff') : 'staff');
          setOfflineMode(false);
        } catch (profileError) {
          console.error('[Firestore] Unable to load profile after login.', profileError);
          toast.error('Profile unavailable — continuing in offline mode.');
          setRole('staff');
          reportOffline();
        }
        setUser(credentials.user);
        toast.success('Welcome back to Hustle Studio!');
      } catch (error) {
        console.error('[AuthState] Login error.', error);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
          toast.error('Invalid email or password');
        } else {
          toast.error('Unable to log in right now');
        }
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [loadMemberships, reportOffline]
  );

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      console.info('[AuthState] User signed out.');
      setUser(null);
      setRole(null);
      setMemberships([]);
    } catch (error) {
      console.error('[AuthState] Sign-out error.', error);
      toast.error('Unable to sign out');
      throw error;
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      role,
      memberships,
      loading,
      offlineMode,
      login,
      signOut,
      reportOffline,
      refreshMemberships: loadMemberships,
    }),
    [
      user,
      role,
      memberships,
      loading,
      offlineMode,
      reportOffline,
      login,
      signOut,
      loadMemberships,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useAuth = () => useContext(AuthContext);
