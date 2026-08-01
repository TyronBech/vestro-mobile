import { useState, useCallback, useEffect } from 'react';
import {
  LuxuryItem,
  CreateLuxuryItemParams,
  UpdateLuxuryItemParams,
  MarkLuxuryPurchasedParams,
  MarkLuxuryCancelledParams,
} from '../types';
import {
  fetchLuxuryItems,
  createLuxuryItem as apiCreateLuxuryItem,
  updateLuxuryItem as apiUpdateLuxuryItem,
  markLuxuryPurchased as apiMarkLuxuryPurchased,
  markLuxuryCancelled as apiMarkLuxuryCancelled,
  deleteLuxuryItem as apiDeleteLuxuryItem,
} from '../services/api/endpoints/luxuries';

export function useLuxuryItems() {
  const [items, setItems] = useState<LuxuryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchLuxuryItems();
    if (result.ok) {
      setItems(result.value);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const addItem = async (params: CreateLuxuryItemParams): Promise<boolean> => {
    const result = await apiCreateLuxuryItem(params);
    if (result.ok) {
      setItems((prev) => [result.value, ...prev]);
      return true;
    } else {
      setError(result.error);
      return false;
    }
  };

  const updateItem = async (id: string, params: UpdateLuxuryItemParams): Promise<boolean> => {
    const result = await apiUpdateLuxuryItem(id, params);
    if (result.ok) {
      setItems((prev) => prev.map((item) => (item.id === id ? result.value : item)));
      return true;
    } else {
      setError(result.error);
      return false;
    }
  };

  const markPurchased = async (id: string, params: MarkLuxuryPurchasedParams): Promise<{ success: boolean; error?: string }> => {
    const result = await apiMarkLuxuryPurchased(id, params);
    if (result.ok) {
      setItems((prev) => prev.map((item) => (item.id === id ? result.value : item)));
      return { success: true };
    } else {
      return { success: false, error: result.error };
    }
  };

  const markCancelled = async (id: string, params: MarkLuxuryCancelledParams): Promise<{ success: boolean; error?: string }> => {
    const result = await apiMarkLuxuryCancelled(id, params);
    if (result.ok) {
      setItems((prev) => prev.map((item) => (item.id === id ? result.value : item)));
      return { success: true };
    } else {
      return { success: false, error: result.error };
    }
  };

  const removeItem = async (id: string): Promise<boolean> => {
    const result = await apiDeleteLuxuryItem(id);
    if (result.ok) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      return true;
    } else {
      setError(result.error);
      return false;
    }
  };

  // Metric Computations
  const activeWishlistItems = items.filter((item) => item.status === 'WISHLIST' || item.status === 'SAVING');
  const purchasedItems = items.filter((item) => item.status === 'PURCHASED');
  const cancelledItems = items.filter((item) => item.status === 'CANCELLED');

  const totalWishlistCents = activeWishlistItems.reduce((sum, item) => sum + item.priceCents, 0);
  const totalPurchasedCents = purchasedItems.reduce((sum, item) => sum + item.priceCents, 0);
  const totalMoneySavedCents = cancelledItems.reduce((sum, item) => sum + item.priceCents, 0);

  return {
    items,
    activeWishlistItems,
    purchasedItems,
    cancelledItems,
    loading,
    error,
    refresh: loadItems,
    addItem,
    updateItem,
    markPurchased,
    markCancelled,
    removeItem,
    metrics: {
      totalWishlistCents,
      totalPurchasedCents,
      totalMoneySavedCents,
      wishlistCount: activeWishlistItems.length,
      purchasedCount: purchasedItems.length,
      cancelledCount: cancelledItems.length,
    },
  };
}
