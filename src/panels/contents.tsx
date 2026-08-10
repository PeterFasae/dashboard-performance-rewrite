import type { ActivityItem, Customer, Metric, Order } from '../api/mockApi';

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export function MetricsContent({ data }: { data: Metric[] }) {
  return (
    <ul className="metrics">
      {data.map((m) => (
        <li key={m.label}>
          <span className="metric-label">{m.label}</span>
          <strong className="metric-value">{m.value}</strong>
          <span className="metric-delta" data-up={m.delta >= 0}>
            {m.delta >= 0 ? '▲' : '▼'} {Math.abs(m.delta)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

export function OrdersContent({ data, onRefund }: { data: Order[]; onRefund?: () => void }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Order</th>
          <th>Customer</th>
          <th className="num">Total</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {data.map((o) => (
          <tr key={o.id}>
            <td className="mono">{o.id}</td>
            <td>{o.customer}</td>
            <td className="num">{money.format(o.total)}</td>
            <td>
              <span className="pill" data-status={o.status.toLowerCase()}>
                {o.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
      {onRefund && (
        <tfoot>
          <tr>
            <td colSpan={4}>
              <button className="write-btn" onClick={onRefund}>
                Refund the latest order
              </button>
              <span className="write-hint">
                Writes invalidate orders, metrics and activity together.
              </span>
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

export function CustomersContent({ data }: { data: Customer[] }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Account</th>
          <th>Plan</th>
          <th className="num">MRR</th>
        </tr>
      </thead>
      <tbody>
        {data.map((c) => (
          <tr key={c.id}>
            <td>{c.name}</td>
            <td>{c.plan}</td>
            <td className="num">{money.format(c.mrr)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ActivityContent({ data }: { data: ActivityItem[] }) {
  return (
    <ul className="activity">
      {data.map((a) => (
        <li key={a.id}>
          <span className="mono activity-time">{a.at}</span>
          <span>
            <strong>{a.who}</strong> {a.what}
          </span>
        </li>
      ))}
    </ul>
  );
}
