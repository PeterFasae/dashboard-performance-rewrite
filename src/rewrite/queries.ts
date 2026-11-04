import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/mockApi';

/**
 * The shared query layer.
 *
 * Keys are declared in one place so two panels asking for the same data get
 * one request and one cache entry. Anything that writes invalidates by key,
 * so the UI updates itself rather than waiting to be told.
 */
export const keys = {
  metrics: ['metrics'] as const,
  orders: ['orders'] as const,
  customers: ['customers'] as const,
  activity: ['activity'] as const,
};

export const useMetrics = () => useQuery({ queryKey: keys.metrics, queryFn: api.metrics });
export const useOrders = () => useQuery({ queryKey: keys.orders, queryFn: api.orders });
export const useCustomers = () => useQuery({ queryKey: keys.customers, queryFn: api.customers });
export const useActivity = () => useQuery({ queryKey: keys.activity, queryFn: api.activity });

/**
 * What happens after a write. Refunding an order would change the order list,
 * the headline metrics and the activity feed, so all three are invalidated
 * together and refetch. With per-panel fetching nothing connects those panels,
 * which is how a list ends up updated while the totals above it are stale.
 *
 * The demo sends no write and its data never changes; this shows only the
 * invalidation and the three refetches it causes.
 */
export function useInvalidateAfterWrite() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: keys.orders });
    queryClient.invalidateQueries({ queryKey: keys.metrics });
    queryClient.invalidateQueries({ queryKey: keys.activity });
  };
}
