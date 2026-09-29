import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';
import { applyTheme, initialTheme } from './theme';
import './styles/tokens.css';
import './styles/components.css';

// Apply the persisted / preferred theme before first paint (no animation).
applyTheme(initialTheme(), false);

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
