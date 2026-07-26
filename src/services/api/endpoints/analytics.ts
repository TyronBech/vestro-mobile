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
 * Fetch all budget configs for the user.
 */
export async function getBudgetConfigs(): Promise<Result<BudgetConfig[], string>> {
  try {
    const response = await apiClient<{ data: BudgetConfig[] }>('/budget');
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to fetch budget configs');
  }
}

/**
 * Fetch the primary/first budget config.
 */
export async function getBudgetConfig(): Promise<Result<BudgetConfig, string>> {
  try {
    const response = await apiClient<{ data: BudgetConfig }>('/budget/primary');
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to fetch budget config');
  }
}

/**
 * Updates the user's budget netSalary (primary config).
 */
export async function updateBudgetSalary(
  netSalary: number,
  needsRate: number,
  wantsRate: number,
  savingsRate: number,
  investmentsRate: number,
  idempotencyKey?: string
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
      headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined,
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to update baseline salary');
  }
}

/**
 * Create a new budget config.
 */
export async function createBudgetConfigApi(
  name: string,
  netSalary: number,
  needsRate: number,
  wantsRate: number,
  savingsRate: number,
  investmentsRate: number,
  cashAmount: number = 0
): Promise<Result<BudgetConfig, string>> {
  try {
    const response = await apiClient<{ data: BudgetConfig }>('/budget', {
      method: 'POST',
      body: JSON.stringify({
        name,
        netSalary,
        needsRate,
        wantsRate,
        savingsRate,
        investmentsRate,
        cashAmount,
      }),
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to create budget config');
  }
}

/**
 * Update a budget config by ID.
 */
export async function updateBudgetConfigByIdApi(
  id: string,
  data: {
    name?: string;
    netSalary?: number;
    needsRate?: number;
    wantsRate?: number;
    savingsRate?: number;
    investmentsRate?: number;
    cashAmount?: number;
  }
): Promise<Result<BudgetConfig, string>> {
  try {
    const response = await apiClient<{ data: BudgetConfig }>(`/budget/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to update budget config');
  }
}

/**
 * Delete a budget config by ID.
 */
export async function deleteBudgetConfigApi(id: string): Promise<Result<BudgetConfig, string>> {
  try {
    const response = await apiClient<{ data: BudgetConfig }>(`/budget/${id}`, {
      method: 'DELETE',
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to delete budget config');
  }
}
