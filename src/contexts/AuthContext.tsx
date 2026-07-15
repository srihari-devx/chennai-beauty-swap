import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { firebaseAuth } from "@/integrations/firebase/config";
import { firebaseSignOut } from "@/integrations/firebase/auth";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

interface Profile {
  id: string;
  user_id: string;
  firebase_uid: string | null;
  full_name: string;
  area: string;
  avatar_url: string | null;
  gender: string | null;
  is_verified: boolean;
}

/**
 * A lightweight user object that exposes the Supabase profile's user_id
 * so all downstream database queries (which use user.id) keep working.
 */
interface AppUser {
  /** Supabase profile user_id (UUID) — used for all DB operations */
  id: string;
  email: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  profile: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  fetchProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdmin = async (userId: string) => {
    try {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .single();
      setIsAdmin(!!roleData);
    } catch {
      setIsAdmin(false);
    }
  };

  /**
   * Bridge: given a Firebase user, fetch or create a Supabase profile via
   * the firebase-profile Edge Function (uses service role to bypass RLS,
   * and verifies the Firebase ID token server-side).
   */
  const resolveSupabaseProfile = useCallback(async (fbUser: FirebaseUser) => {
    try {
      // Get the Firebase ID token (refreshes automatically if expired)
      const idToken = await fbUser.getIdToken();

      const res = await fetch(`${SUPABASE_URL}/functions/v1/firebase-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // The anon key is sent as the API key so the Edge Function is reachable.
          // The actual auth check is done inside the function using the ID token.
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error("firebase-profile edge function error:", errBody);
        return;
      }

      const profileData: Profile = await res.json();

      if (profileData?.user_id) {
        setProfile(profileData);
        setUser({ id: profileData.user_id, email: fbUser.email });
        await checkAdmin(profileData.user_id);
      }
    } catch (err) {
      console.error("Error resolving Supabase profile:", err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    // Re-read firebaseUser from the auth instance directly to avoid stale closure
    const currentUser = firebaseAuth.currentUser;
    if (currentUser) {
      await resolveSupabaseProfile(currentUser);
    }
  }, [resolveSupabaseProfile]);

  const fetchProfile = refreshProfile;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        await resolveSupabaseProfile(fbUser);
      } else {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [resolveSupabaseProfile]);

  const signOut = async () => {
    await firebaseSignOut();
    setFirebaseUser(null);
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, profile, isAdmin, loading, signOut, refreshProfile, fetchProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};
