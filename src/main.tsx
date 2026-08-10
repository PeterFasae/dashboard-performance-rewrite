import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

/*
 * Deliberately not wrapped in <StrictMode>.
 *
 * StrictMode intentionally mounts, unmounts and remounts every component in
 * development, which fires each effect twice. This app exists to count network
 * requests, and that double-invocation doubles the count for the legacy mode
 * only, because the legacy mode fetches from an effect. The comparison would
 * be measuring a React development behaviour instead of the pattern.
 */
createRoot(document.getElementById('root')!).render(<App />);
