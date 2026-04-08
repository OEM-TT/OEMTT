import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { authService } from '@/services/auth';
import { useTheme } from '@/contexts/ThemeContext';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();
  const { setThemePreference } = useTheme();

  // Check authentication status
  useEffect(() => {
    checkAuth();
  }, []);

  // Handle routing based on auth state
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to home if authenticated
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  const checkAuth = async () => {
    try {
      console.log('🔐 Checking for existing session...');
      const session = await authService.getSession();

      if (session) {
        console.log('✅ Session found! Expires:', new Date(session.expires_at! * 1000).toLocaleString());
        const currentUser = await authService.getUser();

        if (currentUser) {
          console.log('✅ User authenticated:', currentUser.email);
          setUser(currentUser);

          console.log('🔄 Calling /users/me to sync user...');
          try {
            const { usersService } = await import('@/services/api/users.service');
            const appUser = await usersService.getMe();
            console.log('✅ User synced with backend database.');

            if (appUser.themePreference && appUser.themePreference !== 'system') {
              await setThemePreference(appUser.themePreference);
            }
          } catch (apiError) {
            console.error('❌ Failed to sync user with backend database:', apiError);
          }
        } else {
          console.log('⚠️ Session exists but no user found');
        }
      } else {
        console.log('ℹ️ No existing session found');
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    const currentUser = await authService.getUser();
    setUser(currentUser);
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    router.replace('/(auth)/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
      {loading ? null : children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
