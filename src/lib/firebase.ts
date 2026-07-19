"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseApiKey, firebaseProjectId } from "./firebase-config";

const firebaseConfig = {
  projectId: firebaseProjectId,
  appId: "1:44442755059:web:aa55d5bc885b6df6a9bc86",
  storageBucket: "civicshield-india-sinan.firebasestorage.app",
  apiKey: firebaseApiKey,
  authDomain: "civicshield-india-sinan.firebaseapp.com",
  messagingSenderId: "44442755059",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
