import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'hs_seen_intro';

export default function IntroGate({ onEnter }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (seen) {
      setVisible(false);
    }
  }, []);

  const handleEnter = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    }
    setVisible(false);
    onEnter?.();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-center text-white z-50">
      <h1 className="text-3xl font-bold mb-3">Welcome back to Hustle Studio</h1>
      <p className="text-gray-400 mb-6">Your operations cockpit is ready.</p>
      <button
        type="button"
        onClick={handleEnter}
        className="bg-indigo-600 px-6 py-2 rounded-md hover:bg-indigo-700 transition-all"
      >
        Enter Studio
      </button>
    </div>
  );
}
