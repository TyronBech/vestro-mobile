import { apiClient } from '../client';
import { Result, ok, err } from '../../../utils/result';
import { CashFlow } from '../../../types';

export { CashFlow } from '../../../types';

export async function fetchCashFlows(): Promise<Result<CashFlow[], string>> {
  try {
    const response = await apiClient<{ data: CashFlow[] }>('/cash-flows');
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to fetch cash flows');
  }
}

export interface CreateCashFlowParams {
  coreNetworkId: string;
  amount: number; // in cents
  type: 'INFLOW' | 'OUTFLOW';
  notes?: string;
}

export async function createCashFlow(params: CreateCashFlowParams, idempotencyKey?: string): Promise<Result<CashFlow, string>> {
  try {
    const response = await apiClient<{ data: CashFlow }>('/cash-flows', {
      method: 'POST',
      body: JSON.stringify(params),
      headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined,
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to create cash flow');
  }
}
