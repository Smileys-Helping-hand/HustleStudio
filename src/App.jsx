import { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';
import IntroGate from './components/IntroGate.jsx';
import DiagnosticsOverlay from './components/DiagnosticsOverlay.jsx';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Inventory = lazy(() => import('./pages/Inventory.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Team = lazy(() => import('./pages/Team.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Visuals = lazy(() => import('./pages/Visuals.jsx'));
const Monitor = lazy(() => import('./pages/Monitor.jsx'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage.jsx'));

const ProtectedLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--theme-background)] text-[var(--theme-text)] transition-colors duration-300">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
};

const SuspenseFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-[var(--theme-background)] text-[var(--theme-text)]">
    <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-lg text-white/80 shadow-lg">
      Loading page...
    </div>
  </div>
);

const App = () => {
  const { user, offlineMode } = useAuth();
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = window.localStorage.getItem('hs_seen_intro');
    if (seen) {
      setIntroComplete(true);
    }
  }, []);

  return (
    <>
      {!introComplete && <IntroGate onEnter={() => setIntroComplete(true)} />}
      <Suspense fallback={<SuspenseFallback />}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<ProtectedLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="reports" element={<Reports />} />
              <Route path="team" element={<Team />} />
              <Route path="settings" element={<Settings />} />
              <Route path="visuals" element={<Visuals />} />
              <Route path="monitor" element={<Monitor />} />
              <Route element={<ProtectedRoute roles={['admin']} />}>
                <Route path="admin" element={<AdminPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
      {offlineMode && (
        <div className="fixed bottom-6 left-1/2 z-50 w-[90%] max-w-xl -translate-x-1/2 rounded-full border border-yellow-600/40 bg-yellow-500/10 px-6 py-3 text-center text-sm text-yellow-200 shadow-lg backdrop-blur">
          Offline Mode Activated — displaying cached workspace data.
        </div>
      )}
      <DiagnosticsOverlay />
    </>
  );
};

export default App;
