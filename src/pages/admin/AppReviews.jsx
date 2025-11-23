import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader.jsx';
import { reviewAppSubmission } from '../../lib/appStoreClient.js';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase.js';
import { useTenant } from '../../context/TenantContext.jsx';

const fetchSubmissions = async () => {
  const snap = await getDocs(collection(db, 'appSubmissions'));
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export default function AppReviews() {
  const { activeMembership } = useTenant();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSubmissions()
      .then(setSubmissions)
      .catch((error) => console.error('Unable to load submissions', error));
  }, []);

  const handleReview = async (id, status) => {
    if (!activeMembership?.uid) {
      toast.error('Your user context is missing.');
      return;
    }
    setLoading(true);
    try {
      await reviewAppSubmission(id, status, activeMembership.uid);
      setSubmissions((items) =>
        items.map((item) => (item.id === id ? { ...item, status, reviewerId: activeMembership.uid } : item))
      );
      toast.success(`Submission marked as ${status}.`);
    } catch (error) {
      console.error(error);
      toast.error('Review action failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-10">
      <PageHeader title="App Store Reviews" subtitle="Approve community submissions before they go live." />
      <div className="space-y-4">
        {submissions.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            No submissions are awaiting review.
          </div>
        ) : (
          submissions.map((submission) => (
            <div
              key={submission.id}
              className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_0_25px_rgba(99,102,241,0.12)]"
            >
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold">{submission.name || submission.appId}</h3>
                <p className="text-sm text-white/60">{submission.description || 'No description provided.'}</p>
                <p className="text-xs uppercase tracking-[0.35em] text-indigo-300/80">
                  Status: {submission.status || 'pending-review'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleReview(submission.id, 'approved')}
                  className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleReview(submission.id, 'rejected')}
                  className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
