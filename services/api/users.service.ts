import { api } from '../api';
import { User } from '@/types';

interface APIResponse<T> {
  success: boolean;
  data: T;
}

export interface UpdateUserInput {
  name?: string;
  phone?: string;
  onboardingCompleted?: boolean;
}

/**
 * Users API Service
 */
export const usersService = {
  /**
   * Get current authenticated user's profile
   */
  async getMe(): Promise<User> {
    const response = await api.get<APIResponse<User>>('/users/me');
    return response.data;
  },

  /**
   * Update current user's profile
   */
  async updateMe(data: UpdateUserInput): Promise<User> {
    const response = await api.patch<APIResponse<User>>('/users/me', data);
    return response.data;
  },
};
