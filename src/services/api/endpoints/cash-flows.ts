import { apiClient } from '../client';
import { Result, ok, err } from '../../../utils/result';

export interface CashFlow {
  id: string;
  userId: string;
  coreNetworkId: string;
  amount: number; // raw positive amount in cents
  type: 'INFLOW' | 'OUTFLOW';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  coreNetwork?: {
    id: string;
    name: string;
    balance: number;
  };
}

export async function fetchCashFlows(): Promise<Result<CashFlow[], string>> {
  try {
    const response = await apiClient<{ data: CashFlow[] }>('/cash-flows');
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to fetch cash flows');
  }
}
