import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { AppTheme } from '@/types';
import * as storage from '@/utils/storage';

interface ThemeContextType {
  appTheme: AppTheme;
  effectiveTheme: 'light' | 'dark';
  setAppTheme: (theme: AppTheme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [appTheme, setAppThemeState] = useState<AppTheme>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await storage.getAppTheme();
      setAppThemeState(savedTheme);
      setIsLoaded(true);
    };
    loadTheme();
  }, []);

  const setAppTheme = useCallback(async (theme: AppTheme) => {
    setAppThemeState(theme);
    await storage.saveAppTheme(theme);
  }, []);

  // Calculate effective theme
  const effectiveTheme: 'light' | 'dark' =
    appTheme === 'system' ? (systemColorScheme ?? 'light') : appTheme;

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ appTheme, effectiveTheme, setAppTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Custom hook that returns the effective color scheme (replaces useColorScheme)
export function useAppColorScheme(): 'light' | 'dark' {
  const { effectiveTheme } = useTheme();
  return effectiveTheme;
}
