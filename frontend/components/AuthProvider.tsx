/**
 * PlaceMate – Auth Context Provider
 *
 * Wraps the app with Firebase Auth state. Provides current user,
 * loading state, sign-in, and sign-out to all components via useAuth().
 */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  auth,
  onAuthStateChanged,
  signInWithGoogle,
  signOut,
  User,
} from "@/lib/firebase";
import { api } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  logOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      // Register/sync user profile with backend on sign-in
      if (firebaseUser) {
        try {
          await api.post("/auth/register");
        } catch (error) {
          console.error("Failed to sync user with backend:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      await signInWithGoogle();
      // onAuthStateChanged will handle the rest
    } catch (error) {
      console.error("Sign-in failed:", error);
      throw error;
    }
  };

  const logOut = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error("Sign-out failed:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state and actions.
 *
 * Usage:
 *   const { user, loading, signIn, logOut } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
