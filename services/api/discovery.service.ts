import { api } from '../api';
import { Model, Manual } from '@/types';

interface DiscoverySearchResult {
  success: boolean;
  source: 'database' | 'discovery';
  message?: string;
  manuals?: Array<{
    id: string;
    title: string;
    type: string;
    pageCount: number | null;
    sectionsCount: number;
    model: {
      oem: string;
      productLine: string;
      modelNumber: string;
    };
  }>;
  manual?: {
    id: string;
    title: string;
    pageCount: number;
    sectionsCreated: number;
  };
}

/**
 * Discovery API Service
 * Uses intelligent search that checks database first, then triggers Perplexity discovery if not found
 */
export const discoveryService = {
  /**
   * Search for models with auto-discovery
   * Searches database first, triggers Perplexity if not found
   * 
   * @param modelNumber Model number to search for (e.g., "19XR")
   * @param oem Optional OEM name (e.g., "Carrier")
   */
  async search(modelNumber: string, oem?: string): Promise<DiscoverySearchResult> {
    try {
      const params: any = { model: modelNumber };
      if (oem) params.oem = oem;

      console.log('📞 Calling discovery API with params:', params);

      // Use extended timeout for discovery (5 minutes) since processing can take 30-60+ seconds
      // Note: api.get() already returns response.data, so we don't need to unwrap again
      const data = await api.get<DiscoverySearchResult>('/discovery/search', { 
        params,
        timeout: 300000, // 5 minutes
      });
      
      console.log('📥 Discovery API data received:', data);
      
      if (!data) {
        throw new Error('Empty response from discovery API');
      }
      
      return data;
    } catch (error: any) {
      console.error('❌ Discovery service error:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        response: error?.response,
        request: error?.request,
      });
      throw error;
    }
  },

  /**
   * Force discovery of a specific manual (bypasses database check)
   * 
   * @param oem OEM name (e.g., "Carrier")
   * @param modelNumber Model number (e.g., "19XR")
   */
  async discover(oem: string, modelNumber: string): Promise<DiscoverySearchResult> {
    // api.post() already returns response.data
    return await api.post<DiscoverySearchResult>('/discovery/manual', {
      oem,
      modelNumber,
    });
  },

  /**
   * Get processing status for a manual
   * 
   * @param manualId Manual ID
   */
  async getStatus(manualId: string) {
    // api.get() already returns response.data
    return await api.get(`/discovery/status/${manualId}`);
  },
};
