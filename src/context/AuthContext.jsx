import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import PropTypes from "prop-types";
import { auth, db } from "../lib/firebase";
import { toast } from "react-hot-toast";

const AuthContext = createContext({
  user: null,
  role: null,
  loading: true,
  login: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        setUser(firebaseUser);
        setRole(userDoc.exists() ? userDoc.data().role ?? "staff" : "staff");
      } catch (error) {
        console.error("Failed to load user profile", error);
        toast.error("Failed to load your profile information");
        setUser(firebaseUser);
        setRole("staff");
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
      const profile = await getDoc(doc(db, "users", credentials.user.uid));
      setUser(credentials.user);
      setRole(profile.exists() ? profile.data().role ?? "staff" : "staff");
      toast.success("Welcome back! 🎉");
    } catch (error) {
      console.error("Login error", error);
      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        toast.error("Invalid email or password");
      } else {
        toast.error("Unable to log in right now");
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
    } catch (error) {
      console.error("Sign-out error", error);
      toast.error("Unable to sign out");
      throw error;
    }
  };

  const value = useMemo(
    () => ({
      user,
      role,
      loading,
      login,
      signOut,
    }),
    [user, role, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useAuth = () => useContext(AuthContext);
