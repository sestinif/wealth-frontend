// Dev-only preview: renders real components with fixtures, no login needed.
// Open /preview.html?p=<key>. Not an entry of `vite build`, so it never ships.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import PageLayout from '../components/PageLayout';
import '../styles.css';
import '../mercury.css';

const Frame = ({ title, size, children }) => (
  <PageLayout title={title} username="federico" size={size}>{children}</PageLayout>
);

// Each entry renders one screen. Later tasks add to this map.
const PAGES = {
  frame: () => (
    <Frame title="Frame">
      <div className="page-head"><div className="page-head__title">Foundations</div></div>
      <div className="panel">
        <div className="panel__head"><div className="panel__title">Legacy panel on new tokens</div></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn--primary">Primary</button>
          <button className="btn btn--ghost">Ghost</button>
          <button className="btn btn--ghost active">Ghost active</button>
          <button className="btn btn--danger">Danger</button>
          <label className="toggle"><input type="checkbox" defaultChecked /><span className="toggle__slider" /></label>
        </div>
        <p style={{ marginTop: 16, color: 'var(--text-2)', fontSize: 13 }}>
          Gain <span style={{ color: 'var(--green)' }}>+€342.59</span> · loss <span style={{ color: 'var(--red)' }}>−€99.64</span> · 1234567890
        </p>
      </div>
    </Frame>
  ),
};

const key = new URLSearchParams(window.location.search).get('p') || 'frame';
const Page = PAGES[key] || (() => <pre style={{ color: '#EDEDF3', padding: 24 }}>Unknown page. Try: {Object.keys(PAGES).join(', ')}</pre>);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MemoryRouter initialEntries={['/diary']}>
      <ToastProvider><Page /></ToastProvider>
    </MemoryRouter>
  </React.StrictMode>,
);
