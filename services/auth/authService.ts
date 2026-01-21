import * as SecureStore from 'expo-secure-store';
import { supabase } from '../supabase';
import api from '../api';

const ACCESS_TOKEN_KEY = 'oem_techtalk_access_token';
const REFRESH_TOKEN_KEY = 'oem_techtalk_refresh_token';
const USER_KEY = 'oem_techtalk_user';

export class AuthService {
  // Token Management
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  }

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  }

  // Password Authentication
  async signInWithPassword(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  }

  async signUpWithPassword(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  }

  // Magic Link Authentication (OTP via email)
  async sendMagicLink(email: string): Promise<void> {
    console.log('📧 authService.sendMagicLink() called');
    console.log('  - Email:', email);
    console.log('  - Calling Supabase signInWithOtp...');

    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'oemtechtalk://auth/verify',
      },
    });

    if (error) {
      console.error('❌ Supabase signInWithOtp error:', error);
      console.error('  - Error name:', error.name);
      console.error('  - Error message:', error.message);
      console.error('  - Error status:', (error as any).status);
      throw error;
    }

    console.log('✅ Supabase signInWithOtp successful');
    console.log('  - Response data:', data);
    console.log('📬 Check your email for the 8-digit code!');
  }

  // Session Management
  async getSession() {
    console.log('📖 authService.getSession() called...');
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('❌ Error getting session:', error);
      return null;
    }

    if (data.session) {
      console.log('✅ Session retrieved from Supabase/SecureStore');
      console.log('  - Expires:', new Date(data.session.expires_at! * 1000).toLocaleString());
      console.log('  - User:', data.session.user.email);

      // Store tokens if session exists (ensures our custom storage is in sync)
      await this.setTokens(
        data.session.access_token,
        data.session.refresh_token || ''
      );
    } else {
      console.log('ℹ️ No session found in Supabase/SecureStore');
    }

    return data.session;
  }

  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }

    // Cache user data
    if (data.user) {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
    }

    return data.user;
  }

  async getCachedUser() {
    const userStr = await SecureStore.getItemAsync(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  // Sign Out
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    await this.clearTokens();

    if (error) {
      throw error;
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return !!session;
  }

  // Dev Mode Login (Development Only)
  async devLogin(email: string): Promise<{ access_token: string; refresh_token: string } | null> {
    if (!__DEV__) {
      console.warn('Dev login is only available in development mode');
      return null;
    }

    try {
      console.log('🔧 DEV MODE: Logging in with:', email);
      const response = await api.post('/auth/dev-login', { email });

      if (response.success && response.session) {
        const { access_token, refresh_token } = response.session;

        // Store tokens
        await this.setTokens(access_token, refresh_token);

        console.log('✅ Dev login successful');
        return { access_token, refresh_token };
      }

      return null;
    } catch (error) {
      console.error('❌ Dev login failed:', error);
      return null;
    }
  }

  // Backend Integration
  async syncUserWithBackend() {
    const session = await this.getSession();
    if (!session) return;

    try {
      // Call backend to sync user data
      await api.post('/auth/sync', {
        userId: session.user.id,
        email: session.user.email,
      });
    } catch (error) {
      console.error('Failed to sync user with backend:', error);
    }
  }
}

export const authService = new AuthService();
