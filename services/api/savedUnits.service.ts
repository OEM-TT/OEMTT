import { api } from '../api';
import { SavedUnit, Model, ProductLine, OEM } from '@/types';

interface APIResponse<T> {
  success: boolean;
  data: T;
}

export interface SavedUnitWithDetails extends SavedUnit {
  model: Model & {
    productLine: ProductLine & {
      oem: OEM;
    };
  };
}

export interface CreateSavedUnitInput {
  modelId: string;
  nickname: string;
  serialNumber?: string;
  installDate?: string; // ISO 8601 format
  location?: string;
  notes?: string;
}

export interface UpdateSavedUnitInput {
  nickname?: string;
  serialNumber?: string;
  installDate?: string; // ISO 8601 format
  location?: string;
  notes?: string;
}

/**
 * Saved Units API Service
 */
export const savedUnitsService = {
  /**
   * Get all saved units for the authenticated user
   */
  async getAll(): Promise<SavedUnitWithDetails[]> {
    const response = await api.get<APIResponse<SavedUnitWithDetails[]>>('/saved-units');
    return response.data;
  },

  /**
   * Get saved unit by ID
   */
  async getById(id: string): Promise<SavedUnitWithDetails> {
    const response = await api.get<APIResponse<SavedUnitWithDetails>>(`/saved-units/${id}`);
    return response.data;
  },

  /**
   * Create a new saved unit
   */
  async create(data: CreateSavedUnitInput): Promise<SavedUnitWithDetails> {
    const response = await api.post<APIResponse<SavedUnitWithDetails>>('/saved-units', data);
    return response.data;
  },

  /**
   * Update an existing saved unit
   */
  async update(id: string, data: UpdateSavedUnitInput): Promise<SavedUnitWithDetails> {
    const response = await api.patch<APIResponse<SavedUnitWithDetails>>(
      `/saved-units/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a saved unit
   */
  async delete(id: string): Promise<{ message: string }> {
    const response = await api.delete<APIResponse<{ message: string }>>(`/saved-units/${id}`);
    return response.data;
  },
};
