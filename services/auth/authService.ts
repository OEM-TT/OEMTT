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

  // Magic Link Authentication
  async sendMagicLink(email: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'oemtechtalk://auth/verify',
      },
    });

    if (error) {
      throw error;
    }
  }

  // Session Management
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }

    // Store tokens if session exists
    if (data.session) {
      await this.setTokens(
        data.session.access_token,
        data.session.refresh_token || ''
      );
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
