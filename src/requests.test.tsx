// @vitest-environment jsdom
import { StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

/*
 * These tests render the real App and drive it through the same buttons a
 * person would click. Timers are fake, so every simulated delay in
 * mockApi.ts elapses exactly, and the timings below are derived from those
 * delays rather than measured. What they pin is the shape of each mode: how
 * many requests, to which endpoints, and which ones wait for which.
 */

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type MockApi = typeof import('./api/mockApi');

let api: MockApi;
let root: Root;
let container: HTMLDivElement;

/** Fresh modules for every test, so the query cache and counters start empty. */
async function mount({ strict = false } = {}) {
  vi.resetModules();
  api = await import('./api/mockApi');
  const { default: App } = await import('./App');
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root.render(strict ? <StrictMode><App /></StrictMode> : <App />);
  });
  await settle();
}

/**
 * Long enough for any run to finish, including the HUD's 150ms grace period.
 *
 * Time moves in 5ms steps, each in its own act(), so React renders and runs
 * effects between timers the way it would in a browser. One big step would
 * hold every render until the end, and the waterfall's second request would
 * start two seconds late. Every simulated delay is a multiple of 5ms, so the
 * steps land exactly on them.
 */
async function settle(ms = 1_500) {
  for (let t = 0; t < ms; t += 5) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5);
    });
  }
}

async function click(label: string) {
  const button = [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
  if (!button) throw new Error(`No button labelled "${label}"`);
  api.clearRequestLog();
  await act(async () => {
    button.click();
  });
  await settle();
}

/** What the on-screen instrumentation strip shows for the current run. */
function hud() {
  const [time, calls, status] = [...container.querySelectorAll('.hud-value')].map((e) => e.textContent);
  return { time, calls, status };
}

function countsByEndpoint() {
  const counts: Record<string, number> = {};
  for (const r of api.requestLog()) counts[r.endpoint] = (counts[r.endpoint] ?? 0) + 1;
  return counts;
}

/** When the last request of the run finished, relative to when the first one started. */
function lastResponseAt() {
  const log = api.requestLog();
  const start = Math.min(...log.map((r) => r.startedAt));
  return Math.max(...log.map((r) => r.endedAt ?? Infinity)) - start;
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'],
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe('before: each panel fetches for itself', () => {
  test('a cold load of Overview makes six calls, two of them duplicates', async () => {
    await mount(); // the app opens in the before mode, on Overview, with nothing cached
    expect(countsByEndpoint()).toEqual({ '/metrics': 2, '/activity': 1, '/customers': 2, '/orders': 1 });
    expect(hud()).toMatchObject({ calls: '6', status: 'settled' });
  });

  test('the account lookup cannot start until orders arrive, so the two delays add up', async () => {
    await mount();
    const log = api.requestLog();
    const orders = log.find((r) => r.endpoint === '/orders')!;
    const customers = log.filter((r) => r.endpoint === '/customers');
    const waterfallHop = customers.find((r) => r.startedAt > 0)!;

    expect(waterfallHop.startedAt).toBe(orders.endedAt);
    expect(lastResponseAt()).toBe(api.LATENCY['/orders'] + api.LATENCY['/customers']);
    expect(hud().time).toBe('0.76s');
  });

  test('switching to Accounts throws the data away and makes four calls', async () => {
    await mount();
    await click('Accounts');
    expect(countsByEndpoint()).toEqual({ '/metrics': 2, '/activity': 1, '/customers': 1 });
    expect(hud()).toMatchObject({ calls: '4', time: '0.42s' });
  });

  test('coming back to Overview pays for all six again', async () => {
    await mount();
    await click('Accounts');
    await click('Overview');
    expect(hud()).toMatchObject({ calls: '6', time: '0.76s' });
  });

  test('a cold reload of Overview makes the same six calls', async () => {
    await mount();
    await click('Cold reload');
    expect(hud()).toMatchObject({ calls: '6', time: '0.76s' });
  });
});

describe('both modes fetch more than one tab needs', () => {
  test('a cold load of Accounts costs four calls in either mode', async () => {
    await mount();
    await click('Accounts');
    await click('Cold reload');
    expect(hud()).toMatchObject({ calls: '4' });

    await click('After');
    expect(countsByEndpoint()).toEqual({ '/metrics': 1, '/orders': 1, '/activity': 1, '/customers': 1 });
    expect(hud()).toMatchObject({ calls: '4' });
  });
});

describe('after: one shared query layer', () => {
  test('a cold load of Overview makes one call per endpoint, all started together', async () => {
    await mount();
    await click('After'); // switching mode clears the cache, so this is a cold load
    const log = api.requestLog();

    expect(countsByEndpoint()).toEqual({ '/metrics': 1, '/orders': 1, '/activity': 1, '/customers': 1 });
    expect(new Set(log.map((r) => r.startedAt)).size).toBe(1);
    expect(lastResponseAt()).toBe(Math.max(...Object.values(api.LATENCY)));
    expect(hud()).toMatchObject({ calls: '4', time: '0.42s' });
  });

  test('switching to Accounts and back makes no calls at all', async () => {
    await mount();
    await click('After');
    await click('Accounts');
    expect(api.requestLog()).toHaveLength(0);
    expect(hud()).toMatchObject({ calls: '0', time: '0.00s' });

    await click('Overview');
    expect(api.requestLog()).toHaveLength(0);
    expect(hud()).toMatchObject({ calls: '0', time: '0.00s' });
  });

  test('a cold reload empties the cache, so the four calls are paid again', async () => {
    await mount();
    await click('After');
    await click('Cold reload');
    expect(hud()).toMatchObject({ calls: '4', time: '0.42s' });
  });

  test('the simulated write refetches exactly the three queries it invalidates', async () => {
    await mount();
    await click('After');
    await click('Simulate a refund');
    expect(countsByEndpoint()).toEqual({ '/orders': 1, '/metrics': 1, '/activity': 1 });
  });
});

describe('why the app is not wrapped in StrictMode', () => {
  test('StrictMode doubles the requests the before mode makes, and not the after mode', async () => {
    await mount({ strict: true });
    expect(api.requestLog()).toHaveLength(12);

    await click('After');
    expect(api.requestLog()).toHaveLength(4);
  });
});
