import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '@/utils/theme';

// ============================================
// Types
// ============================================

type Theme = typeof lightTheme;
export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_PREFERENCE_KEY = 'theme_preference';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  colorScheme: 'light' | 'dark';
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
}

// ============================================
// Context Creation
// ============================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ============================================
// Theme Provider Component
// ============================================

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_PREFERENCE_KEY).then((value) => {
      if (value === 'light' || value === 'dark' || value === 'system') {
        setThemePreferenceState(value);
      }
    });
  }, []);

  const setThemePreference = useCallback(async (preference: ThemePreference) => {
    setThemePreferenceState(preference);
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference);
  }, []);

  const effectiveColorScheme: 'light' | 'dark' =
    themePreference === 'system'
      ? (systemColorScheme || 'light')
      : themePreference;

  const isDark = effectiveColorScheme === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, colorScheme: effectiveColorScheme, themePreference, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================
// Custom Hook for Theme Access
// ============================================

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

// ============================================
// Export Types
// ============================================

export type { Theme, ThemeContextType };
