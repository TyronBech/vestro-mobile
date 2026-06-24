import { apiClient } from '../client';
import { Result, ok, err } from '../../../utils/result';

export interface MacroAsset {
  id: string;
  userId: string;
  bankName: string;
  purpose: string;
  balance: number; // in cents
  colorCode: string;
  iconUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchMacroAssets(): Promise<Result<MacroAsset[], string>> {
  try {
    const response = await apiClient<{ data: MacroAsset[] }>('/macro-assets');
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to fetch macro assets');
  }
}
