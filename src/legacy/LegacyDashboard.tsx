import { api, type Order } from '../api/mockApi';
import { Panel } from '../components/Panel';
import { ActivityContent, CustomersContent, MetricsContent, OrdersContent } from '../panels/contents';
import { useLegacyFetch } from './useLegacyFetch';

/**
 * Before.
 *
 * Two things are going on, and the second is the expensive one.
 *
 * 1. Duplication. The headline strip and the summary card both want
 *    /metrics and neither knows about the other, so it is fetched twice.
 *
 * 2. A waterfall. The orders table renders, and only then does its child
 *    mount and ask for the accounts it needs to label each row. The second
 *    request cannot start until the first has finished, so the two latencies
 *    add up rather than overlapping. This is what the network panel showed:
 *    requests queued behind each other rather than running together.
 *
 * Nothing here is cached, so a tab switch unmounts the lot and pays for all
 * of it again.
 */
export function LegacyDashboard({ tab }: { tab: 'overview' | 'accounts' }) {
  const metrics = useLegacyFetch(api.metrics);
  const activity = useLegacyFetch(api.activity);
  const customers = useLegacyFetch(api.customers);

  if (tab === 'accounts') {
    return (
      <div className="grid">
        <Panel title="Accounts" loading={customers.loading} mode="legacy">
          {customers.data && <CustomersContent data={customers.data} />}
        </Panel>
        <LegacySummary />
      </div>
    );
  }

  return (
    <div className="grid">
      <Panel title="This month" loading={metrics.loading} mode="legacy">
        {metrics.data && <MetricsContent data={metrics.data} />}
      </Panel>
      <LegacyOrders />
      <Panel title="Activity" loading={activity.loading} mode="legacy">
        {activity.data && <ActivityContent data={activity.data} />}
      </Panel>
      <LegacySummary />
    </div>
  );
}

/** Fetches orders, then mounts a child that fetches again. Two hops. */
function LegacyOrders() {
  const orders = useLegacyFetch(api.orders);

  return (
    <Panel title="Recent orders" loading={orders.loading} mode="legacy">
      {orders.data && <LegacyOrdersWithAccounts orders={orders.data} />}
    </Panel>
  );
}

function LegacyOrdersWithAccounts({ orders }: { orders: Order[] }) {
  // This component cannot exist until `orders` resolved, so this request is
  // strictly after that one. Latency adds instead of overlapping.
  const accounts = useLegacyFetch(api.customers);

  if (accounts.loading) {
    return <p className="inline-wait">Loading account details…</p>;
  }
  return <OrdersContent data={orders} />;
}

/** The duplicate. Same endpoint as the headline strip, separate request. */
function LegacySummary() {
  const summary = useLegacyFetch(api.metrics);
  return (
    <Panel title="Summary" loading={summary.loading} mode="legacy">
      {summary.data && <MetricsContent data={summary.data} />}
    </Panel>
  );
}
