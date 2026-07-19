"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import type { ThemeId } from "./types";

interface ThemeValue {
  theme: ThemeId;
  setPreviewTheme: (theme: ThemeId | null) => void;
}

const ThemeContext = createContext<ThemeValue>({ theme: "command", setPreviewTheme: () => undefined });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [defaultTheme, setDefaultTheme] = useState<ThemeId>("command");
  const [previewTheme, setPreviewTheme] = useState<ThemeId | null>(null);
  const theme = previewTheme || defaultTheme;

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "theme"),
      (snapshot) => setDefaultTheme((snapshot.data()?.defaultTheme as ThemeId) || "command"),
      () => setDefaultTheme("command")
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo(() => ({ theme, setPreviewTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
