import { apiClient } from '../client';
import { Result, ok, err } from '../../../utils/result';
import {
  LuxuryItem,
  CreateLuxuryItemParams,
  UpdateLuxuryItemParams,
  MarkLuxuryPurchasedParams,
  MarkLuxuryCancelledParams,
} from '../../../types';

export async function fetchLuxuryItems(): Promise<Result<LuxuryItem[], string>> {
  try {
    const response = await apiClient<{ data: LuxuryItem[] }>('/luxuries');
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to fetch luxury items');
  }
}

export async function createLuxuryItem(params: CreateLuxuryItemParams): Promise<Result<LuxuryItem, string>> {
  try {
    const response = await apiClient<{ data: LuxuryItem }>('/luxuries', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to create luxury item');
  }
}

export async function updateLuxuryItem(id: string, params: UpdateLuxuryItemParams): Promise<Result<LuxuryItem, string>> {
  try {
    const response = await apiClient<{ data: LuxuryItem }>(`/luxuries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to update luxury item');
  }
}

export async function markLuxuryPurchased(id: string, params: MarkLuxuryPurchasedParams): Promise<Result<LuxuryItem, string>> {
  try {
    const response = await apiClient<{ data: LuxuryItem }>(`/luxuries/${id}/purchase`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to complete luxury purchase');
  }
}

export async function markLuxuryCancelled(id: string, params: MarkLuxuryCancelledParams): Promise<Result<LuxuryItem, string>> {
  try {
    const response = await apiClient<{ data: LuxuryItem }>(`/luxuries/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to cancel luxury item');
  }
}

export async function deleteLuxuryItem(id: string): Promise<Result<void, string>> {
  try {
    await apiClient<{ message: string }>(`/luxuries/${id}`, {
      method: 'DELETE',
    });
    return ok(undefined);
  } catch (error: any) {
    return err(error.message || 'Failed to delete luxury item');
  }
}
