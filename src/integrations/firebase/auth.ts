import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { firebaseAuth } from "./config";

const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google via popup.
 * The consent screen will show your Firebase authDomain (e.g. swaptics.in)
 * instead of the Supabase project ID.
 */
export const signInWithGoogle = () => signInWithPopup(firebaseAuth, googleProvider);

/**
 * Sign in with email and password.
 */
export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(firebaseAuth, email, password);

/**
 * Create a new account with email and password.
 * Optionally sets the displayName on the Firebase user profile.
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName?: string
) => {
  const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }
  return credential;
};

/**
 * Sign out the current user.
 */
export const firebaseSignOut = () => signOut(firebaseAuth);
