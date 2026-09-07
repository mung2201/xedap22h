import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/app';
import { AppProviders } from './app/providers';
import './styles/global.css';
import './styles/storefront.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);
