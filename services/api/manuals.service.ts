import { api } from '../api';
import { Manual, Model, ProductLine, OEM } from '@/types';

interface APIResponse<T> {
  success: boolean;
  data: T;
}

export interface ManualSection {
  id: string;
  sectionTitle: string | null;
  sectionType: string;
  content: string;
  pageReference: string | null;
  metadata: any;
  createdAt: string;
}

export interface ManualWithDetails extends Manual {
  model: Model & {
    productLine: ProductLine & {
      oem: OEM;
    };
  };
  _count: {
    sections: number;
  };
}

export interface ManualSectionsResponse {
  manual: {
    id: string;
    title: string | null;
    revision: string | null;
    modelNumber: string;
  };
  sections: ManualSection[];
  count: number;
}

export interface ManualSectionSearchResult {
  query: string;
  count: number;
  sections: (ManualSection & {
    manual: {
      id: string;
      title: string | null;
      manualType: string;
      revision: string | null;
      confidenceScore: number;
      model: {
        id: string;
        modelNumber: string;
        productLine: {
          name: string;
          oem: {
            name: string;
          };
        };
      };
    };
  })[];
}

/**
 * Manual API Service
 */
export const manualsService = {
  /**
   * Get manual by ID
   */
  async getById(id: string): Promise<ManualWithDetails> {
    const response = await api.get<APIResponse<ManualWithDetails>>(`/manuals/${id}`);
    return response.data;
  },

  /**
   * Get sections for a manual
   * @param manualId Manual ID
   * @param type Optional filter by section type
   * @param page Optional filter by page number
   * @param limit Max results (default: 50)
   */
  async getSections(
    manualId: string,
    type?: string,
    page?: number,
    limit: number = 50
  ): Promise<ManualSectionsResponse> {
    const params: any = { limit };
    if (type) params.type = type;
    if (page) params.page = page;

    const response = await api.get<APIResponse<ManualSectionsResponse>>(
      `/manuals/${manualId}/sections`,
      { params }
    );
    return response.data;
  },

  /**
   * Search manual sections by content
   * @param query Search query
   * @param modelId Optional filter by model ID
   * @param type Optional filter by section type
   * @param limit Max results (default: 20)
   */
  async searchSections(
    query: string,
    modelId?: string,
    type?: string,
    limit: number = 20
  ): Promise<ManualSectionSearchResult> {
    const params: any = { q: query, limit };
    if (modelId) params.modelId = modelId;
    if (type) params.type = type;

    const response = await api.get<APIResponse<ManualSectionSearchResult>>(
      '/manuals/search-sections',
      { params }
    );
    return response.data;
  },
};
