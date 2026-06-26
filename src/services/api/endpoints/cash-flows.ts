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
