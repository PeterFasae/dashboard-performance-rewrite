/**
 * A stand-in for the real REST API.
 *
 * Latency is deliberate. The original endpoints sat behind a gateway and a
 * couple of joins, and the numbers below are in the range we actually saw:
 * roughly 260-420ms per call, with the customer endpoint the slowest.
 *
 * Every call goes through `request()`, which is what the instrumentation
 * panel counts. That is the whole point of the demo: the legacy mode and the
 * rewritten mode hit the same API, and the difference is how often.
 */

export type Metric = { label: string; value: string; delta: number };
export type Order = { id: string; customer: string; total: number; status: string };
export type Customer = { id: string; name: string; plan: string; mrr: number };
export type ActivityItem = { id: string; who: string; what: string; at: string };

/** Endpoint name -> how long it takes, in ms. */
const LATENCY: Record<string, number> = {
  '/metrics': 280,
  '/orders': 340,
  '/customers': 420,
  '/activity': 260,
};

export type ApiStats = { calls: number; inflight: number };

type Listener = (stats: ApiStats) => void;
const listeners = new Set<Listener>();
const stats: ApiStats = { calls: 0, inflight: 0 };

function emit() {
  listeners.forEach((fn) => fn({ ...stats }));
}

/**
 * The instrumentation panel subscribes here. `inflight` is what tells it the
 * screen has finished: when it drops back to zero, nothing else is coming.
 */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  fn({ ...stats });
  return () => {
    listeners.delete(fn);
  };
}

export function resetStats() {
  stats.calls = 0;
  emit();
}

async function request<T>(endpoint: string, payload: T): Promise<T> {
  stats.calls += 1;
  stats.inflight += 1;
  emit();
  try {
    await new Promise((resolve) => setTimeout(resolve, LATENCY[endpoint] ?? 300));
    return payload;
  } finally {
    stats.inflight -= 1;
    emit();
  }
}

export const api = {
  metrics: () =>
    request<Metric[]>('/metrics', [
      { label: 'Revenue', value: '£48,210', delta: 12.4 },
      { label: 'Active accounts', value: '1,284', delta: 3.1 },
      { label: 'Churn', value: '2.2%', delta: -0.6 },
      { label: 'Avg. order', value: '£37.55', delta: 5.8 },
    ]),

  orders: () =>
    request<Order[]>('/orders', [
      { id: 'ORD-4821', customer: 'Halcyon Ltd', total: 1240.0, status: 'Paid' },
      { id: 'ORD-4820', customer: 'Brightwell', total: 380.5, status: 'Paid' },
      { id: 'ORD-4819', customer: 'Norfolk & Co', total: 92.0, status: 'Pending' },
      { id: 'ORD-4818', customer: 'Ashgrove', total: 615.25, status: 'Paid' },
      { id: 'ORD-4817', customer: 'Pinewood', total: 148.75, status: 'Refunded' },
    ]),

  customers: () =>
    request<Customer[]>('/customers', [
      { id: 'C-118', name: 'Halcyon Ltd', plan: 'Scale', mrr: 480 },
      { id: 'C-117', name: 'Brightwell', plan: 'Team', mrr: 180 },
      { id: 'C-116', name: 'Norfolk & Co', plan: 'Team', mrr: 180 },
      { id: 'C-115', name: 'Ashgrove', plan: 'Scale', mrr: 480 },
    ]),

  activity: () =>
    request<ActivityItem[]>('/activity', [
      { id: 'a1', who: 'Dani', what: 'refunded ORD-4817', at: '09:41' },
      { id: 'a2', who: 'System', what: 'invoice INV-2231 settled', at: '09:12' },
      { id: 'a3', who: 'Sam', what: 'added a note to C-118', at: '08:55' },
      { id: 'a4', who: 'Dani', what: 'changed Brightwell to Team', at: '08:30' },
    ]),
};
