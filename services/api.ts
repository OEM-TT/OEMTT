import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { supabase } from './supabase';
import Constants from 'expo-constants';

// API Configuration - Read from app.json
const API_URL = Constants.expoConfig?.extra?.API_URL || 'http://localhost:3000/api';

console.log('🌐 API_URL being used:', API_URL);

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Get Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token && config.headers) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
        console.log('🔑 API request:', config.method?.toUpperCase(), `${config.baseURL}${config.url}`);
      } else {
        console.warn('⚠️ No active session or token found');
      }
    } catch (error) {
      console.error('❌ Error getting session:', error);
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token using Supabase
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (session?.access_token && !refreshError) {
          console.log('🔄 Token refreshed successfully');

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
          }
          return apiClient(originalRequest);
        } else {
          console.error('❌ Token refresh failed:', refreshError);
          // Supabase will handle clearing the session
        }
      } catch (refreshError) {
        console.error('❌ Token refresh error:', refreshError);
      }
    }

    // Handle other errors
    const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
    console.error('API Error:', errorMessage);
    
    return Promise.reject(error);
  }
);

// API helper methods
export const api = {
  // GET request
  get: async <T>(url: string, config = {}) => {
    const response = await apiClient.get<T>(url, config);
    return response.data;
  },

  // POST request
  post: async <T>(url: string, data?: any, config = {}) => {
    const response = await apiClient.post<T>(url, data, config);
    return response.data;
  },

  // PUT request
  put: async <T>(url: string, data?: any, config = {}) => {
    const response = await apiClient.put<T>(url, data, config);
    return response.data;
  },

  // PATCH request
  patch: async <T>(url: string, data?: any, config = {}) => {
    const response = await apiClient.patch<T>(url, data, config);
    return response.data;
  },

  // DELETE request
  delete: async <T>(url: string, config = {}) => {
    const response = await apiClient.delete<T>(url, config);
    return response.data;
  },
};

export default apiClient;
