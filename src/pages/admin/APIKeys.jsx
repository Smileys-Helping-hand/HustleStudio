import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { db } from '../../lib/firebase.js';
import { encryptField, hashField } from '../../lib/encryption.js';

const scopesOptions = [
  { value: 'crm', label: 'CRM' },
  { value: 'finance', label: 'Finance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'analytics', label: 'Analytics' },
];

const newKeyId = () => {
  const base = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return base.replace(/-/g, '').slice(0, 40);
};

export default function APIKeys() {
  const { activeTenantId } = useTenant();
  const { role } = useAuth();
  const [keys, setKeys] = useState([]);
  const [label, setLabel] = useState('Integration Key');
  const [selectedScopes, setSelectedScopes] = useState(['crm']);
  const [loading, setLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');

  const canManage = useMemo(() => ['owner', 'admin'].includes(role?.toLowerCase?.() ?? role), [role]);

  useEffect(() => {
    if (!activeTenantId) return () => undefined;
    const ref = collection(db, `tenants/${activeTenantId}/apiKeys`);
    return onSnapshot(ref, (snapshot) => {
      setKeys(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            label: data.label ?? 'Integration Key',
            scopes: data.scopes ?? [],
            revoked: !!data.revoked,
            lastFour: data.lastFour ?? '',
            createdAt: data.createdAt,
          };
        })
      );
    });
  }, [activeTenantId]);

  const createKey = async () => {
    if (!activeTenantId) {
      toast.error('Select a tenant first.');
      return;
    }
    setLoading(true);
    try {
      const token = newKeyId();
      const encryptedToken = encryptField(token);
      const tokenHash = hashField(token);
      if (!encryptedToken || !tokenHash) {
        throw new Error('Encryption secret missing.');
      }
      await setDoc(doc(db, `tenants/${activeTenantId}/apiKeys`, tokenHash), {
        label: label || 'Integration Key',
        createdAt: serverTimestamp(),
        scopes: selectedScopes,
        revoked: false,
        encryptedToken,
        lastFour: token.slice(-4),
      });
      await addDoc(collection(db, `tenants/${activeTenantId}/apiKeyLedger`), {
        tokenHash,
        label,
        scopes: selectedScopes,
        createdAt: serverTimestamp(),
      });
      setGeneratedKey(token);
      toast.success('API key registered. Share it securely with your developer.');
    } catch (error) {
      console.error('[APIKeys] create failure', error);
      toast.error(error.message || 'Could not create API key');
    } finally {
      setLoading(false);
    }
  };

  const revokeKey = async (id) => {
    if (!activeTenantId) return;
    try {
      await deleteDoc(doc(db, `tenants/${activeTenantId}/apiKeys`, id));
      toast.success('API key revoked');
    } catch (error) {
      toast.error(error.message || 'Unable to revoke key');
    }
  };

  return (
    <div className="px-4 pb-16">
      <PageHeader
        title="API Keys"
        subtitle="Generate and revoke REST or GraphQL credentials for trusted integrations."
      />
      {generatedKey && (
        <div className="mb-6 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <p className="font-semibold">Copy your new API key now — it will not be shown again.</p>
          <code className="mt-2 block break-all text-emerald-200">{generatedKey}</code>
        </div>
      )}
      {!canManage ? (
        <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          You need administrator access to manage API keys.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold text-white">Create a new key</h2>
            <p className="mt-2 text-sm text-white/60">
              Choose the modules this integration can access. A new identifier will be generated automatically.
            </p>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-white" htmlFor="api-key-label">
                Label
              </label>
              <input
                id="api-key-label"
                className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-indigo-400"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Integration label"
              />
              <div>
                <p className="text-sm font-medium text-white">Scopes</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {scopesOptions.map((scope) => {
                    const selected = selectedScopes.includes(scope.value);
                    return (
                      <button
                        key={scope.value}
                        type="button"
                        onClick={() => {
                          setSelectedScopes((current) =>
                            selected ? current.filter((item) => item !== scope.value) : [...current, scope.value]
                          );
                        }}
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          selected
                            ? 'border-indigo-400 bg-indigo-500/20 text-white'
                            : 'border-white/10 bg-black/30 text-white/70 hover:border-white/20'
                        }`}
                      >
                        {scope.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={createKey}
                disabled={loading}
                className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(99,102,241,0.35)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Generating…' : 'Create API Key'}
              </button>
            </div>
          </section>
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold text-white">Active keys</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {keys.length === 0 && <li className="text-white/60">No keys generated yet.</li>}
              {keys.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/30 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-white">{item.label}</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">{item.scopes?.join(', ') || 'full'}</p>
                    {item.lastFour && (
                      <p className="text-xs text-white/40">Token: ••••{item.lastFour}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => revokeKey(item.id)}
                    className="inline-flex items-center justify-center rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200 transition hover:border-red-300"
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
