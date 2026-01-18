import React, { createContext, useContext, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '@/utils/theme';

// ============================================
// Types
// ============================================

type Theme = typeof lightTheme;

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  colorScheme: 'light' | 'dark';
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
  // Automatically detect system color scheme
  const systemColorScheme = useColorScheme();
  const colorScheme = systemColorScheme || 'light';
  const isDark = colorScheme === 'dark';
  
  // Select appropriate theme based on system preference
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, colorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================
// Custom Hook for Theme Access
// ============================================

/**
 * Hook to access the current theme
 * Automatically reacts to system color scheme changes
 * 
 * @returns {ThemeContextType} Current theme object and dark mode state
 * 
 * @example
 * const { theme, isDark } = useTheme();
 * const styles = StyleSheet.create({
 *   container: {
 *     backgroundColor: theme.colors.background,
 *   },
 * });
 */
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
