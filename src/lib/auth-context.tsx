"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { ROLE_DEFAULT_PERMISSIONS, SUPER_ADMIN_EMAIL } from "./constants";
import type { UserProfile, UserRole } from "./types";

interface AuthValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

async function ensureProfile(user: User) {
  const ref = doc(db, "users", user.uid);
  const existing = await getDoc(ref);
  const email = (user.email || "").toLowerCase();
  if (existing.exists()) {
    if (email === SUPER_ADMIN_EMAIL && user.emailVerified && existing.data().role !== "super_admin") {
      await setDoc(ref, {
        role: "super_admin",
        permissions: ROLE_DEFAULT_PERMISSIONS.super_admin,
        disabled: false,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
    return;
  }

  const invite = email ? await getDoc(doc(db, "adminInvites", email)) : null;
  let role: UserRole = "citizen";
  let permissions = ROLE_DEFAULT_PERMISSIONS.citizen;

  if (email === SUPER_ADMIN_EMAIL && user.emailVerified) {
    role = "super_admin";
    permissions = ROLE_DEFAULT_PERMISSIONS.super_admin;
  } else if (invite?.exists()) {
    role = invite.data().role as UserRole;
    permissions = invite.data().permissions || ROLE_DEFAULT_PERMISSIONS[role];
  }

  await setDoc(ref, {
    email,
    displayName: user.displayName || email.split("@")[0] || "Citizen",
    role,
    permissions,
    disabled: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, async (nextUser) => {
      unsubscribeProfile?.();
      setUser(nextUser);
      setProfile(null);
      if (!nextUser) {
        setLoading(false);
        return;
      }
      try {
        await ensureProfile(nextUser);
        unsubscribeProfile = onSnapshot(doc(db, "users", nextUser.uid), (snapshot) => {
          if (snapshot.exists()) {
            setProfile({ id: snapshot.id, ...snapshot.data() } as UserProfile);
          }
          setLoading(false);
        });
      } catch (error) {
        console.error("Profile bootstrap failed", error);
        setLoading(false);
      }
    });
    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    if (email.trim().toLowerCase() === SUPER_ADMIN_EMAIL) {
      await sendEmailVerification(credential.user, { url: `${window.location.origin}/auth` });
    }
    await ensureProfile(credential.user);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const credential = await signInWithPopup(auth, provider);
    await ensureProfile(credential.user);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    const snapshot = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (snapshot.exists()) setProfile({ id: snapshot.id, ...snapshot.data() } as UserProfile);
  }, []);

  const value = useMemo<AuthValue>(() => {
    const role = profile?.role;
    return {
      user,
      profile,
      loading,
      isAdmin: role === "admin" || role === "super_admin" || user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL,
      isStaff: !!role && role !== "citizen",
      signIn,
      signUp,
      signInWithGoogle,
      resetPassword,
      signOut: () => firebaseSignOut(auth),
      refreshProfile,
    };
  }, [user, profile, loading, signIn, signUp, signInWithGoogle, resetPassword, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
