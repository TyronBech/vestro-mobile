import { apiClient } from '../client';
import { Result, ok, err } from '../../../utils/result';

export interface ManualSweepParams {
  amount: number; // in cents
  coreNetworkId: string;
  notes?: string;
  sweptAt?: string; // ISO date string
}

/**
 * Record a manual sweep log entry.
 */
export async function recordManualSweep(params: ManualSweepParams): Promise<Result<any, string>> {
  try {
    const response = await apiClient<{ data: any }>('/sweep/manual', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to record manual sweep');
  }
}
