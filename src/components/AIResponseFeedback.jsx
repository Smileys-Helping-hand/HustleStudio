import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import PropTypes from 'prop-types';
import { db } from '../lib/firebase.js';

const AIResponseFeedback = ({ responseId, userId, tenantId }) => {
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleFeedback = async (value) => {
    if (submitting || !responseId) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'ai_feedback'), {
        responseId,
        userId: userId ?? 'unknown',
        tenantId: tenantId ?? 'unknown',
        feedback: value,
        createdAt: serverTimestamp(),
      });
      setStatus('Thanks for your feedback!');
    } catch (error) {
      console.error('[AI Feedback] Unable to record feedback.', error);
      setStatus('Unable to submit feedback right now.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!responseId) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/60">
      <button
        type="button"
        onClick={() => handleFeedback('helpful')}
        disabled={submitting}
        className="flex items-center gap-1 text-green-400 transition hover:text-green-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        👍 Helpful
      </button>
      <button
        type="button"
        onClick={() => handleFeedback('not_helpful')}
        disabled={submitting}
        className="flex items-center gap-1 text-rose-400 transition hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        👎 Not Helpful
      </button>
      {status && <span className="text-white/50">{status}</span>}
    </div>
  );
};

AIResponseFeedback.propTypes = {
  responseId: PropTypes.string,
  userId: PropTypes.string,
  tenantId: PropTypes.string,
};

AIResponseFeedback.defaultProps = {
  responseId: null,
  userId: 'unknown',
  tenantId: 'unknown',
};

export default AIResponseFeedback;
