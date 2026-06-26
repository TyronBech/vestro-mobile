import { apiClient } from '../client';
import { Result, ok, err } from '../../../utils/result';
import {
  CoreNetworkType,
  CoreNetwork,
  CreateCoreNetworkParams,
  UpdateCoreNetworkParams,
} from '../../../types';

export {
  CoreNetworkType,
  CoreNetwork,
  CreateCoreNetworkParams,
  UpdateCoreNetworkParams,
} from '../../../types';

export async function fetchCoreNetworks(): Promise<Result<CoreNetwork[], string>> {
  try {
    const response = await apiClient<CoreNetwork[]>('/core-network');
    return ok(response);
  } catch (error: any) {
    return err(error.message || 'Failed to fetch core networks');
  }
}

export async function createCoreNetwork(
  params: CreateCoreNetworkParams
): Promise<Result<CoreNetwork, string>> {
  try {
    const response = await apiClient<CoreNetwork>('/core-network', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return ok(response);
  } catch (error: any) {
    return err(error.message || 'Failed to create core network node');
  }
}

export async function updateCoreNetwork(
  id: string,
  params: UpdateCoreNetworkParams
): Promise<Result<CoreNetwork, string>> {
  try {
    const response = await apiClient<CoreNetwork>(`/core-network/${id}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
    return ok(response);
  } catch (error: any) {
    return err(error.message || 'Failed to update core network node');
  }
}

export async function deleteCoreNetwork(id: string): Promise<Result<void, string>> {
  try {
    await apiClient<void>(`/core-network/${id}`, {
      method: 'DELETE',
    });
    return ok(undefined);
  } catch (error: any) {
    return err(error.message || 'Failed to delete core network node');
  }
}
