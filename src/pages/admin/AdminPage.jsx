import HeartbeatTimeline from '../../components/admin/HeartbeatTimeline.jsx';
import HeartbeatWidget from '../../components/admin/HeartbeatWidget.jsx';

const AdminPage = () => {
  return (
    <main className="space-y-8 p-6 text-white">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <HeartbeatWidget />
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <HeartbeatTimeline />
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          <h2 className="text-lg font-semibold text-white">Admin Notes</h2>
          <p className="mt-2 text-white/60">
            Connect your alerting or orchestration modules here. This placeholder preserves the existing
            admin layout while you wire production widgets.
          </p>
        </div>
      </section>

      <footer className="mt-12 text-center text-xs text-gray-400">
        System Status →{' '}
        <a href="/monitor" className="underline">
          /monitor
        </a>
      </footer>
    </main>
  );
};

export default AdminPage;
