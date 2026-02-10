"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ThemeColor } from "@/lib/theme";
import { DEFAULT_THEME, THEME_STORAGE_KEY } from "@/lib/theme";

interface ThemeContextType {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeColor, setThemeColorState] = useState<ThemeColor>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load theme from localStorage on mount
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && (stored === "indigo" || stored === "black")) {
      setThemeColorState(stored as ThemeColor);
      document.documentElement.setAttribute("data-theme", stored);
    } else {
      document.documentElement.setAttribute("data-theme", DEFAULT_THEME);
    }
    setMounted(true);
  }, []);

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
    localStorage.setItem(THEME_STORAGE_KEY, color);
    document.documentElement.setAttribute("data-theme", color);
  };

  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
