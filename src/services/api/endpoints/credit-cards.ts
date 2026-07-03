import { apiClient } from '../client';
import { Result, ok, err } from '../../../utils/result';
import {
  CreditCard,
  CreateCreditCardParams,
  UpdateCreditCardParams,
  CreditShieldStatus,
} from '../../../types';

export { CreditCard }

export async function fetchCreditCards(): Promise<Result<CreditCard[], string>> {
  try {
    const response = await apiClient<{ data: CreditCard[] }>('/credit-cards');
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to fetch credit cards');
  }
}

export async function createCreditCard(
  params: CreateCreditCardParams,
  idempotencyKey?: string
): Promise<Result<CreditCard, string>> {
  try {
    const response = await apiClient<{ data: CreditCard }>('/credit-cards', {
      method: 'POST',
      body: JSON.stringify(params),
      headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined,
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to create credit card');
  }
}

export async function updateCreditCard(
  id: string,
  params: UpdateCreditCardParams,
  idempotencyKey?: string
): Promise<Result<CreditCard, string>> {
  try {
    const response = await apiClient<{ data: CreditCard }>(`/credit-cards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
      headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined,
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to update credit card');
  }
}

export async function deleteCreditCard(id: string, idempotencyKey?: string): Promise<Result<boolean, string>> {
  try {
    await apiClient<{ data: { success: boolean } }>(`/credit-cards/${id}`, {
      method: 'DELETE',
      headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined,
    });
    return ok(true);
  } catch (error: any) {
    return err(error.message || 'Failed to delete credit card');
  }
}

export async function recordSpend(id: string, amount: number, idempotencyKey?: string): Promise<Result<CreditCard, string>> {
  try {
    const response = await apiClient<{ data: CreditCard }>(`/credit-cards/${id}/spend`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
      headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined,
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to record spend');
  }
}

export async function recordMidCyclePayment(
  id: string,
  amount: number,
  idempotencyKey?: string
): Promise<Result<CreditCard, string>> {
  try {
    const response = await apiClient<{ data: CreditCard }>(
      `/credit-cards/${id}/mid-cycle-payment`,
      {
        method: 'POST',
        body: JSON.stringify({ amount }),
        headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined,
      }
    );
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to record payment');
  }
}

export async function resetCreditCard(id: string, idempotencyKey?: string): Promise<Result<CreditCard, string>> {
  try {
    const response = await apiClient<{ data: CreditCard }>(`/credit-cards/${id}/reset`, {
      method: 'POST',
      headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined,
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to reset credit card');
  }
}

export async function fetchCreditShieldStatus(): Promise<Result<CreditShieldStatus, string>> {
  try {
    const response = await apiClient<{ data: CreditShieldStatus }>('/credit-cards/shield-status');
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || 'Failed to fetch credit shield status');
  }
}
