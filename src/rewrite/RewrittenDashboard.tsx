import { Panel } from '../components/Panel';
import { ActivityContent, CustomersContent, MetricsContent, OrdersContent } from '../panels/contents';
import { useActivity, useCustomers, useInvalidateAfterWrite, useMetrics, useOrders } from './queries';

/**
 * After.
 *
 * Every panel declares what it needs at the top level, so the requests start
 * together rather than one after another. The summary card shares a key with
 * the headline strip, so between them they cost one request.
 *
 * The provider lives above this component and is not remounted on a tab
 * change, so coming back to a tab is served from cache.
 */
export function RewrittenDashboard({ tab }: { tab: 'overview' | 'accounts' }) {
  const metrics = useMetrics();
  const orders = useOrders();
  const activity = useActivity();
  const customers = useCustomers();
  const summary = useMetrics(); // same key as `metrics`, so it is deduplicated
  const invalidate = useInvalidateAfterWrite();

  if (tab === 'accounts') {
    return (
      <div className="grid">
        <Panel title="Accounts" loading={customers.isPending} mode="rewritten">
          {customers.data && <CustomersContent data={customers.data} />}
        </Panel>
        <Panel title="Summary" loading={summary.isPending} mode="rewritten">
          {summary.data && <MetricsContent data={summary.data} />}
        </Panel>
      </div>
    );
  }

  return (
    <div className="grid">
      <Panel title="This month" loading={metrics.isPending} mode="rewritten">
        {metrics.data && <MetricsContent data={metrics.data} />}
      </Panel>
      {/* Orders needs accounts to label its rows. Both are asked for up front,
          so the second does not wait on the first. */}
      <Panel title="Recent orders" loading={orders.isPending || customers.isPending} mode="rewritten">
        {orders.data && <OrdersContent data={orders.data} onRefund={invalidate} />}
      </Panel>
      <Panel title="Activity" loading={activity.isPending} mode="rewritten">
        {activity.data && <ActivityContent data={activity.data} />}
      </Panel>
      <Panel title="Summary" loading={summary.isPending} mode="rewritten">
        {summary.data && <MetricsContent data={summary.data} />}
      </Panel>
    </div>
  );
}
