/**
 * PlaceMate – Auth Context Provider
 *
 * Wraps the app with Firebase Auth state. Provides current user,
 * loading state, sign-in, and sign-out to all components via useAuth().
 *
 * Includes retry logic for the /auth/register call to gracefully handle
 * Firebase "Token used too early" clock-skew errors on cold-start login.
 */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
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

/**
 * Retry a function up to `retries` times with exponential backoff.
 * Used to handle "Token used too early" errors caused by minor clock drift.
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 2000
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isClockSkew =
        error instanceof Error &&
        error.message.includes("Token used too early");

      if (isClockSkew && attempt < retries) {
        // Wait and retry — the token will become valid once the server clock catches up
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Unreachable");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Guard against StrictMode double-invoke of onAuthStateChanged
  const registeredRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      // Register/sync user profile with backend on sign-in.
      // Skip if already registered this session to avoid double calls from StrictMode.
      if (firebaseUser && !registeredRef.current) {
        registeredRef.current = true;
        try {
          await retryWithBackoff(() => api.post("/auth/register"));
        } catch (error) {
          // Only log errors that aren’t expected clock-skew retries that self-resolve
          const isClockSkew =
            error instanceof Error &&
            error.message.includes("Token used too early");
          if (!isClockSkew) {
            console.error("Failed to sync user with backend:", error);
          }
        }
      } else if (!firebaseUser) {
        // User signed out — reset so next sign-in re-registers cleanly
        registeredRef.current = false;
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
