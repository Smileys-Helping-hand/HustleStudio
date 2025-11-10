import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import VersionFooter from './components/VersionFooter.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';
import IntroGate from './components/IntroGate.jsx';
import DiagnosticsOverlay from './components/DiagnosticsOverlay.jsx';
import { getBooleanEnv } from './lib/env.js';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Inventory = lazy(() => import('./pages/Inventory.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Team = lazy(() => import('./pages/Team.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Visuals = lazy(() => import('./pages/Visuals.jsx'));
const Monitor = lazy(() => import('./pages/Monitor.jsx'));
const Till = lazy(() => import('./pages/Till.jsx'));
const Tools = lazy(() => import('./pages/Tools/index.jsx'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage.jsx'));
const Projects = lazy(() => import('./pages/Projects.jsx'));
const Finance = lazy(() => import('./pages/Finance.jsx'));
const CRM = lazy(() => import('./pages/CRM.jsx'));
const CRMInvoices = lazy(() => import('./pages/CRM/Invoices.jsx'));
const AIHub = lazy(() => import('./pages/AIHub.jsx'));
const AIOrchestrator = lazy(() => import('./pages/ai/Orchestrator.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const Insights = lazy(() => import('./pages/Insights.jsx'));
const AdminTenants = lazy(() => import('./pages/admin/Tenants.jsx'));
const AccessRequests = lazy(() => import('./pages/admin/AccessRequests.jsx'));
const AdminBilling = lazy(() => import('./pages/admin/Billing.jsx'));
const AdminAPIKeys = lazy(() => import('./pages/admin/APIKeys.jsx'));
const AdminSecurity = lazy(() => import('./pages/admin/Security.jsx'));
const StrategyAssistant = lazy(() => import('./pages/ai/StrategyAssistant.jsx'));
const FinanceAssistant = lazy(() => import('./pages/ai/FinanceAssistant.jsx'));
const InventoryAssistant = lazy(() => import('./pages/ai/InventoryAssistant.jsx'));
const AssistantGeneral = lazy(() => import('./pages/ai/AssistantGeneral.jsx'));
const Hustles = lazy(() => import('./pages/Hustles.jsx'));
const MarketingLab = lazy(() => import('./pages/MarketingLab.jsx'));
const MarketingScheduler = lazy(() => import('./pages/MarketingScheduler.jsx'));
const MarketingAnalytics = lazy(() => import('./pages/MarketingAnalytics.jsx'));
const Leads = lazy(() => import('./pages/Leads.jsx'));
const GrowthCoach = lazy(() => import('./pages/ai/GrowthCoach.jsx'));
const MarketingTools = lazy(() => import('./pages/Tools/Marketing.jsx'));
const SchedulerTools = lazy(() => import('./pages/Tools/Scheduler.jsx'));
const Marketplace = lazy(() => import('./pages/Marketplace.jsx'));
const AppStore = lazy(() => import('./pages/AppStore.jsx'));
const AnalyticsCloud = lazy(() => import('./pages/AnalyticsCloud.jsx'));
const Forecasts = lazy(() => import('./pages/Forecasts.jsx'));
const CustomDashboards = lazy(() => import('./pages/CustomDashboards.jsx'));
const Affiliates = lazy(() => import('./pages/Affiliates.jsx'));
const PartnerDashboard = lazy(() => import('./pages/PartnerDashboard.jsx'));
const PartnerOnboard = lazy(() => import('./pages/Partners/Onboard.jsx'));
const AdminBranding = lazy(() => import('./pages/admin/Branding.jsx'));
const AdminAppReviews = lazy(() => import('./pages/admin/AppReviews.jsx'));
const AdminTelemetry = lazy(() => import('./pages/admin/Telemetry.jsx'));
const AdminPrivacy = lazy(() => import('./pages/admin/Privacy.jsx'));
const AdminAIAudit = lazy(() => import('./pages/admin/AIAudit.jsx'));
const AdminAIMetrics = lazy(() => import('./pages/admin/AIMetrics.jsx'));
const AdminGlobalInsights = lazy(() => import('./pages/admin/GlobalInsights.jsx'));
const AdminBIReports = lazy(() => import('./pages/admin/BIReports.jsx'));
const FaultLookupPage = lazy(() => import('./pages/FaultLookupPage.jsx'));

const resolveBiReportsEnabled = () => getBooleanEnv('VITE_BI_REPORTS_ENABLED', true);

const ProtectedLayout = () => {
  const location = useLocation();
  return (
    <div className="flex min-h-screen flex-col bg-[var(--theme-background)] text-[var(--theme-text)] transition-colors duration-300">
      <Navbar />
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="min-h-full pt-28"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
        <div className="px-4 pb-10 sm:px-8">
          <VersionFooter />
        </div>
      </div>
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
  const biReportsEnabled = useMemo(resolveBiReportsEnabled, []);

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
              <Route path="projects" element={<Projects />} />
              <Route path="hustles" element={<Hustles />} />
              <Route path="finance" element={<Finance />} />
              <Route path="crm" element={<CRM />} />
              <Route path="crm/leads" element={<Leads />} />
              <Route path="crm/invoices" element={<CRMInvoices />} />
              <Route path="ai-hub" element={<AIHub />} />
              <Route path="ai">
                <Route path="strategy" element={<StrategyAssistant />} />
                <Route path="finance" element={<FinanceAssistant />} />
                <Route path="inventory" element={<InventoryAssistant />} />
                <Route path="assistant" element={<AssistantGeneral />} />
                <Route path="orchestrator" element={<AIOrchestrator />} />
                <Route path="growth-coach" element={<GrowthCoach />} />
              </Route>
              <Route path="inventory" element={<Inventory />} />
              <Route path="reports" element={<Reports />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="analytics/cloud" element={<AnalyticsCloud />} />
              <Route path="analytics/forecasts" element={<Forecasts />} />
              <Route path="insights" element={<Insights />} />
              <Route path="till" element={<Till />} />
              <Route path="marketing">
                <Route index element={<Navigate to="lab" replace />} />
                <Route path="lab" element={<MarketingLab />} />
                <Route path="scheduler" element={<MarketingScheduler />} />
                <Route path="analytics" element={<MarketingAnalytics />} />
              </Route>
              <Route path="marketplace" element={<Marketplace />} />
              <Route path="app-store" element={<AppStore />} />
              <Route path="affiliates" element={<Affiliates />} />
              <Route path="partners">
                <Route index element={<PartnerDashboard />} />
                <Route path="onboard" element={<PartnerOnboard />} />
              </Route>
              <Route path="dashboards/custom" element={<CustomDashboards />} />
              <Route path="tools" element={<Tools />} />
              <Route path="tools/marketing" element={<MarketingTools />} />
              <Route path="tools/scheduler" element={<SchedulerTools />} />
              <Route path="faults" element={<FaultLookupPage />} />
              <Route path="team" element={<Team />} />
              <Route path="settings" element={<Settings />} />
              <Route path="visuals" element={<Visuals />} />
              <Route path="monitor" element={<Monitor />} />
              <Route element={<ProtectedRoute roles={['owner', 'admin']} />}>
                <Route path="admin" element={<AdminPage />} />
                <Route path="admin/billing" element={<AdminBilling />} />
                <Route path="admin/tenants" element={<AdminTenants />} />
                <Route path="admin/access" element={<AccessRequests />} />
                <Route path="admin/branding" element={<AdminBranding />} />
                <Route path="admin/api-keys" element={<AdminAPIKeys />} />
                <Route path="admin/security" element={<AdminSecurity />} />
                <Route path="admin/app-reviews" element={<AdminAppReviews />} />
                <Route path="admin/telemetry" element={<AdminTelemetry />} />
                <Route path="admin/global-insights" element={<AdminGlobalInsights />} />
                <Route path="admin/ai-metrics" element={<AdminAIMetrics />} />
                <Route path="admin/ai-audit" element={<AdminAIAudit />} />
                <Route path="admin/privacy" element={<AdminPrivacy />} />
                {biReportsEnabled ? <Route path="admin/bi-reports" element={<AdminBIReports />} /> : null}
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
