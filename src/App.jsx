import { Suspense, lazy } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Inventory = lazy(() => import('./pages/Inventory.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Team = lazy(() => import('./pages/Team.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Candidates = lazy(() => import('./pages/Candidates.jsx'));
const CandidateProfile = lazy(() => import('./pages/CandidateProfile.jsx'));
const CVGenerator = lazy(() => import('./pages/CVGenerator.jsx'));
const RecruitmentAnalytics = lazy(() => import('./pages/admin/RecruitmentAnalytics.jsx'));
const CVManager = lazy(() => import('./pages/admin/CVManager.jsx'));
const SystemHealth = lazy(() => import('./pages/admin/SystemHealth.jsx'));

const ProtectedLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
};

const SuspenseFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white">
    <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-lg text-white/80 shadow-lg">
      Loading page...
    </div>
  </div>
);

const App = () => {
  const { user } = useAuth();

  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<ProtectedLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="candidates" element={<Candidates />} />
            <Route path="candidate/:id" element={<CandidateProfile />} />
            <Route path="cv-generator" element={<CVGenerator />} />
            <Route path="admin/recruitment-analytics" element={<RecruitmentAnalytics />} />
            <Route path="admin/cv-manager" element={<CVManager />} />
            <Route path="admin/system-health" element={<SystemHealth />} />
            <Route path="reports" element={<Reports />} />
            <Route path="team" element={<Team />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
