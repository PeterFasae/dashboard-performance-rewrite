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
        The before mode shows a centred spinner and the after mode a skeleton
        shaped like the content. That is a visual difference between the two
        modes, separate from the fetching: it changes how loading looks, not
        what is requested or when.
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
