import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { initializeData, isAuthenticated } from './data/dataService.js'

const root = createRoot(document.getElementById('root'));

async function start() {
  try {
    if (!isAuthenticated()) {
      const { default: LoginPage } = await import('./pages/LoginPage.jsx');
      root.render(<StrictMode><LoginPage onLogin={start} /></StrictMode>);
      return;
    }
    await initializeData();
    const { default: App } = await import('./App.jsx');
    root.render(<StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>);
  } catch (error) {
    root.render(<main style={{ padding: 32, fontFamily: 'system-ui' }}><h1>Cannot load church data</h1><p>Start the Django backend and verify VITE_API_BASE_URL.</p><pre>{error.message}</pre></main>);
  }
}

start();
