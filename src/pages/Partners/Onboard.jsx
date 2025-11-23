import { useMemo } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';

export default function PartnerOnboard() {
  const partnerUrl = useMemo(() => {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PARTNER_ONBOARD_URL) {
      return import.meta.env.VITE_PARTNER_ONBOARD_URL;
    }
    if (typeof globalThis !== 'undefined' && globalThis.process?.env?.VITE_PARTNER_ONBOARD_URL) {
      return globalThis.process.env.VITE_PARTNER_ONBOARD_URL;
    }
    return 'https://partners.hustlestudio.co.za';
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-16">
      <PageHeader
        title="Partner Onboarding"
        subtitle="Welcome resellers and affiliates into the Hustle Studio ecosystem with a guided setup experience."
      />

      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-sm text-white/70 shadow-[0_0_25px_rgba(99,102,241,0.15)]">
        <p className="mb-4">
          Share the onboarding portal with your prospective partners. They will verify their business, connect payout
          details, and receive a tailored affiliate dashboard instantly.
        </p>
        <a
          href={partnerUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_25px_rgba(99,102,241,0.35)] transition hover:bg-indigo-400"
        >
          Open partner portal
        </a>
      </div>
    </div>
  );
}
