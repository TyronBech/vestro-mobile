import { apiClient } from '../client';
import { Result, ok, err } from '../../../utils/result';
import {
  BudgetConfig,
  AnalyticsData
} from '../../../types';

/**
 * Fetch consolidated analytics telemetry.
 */
export async function fetchAnalyticsData(): Promise<Result<AnalyticsData, string>> {
  try {
    const response = await apiClient<{ data: AnalyticsData }>('/analytics');
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to fetch analytics data');
  }
}

/**
 * Fetch the user's active budget config.
 */
export async function getBudgetConfig(): Promise<Result<BudgetConfig, string>> {
  try {
    const response = await apiClient<{ data: BudgetConfig }>('/budget');
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to fetch budget config');
  }
}

/**
 * Updates the user's budget netSalary.
 */
export async function updateBudgetSalary(
  netSalary: number,
  needsRate: number,
  wantsRate: number,
  savingsRate: number,
  investmentsRate: number
): Promise<Result<BudgetConfig, string>> {
  try {
    const response = await apiClient<{ data: BudgetConfig }>('/budget', {
      method: 'PUT',
      body: JSON.stringify({
        netSalary,
        needsRate,
        wantsRate,
        savingsRate,
        investmentsRate,
        cashAmount: 0, // default/placeholder cash amount
      }),
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to update baseline salary');
  }
}
