import { api } from '../api';
import { OEM, ProductLine, Model } from '@/types';

interface APIResponse<T> {
  success: boolean;
  data: T;
}

export interface OEMWithProductLines extends OEM {
  productLines: ProductLine[];
}

export interface ProductLineWithModels {
  productLine: ProductLine & { oem: OEM };
  models: (Model & { _count: { manuals: number } })[];
}

/**
 * OEM API Service
 */
export const oemsService = {
  /**
   * Get all OEMs
   * @param vertical Optional filter by vertical (e.g., 'HVAC')
   */
  async getAll(vertical?: string): Promise<OEM[]> {
    const params = vertical ? { vertical } : {};
    const response = await api.get<APIResponse<OEM[]>>('/oems', { params });
    return response.data;
  },

  /**
   * Get OEM by ID with product lines
   */
  async getById(id: string): Promise<OEMWithProductLines> {
    const response = await api.get<APIResponse<OEMWithProductLines>>(`/oems/${id}`);
    return response.data;
  },

  /**
   * Get product lines for an OEM
   * @param oemId OEM ID
   * @param category Optional filter by category
   */
  async getProductLines(
    oemId: string,
    category?: string
  ): Promise<(ProductLine & { _count: { models: number } })[]> {
    const params = category ? { category } : {};
    const response = await api.get<
      APIResponse<(ProductLine & { _count: { models: number } })[]>
    >(`/oems/${oemId}/product-lines`, { params });
    return response.data;
  },

  /**
   * Get models for a product line
   * @param productLineId Product line ID
   * @param discontinued Optional filter by discontinued status
   */
  async getModels(
    productLineId: string,
    discontinued?: boolean
  ): Promise<ProductLineWithModels> {
    const params = discontinued !== undefined ? { discontinued: String(discontinued) } : {};
    const response = await api.get<APIResponse<ProductLineWithModels>>(
      `/oems/product-lines/${productLineId}/models`,
      { params }
    );
    return response.data;
  },
};
