import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { firebaseAuth } from "@/integrations/firebase/config";
import { firebaseSignOut } from "@/integrations/firebase/auth";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
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

  /**
   * Bridge: given a Firebase user's email, look up the matching Supabase profile.
   * If the profile doesn't exist yet (first Google sign-in), create one.
   */
  const resolveSupabaseProfile = async (fbUser: FirebaseUser) => {
    const email = fbUser.email;
    if (!email) return;

    try {
      // Try to find existing profile by email in the auth.users / profiles table
      // Profiles store user_id (Supabase auth UUID). We look up by matching email.
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", fbUser.uid)
        .maybeSingle();

      if (profileData) {
        // Existing profile found by Firebase UID
        setProfile(profileData);
        setUser({ id: profileData.user_id, email });
        await checkAdmin(profileData.user_id);
        return;
      }

      // Try finding by the original Supabase user_id if email matches
      // We search for a profile whose user_id matches via the auth table
      // Since we can't query auth.users from client, look up profiles directly
      // by checking all profiles (for the bridge approach, we use email matching
      // through the user_id in auth.users). However, profiles don't store email.
      // 
      // Alternative: Insert new profile with Firebase UID as user_id.
      // This works for NEW users. For existing users who had Supabase auth,
      // we'll need to update their user_id to match Firebase UID.

      // Create a new profile for this Firebase user
      const displayName = fbUser.displayName || email.split("@")[0];
      const { data: newProfile, error } = await supabase
        .from("profiles")
        .insert({
          user_id: fbUser.uid,
          full_name: displayName,
          area: "",
          is_verified: false,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating profile:", error);
        // Profile might already exist with a different user_id
        // This can happen if the same email was used with Supabase auth before
        return;
      }

      if (newProfile) {
        setProfile(newProfile);
        setUser({ id: newProfile.user_id, email });
        await checkAdmin(newProfile.user_id);
      }
    } catch (err) {
      console.error("Error resolving profile:", err);
    }
  };

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

  const fetchProfileFromUser = async () => {
    if (!firebaseUser) return;
    await resolveSupabaseProfile(firebaseUser);
  };

  const refreshProfile = fetchProfileFromUser;
  const fetchProfile = fetchProfileFromUser;

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
  }, []);

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
