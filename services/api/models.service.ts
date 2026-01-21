import { api } from '../api';
import { Model, Manual, ProductLine, OEM } from '@/types';

interface APIResponse<T> {
  success: boolean;
  data: T;
}

export interface ModelSearchResult {
  query: string;
  count: number;
  models: (Model & {
    productLine: ProductLine & {
      oem: Pick<OEM, 'id' | 'name' | 'vertical' | 'logoUrl'>;
    };
    _count: { manuals: number };
  })[];
}

export interface ModelWithDetails extends Model {
  productLine: ProductLine & {
    oem: OEM;
  };
  manuals: Manual[];
  _count: {
    savedUnits: number;
  };
}

export interface ModelManualsResponse {
  model: {
    id: string;
    modelNumber: string;
    productLine: string;
    oem: string;
  };
  manuals: Manual[];
}

/**
 * Model API Service
 */
export const modelsService = {
  /**
   * Search models by model number
   * @param query Search query
   * @param limit Max results (default: 20)
   */
  async search(query: string, limit: number = 20): Promise<ModelSearchResult> {
    const response = await api.get<APIResponse<ModelSearchResult>>('/models/search', {
      params: { q: query, limit },
    });
    return response.data;
  },

  /**
   * Get model by ID with full details
   */
  async getById(id: string): Promise<ModelWithDetails> {
    const response = await api.get<APIResponse<ModelWithDetails>>(`/models/${id}`);
    return response.data;
  },

  /**
   * Get manuals for a model
   * @param modelId Model ID
   * @param type Optional filter by manual type
   * @param status Optional filter by status (default: 'active')
   */
  async getManuals(
    modelId: string,
    type?: string,
    status: string = 'active'
  ): Promise<ModelManualsResponse> {
    const params: any = { status };
    if (type) params.type = type;

    const response = await api.get<APIResponse<ModelManualsResponse>>(
      `/models/${modelId}/manuals`,
      { params }
    );
    return response.data;
  },

  /**
   * Alias for getManuals
   */
  async getManualsByModel(
    modelId: string,
    type?: string,
    status: string = 'active'
  ): Promise<Manual[]> {
    const response = await this.getManuals(modelId, type, status);
    return response.manuals;
  },
};
