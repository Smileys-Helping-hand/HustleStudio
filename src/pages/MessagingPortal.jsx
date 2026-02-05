import React, { useState } from 'react';
import { FiMessageSquare, FiExternalLink, FiMaximize2, FiMinimize2, FiAlertCircle } from 'react-icons/fi';

export default function MessagingPortal() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLoginIssue, setShowLoginIssue] = useState(false);
  const messagingUrl = 'https://www.awehchat.co.za/';

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const openInNewWindow = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const newWindow = window.open(messagingUrl, '_blank', 'width=1200,height=800,toolbar=no,location=no,menubar=no');
    if (!newWindow) {
      alert('Please allow pop-ups for this site to open Aweh Chat in a new window');
    }
  };

  const openInNewTab = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const newTab = window.open(messagingUrl, '_blank');
    if (!newTab) {
      alert('Please allow pop-ups for this site to open Aweh Chat in a new tab');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              <FiMessageSquare className="text-2xl text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Business Messaging</h1>
              <p className="mt-1 text-sm text-white/60">
                Communication, Networking & Record Keeping
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openInNewWindow}
              className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300 transition hover:border-green-500/50 hover:bg-green-500/20 cursor-pointer"
            >
              <FiExternalLink className="text-base" />
              <span className="hidden sm:inline">Open in Window</span>
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10 cursor-pointer"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <>
                  <FiMinimize2 className="text-base" />
                  <span className="hidden sm:inline">Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <FiMaximize2 className="text-base" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={openInNewTab}
              className="flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-300 transition hover:border-indigo-500/50 hover:bg-indigo-500/20 cursor-pointer"
            >
              <FiExternalLink className="text-base" />
              <span className="hidden sm:inline">Open in New Tab</span>
            </button>
          </div>
        </div>
      </div>

      {/* Login Issue Alert */}
      <div className="mb-4 rounded-lg border border-indigo-500/40 bg-indigo-500/10 p-4">
        <div className="flex items-start gap-3">
          <FiAlertCircle className="mt-0.5 text-xl text-indigo-400" />
          <div className="flex-1">
            <h3 className="mb-1 text-sm font-semibold text-indigo-300">💡 Recommended: Open in New Tab or Window</h3>
            <p className="mb-3 text-xs text-indigo-200/80">
              Due to browser security restrictions, authentication works best when opened in a separate tab or window. Use the buttons above for the best experience.
            </p>
          </div>
        </div>
      </div>

      <div
        className={`relative overflow-hidden rounded-xl border border-white/10 bg-black/20 shadow-2xl transition-all duration-300 ${
          isFullscreen ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)]' : 'h-[calc(100vh-20rem)]'
        }`}
      >
        <iframe
          src={messagingUrl}
          title="Aweh Chat - Business Messaging Portal"
          className="h-full w-full"
          allow="camera; microphone; geolocation; notifications; clipboard-read; clipboard-write"
          loading="lazy"
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-400"></div>
            <h3 className="text-sm font-semibold text-white/90">Business Communication</h3>
          </div>
          <p className="text-xs text-white/60">
            Professional messaging for team collaboration and client communication
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-purple-400"></div>
            <h3 className="text-sm font-semibold text-white/90">Networking</h3>
          </div>
          <p className="text-xs text-white/60">
            Connect with partners, clients, and industry professionals
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-green-500/10 to-green-600/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-400"></div>
            <h3 className="text-sm font-semibold text-white/90">Internal Chat</h3>
          </div>
          <p className="text-xs text-white/60">
            Secure internal messaging for your team members
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-orange-400"></div>
            <h3 className="text-sm font-semibold text-white/90">Record Keeping</h3>
          </div>
          <p className="text-xs text-white/60">
            Automatic archiving and searchable conversation history
          </p>
        </div>
      </div>
    </div>
  );
}
