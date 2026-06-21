import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setMockSession: (session: Session | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);

  const setMockSession = (customSession: Session | null) => {
    setSession(customSession);
    setUser(customSession?.user ?? null);
    if (customSession?.user) {
      setIsAdmin(true);
      setIsStaff(true);
    } else {
      setIsAdmin(false);
      setIsStaff(false);
    }
  };

  const checkRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (data ?? []).map((r: any) => r.role);
    setIsAdmin(roles.includes("admin"));
    setIsStaff(roles.includes("admin") || roles.includes("staff"));
  };

  useEffect(() => {
    let initialized = false;

    // First, get the current session to set initial state
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        checkRoles(session.user.id);
      } else {
        // Fallback to local sandbox session if present
        const savedSandbox = localStorage.getItem("sb-sandbox-session");
        if (savedSandbox) {
          try {
            const parsed = JSON.parse(savedSandbox);
            setSession(parsed);
            setUser(parsed.user);
            setIsAdmin(true);
            setIsStaff(true);
          } catch (e) {
            localStorage.removeItem("sb-sandbox-session");
          }
        }
      }
      initialized = true;
      setLoading(false);
    });

    // Then listen for subsequent auth changes (sign in/out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Skip the initial event fired by onAuthStateChange, since we handle it via getSession
      if (!initialized) return;

      if (event === "SIGNED_OUT") {
        localStorage.removeItem("sb-sandbox-session");
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setIsStaff(false);
      } else if (session) {
        setSession(session);
        setUser(session.user);
        setTimeout(() => checkRoles(session.user.id), 0);
      } else {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setIsStaff(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    localStorage.removeItem("sb-sandbox-session");
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isStaff, signUp, signIn, signOut, setMockSession }}>
      {children}
    </AuthContext.Provider>
  );
};
