import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { CreditProvider } from './context/CreditContext.jsx';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './theme/ThemeContext.jsx';
import { FirebaseProvider } from './providers/FirebaseProvider.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { TenantProvider } from './context/TenantContext.jsx';
import { AnalyticsProvider } from './context/AnalyticsContext.jsx';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FirebaseProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <TenantProvider>
              <AnalyticsProvider>
                <NotificationProvider>
                  <CreditProvider>
                    <ThemeProvider>
                      <App />
                      <Toaster position="top-right" />
                    </ThemeProvider>
                  </CreditProvider>
                </NotificationProvider>
              </AnalyticsProvider>
            </TenantProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </FirebaseProvider>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.info('[ServiceWorker] Registered', registration.scope);
      })
      .catch((error) => {
        console.error('[ServiceWorker] Registration failed', error);
      });
  });
}
