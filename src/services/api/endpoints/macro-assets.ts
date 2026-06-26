import { apiClient } from '../client';
import { Result, ok, err } from '../../../utils/result';
import { MacroAsset, CreateMacroAssetParams } from '../../../types';

export { MacroAsset, CreateMacroAssetParams } from '../../../types';

export async function fetchMacroAssets(): Promise<Result<MacroAsset[], string>> {
  try {
    const response = await apiClient<{ data: MacroAsset[] }>('/macro-assets');
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to fetch macro assets');
  }
}

export async function createMacroAsset(
  params: CreateMacroAssetParams
): Promise<Result<MacroAsset, string>> {
  try {
    const response = await apiClient<{ data: MacroAsset }>('/macro-assets', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to create macro asset');
  }
}
