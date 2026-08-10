import type { ReactNode } from 'react';

export function Panel({
  title,
  children,
  loading,
  mode,
}: {
  title: string;
  children: ReactNode;
  loading: boolean;
  mode: 'legacy' | 'rewritten';
}) {
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>{title}</h2>
        {loading && <span className="panel-state">loading</span>}
      </header>
      {/*
        Legacy showed a centred spinner that collapsed the panel to nothing,
        so the page jumped as each one landed. The rewrite uses a skeleton
        shaped like the real content, which keeps the layout still.
      */}
      {loading ? (mode === 'legacy' ? <Spinner /> : <Skeleton />) : children}
    </section>
  );
}

function Spinner() {
  return (
    <div className="spinner-wrap">
      <div className="spinner" role="status" aria-label="Loading" />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="skeleton" aria-hidden="true">
      <span style={{ width: '72%' }} />
      <span style={{ width: '90%' }} />
      <span style={{ width: '61%' }} />
      <span style={{ width: '84%' }} />
    </div>
  );
}
