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
 * What a write looks like. Refunding an order changes the order list, the
 * headline metrics and the activity feed, so all three are invalidated
 * together. Before the rewrite this was the stale-data bug class: the order
 * list updated and the metrics above it did not.
 */
export function useInvalidateAfterWrite() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: keys.orders });
    queryClient.invalidateQueries({ queryKey: keys.metrics });
    queryClient.invalidateQueries({ queryKey: keys.activity });
  };
}
