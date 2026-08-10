import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LegacyDashboard } from './legacy/LegacyDashboard';
import { RewrittenDashboard } from './rewrite/RewrittenDashboard';
import { PerfHud } from './components/PerfHud';

type Mode = 'legacy' | 'rewritten';
type Tab = 'overview' | 'accounts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The data on this screen is fine for a minute. Anything that changes it
      // goes through an invalidation, so correctness does not depend on the
      // clock running out.
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  const [mode, setMode] = useState<Mode>('legacy');
  const [tab, setTab] = useState<Tab>('overview');
  const [run, setRun] = useState(0);

  const coldReload = () => {
    // A cold load means an empty cache, so clear it for both modes.
    queryClient.clear();
    setRun((n) => n + 1);
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    queryClient.clear();
    setMode(next);
    setRun((n) => n + 1);
  };

  const switchTab = (next: Tab) => {
    if (next === tab) return;
    setTab(next);
    setRun((n) => n + 1);
  };

  const runKey = `${mode}-${tab}-${run}`;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <span>Customer dashboard</span>
          </div>

          <div className="switch" role="group" aria-label="Data-fetching mode">
            <button className="switch-btn" data-active={mode === 'legacy'} onClick={() => switchMode('legacy')}>
              Before
            </button>
            <button className="switch-btn" data-active={mode === 'rewritten'} onClick={() => switchMode('rewritten')}>
              After
            </button>
          </div>
        </header>

        <div className="subbar">
          <nav className="tabs" aria-label="Sections">
            <button className="tab" data-active={tab === 'overview'} onClick={() => switchTab('overview')}>
              Overview
            </button>
            <button className="tab" data-active={tab === 'accounts'} onClick={() => switchTab('accounts')}>
              Accounts
            </button>
          </nav>
          <button className="reload" onClick={coldReload}>
            Cold reload
          </button>
        </div>

        <PerfHud runKey={runKey} />

        <p className="explain">
          {mode === 'legacy' ? (
            <>
              No shared cache. /metrics is requested twice because two panels want it and neither knows about
              the other, and the orders panel cannot ask for account details until orders have arrived, so those
              two waits add up. Switching tabs throws it all away.{' '}
              <strong>Try Overview → Accounts → Overview and watch the call count.</strong>
            </>
          ) : (
            <>
              One shared query layer. Panels asking for the same data share a key, so it is fetched once, and
              everything starts together instead of queueing.{' '}
              <strong>Switch tabs and back: the second visit is served from cache and costs nothing.</strong>
            </>
          )}
        </p>

        <main>
          {mode === 'legacy' ? (
            // Remounted on every run, which is exactly what threw the data away.
            <LegacyDashboard key={runKey} tab={tab} />
          ) : (
            <RewrittenDashboard tab={tab} />
          )}
        </main>

        <footer className="foot">
          <p>
            Latency is simulated in <code>src/api/mockApi.ts</code>. Both modes call the same API through the
            same function, so the counter above is a like-for-like comparison. Cold reload clears the cache so
            neither mode starts with an advantage.
          </p>
        </footer>
      </div>
    </QueryClientProvider>
  );
}
