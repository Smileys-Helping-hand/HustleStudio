import { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { encryptField, decryptField } from '../../lib/encryption.js';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white outline-none focus:border-indigo-400';

const Privacy = () => {
  const [plaintext, setPlaintext] = useState('');
  const [cipher, setCipher] = useState('');
  const [result, setResult] = useState('');

  const handleEncrypt = () => {
    const encrypted = encryptField(plaintext);
    setCipher(encrypted || '');
    setResult('');
  };

  const handleDecrypt = () => {
    setResult(decryptField(cipher) || '');
  };

  return (
    <main className="space-y-8 bg-gradient-to-br from-[#101022] via-[#161633] to-[#1f1f3d] px-4 pb-16 pt-6 text-white sm:px-10">
      <PageHeader
        title="Privacy & Encryption Tools"
        subtitle="Verify encryption secrets, demonstrate field-level protection, and export compliance artifacts."
      />
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_30px_rgba(79,70,229,0.25)]">
          <h2 className="text-lg font-semibold">Encrypt sample text</h2>
          <textarea
            className={`${fieldClass} min-h-[120px]`}
            placeholder="Enter sensitive value"
            value={plaintext}
            onChange={(event) => setPlaintext(event.target.value)}
          />
          <button
            type="button"
            onClick={handleEncrypt}
            className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold"
          >
            Encrypt
          </button>
          {cipher && (
            <div className="space-y-2 text-xs text-white/70">
              <p className="font-semibold uppercase tracking-[0.3em] text-white/50">Ciphertext</p>
              <code className="block break-all rounded-xl bg-black/40 p-3 text-white/80">{cipher}</code>
            </div>
          )}
        </div>
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_30px_rgba(79,70,229,0.25)]">
          <h2 className="text-lg font-semibold">Decrypt sample ciphertext</h2>
          <textarea
            className={`${fieldClass} min-h-[120px]`}
            placeholder="Paste encrypted value"
            value={cipher}
            onChange={(event) => setCipher(event.target.value)}
          />
          <button
            type="button"
            onClick={handleDecrypt}
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/15"
          >
            Decrypt
          </button>
          {result && (
            <div className="space-y-2 text-xs text-white/70">
              <p className="font-semibold uppercase tracking-[0.3em] text-white/50">Result</p>
              <code className="block break-all rounded-xl bg-black/40 p-3 text-white/80">{result}</code>
            </div>
          )}
        </div>
      </section>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 shadow-[0_0_30px_rgba(79,70,229,0.25)]">
        <h2 className="text-lg font-semibold text-white">Compliance export</h2>
        <p className="mt-2 text-white/60">
          Request a full tenant export to comply with GDPR-style data portability. Use the Backup & Verify tasks to capture the
          latest snapshot before generating the package for your customer.
        </p>
        <ul className="mt-4 space-y-2 text-xs text-white/50">
          <li>1. Run <code className="rounded bg-black/40 px-2 py-1">npm run backup</code></li>
          <li>2. Run <code className="rounded bg-black/40 px-2 py-1">npm run verify:data</code></li>
          <li>3. Package the newest backup archive and deliver securely.</li>
        </ul>
      </section>
    </main>
  );
};

export default Privacy;
