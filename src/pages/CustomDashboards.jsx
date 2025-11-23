import { useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import WidgetBuilder from '../components/dashboard/WidgetBuilder.jsx';
import { tenantCollection } from '../lib/tenant.js';
import { addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { useTenant } from '../context/TenantContext.jsx';
import toast from 'react-hot-toast';

export default function CustomDashboards() {
  const { activeTenantId } = useTenant();
  const [widgets, setWidgets] = useState([]);

  useEffect(() => {
    if (!activeTenantId) return;
    getDocs(tenantCollection(activeTenantId, 'customDashboards'))
      .then((snap) => {
        const latest = snap.docs[0]?.data();
        if (latest?.widgets) {
          setWidgets(latest.widgets);
        }
      })
      .catch((error) => console.error('Unable to load custom dashboard', error));
  }, [activeTenantId]);

  const handleSave = async () => {
    if (!activeTenantId) {
      toast.error('Select a workspace first.');
      return;
    }
    try {
      await addDoc(tenantCollection(activeTenantId, 'customDashboards'), {
        widgets,
        savedAt: serverTimestamp(),
      });
      toast.success('Dashboard layout saved.');
    } catch (error) {
      console.error(error);
      toast.error('Unable to save layout.');
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-12">
      <PageHeader
        title="Custom Dashboards"
        subtitle="Assemble the analytics that matter most to your business."
        actions={[{ label: 'Save Layout', onClick: handleSave }]}
      />
      <WidgetBuilder value={widgets} onChange={setWidgets} />
    </main>
  );
}
