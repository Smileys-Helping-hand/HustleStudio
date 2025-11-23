import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { FiCheckCircle, FiLink } from 'react-icons/fi';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase.js';
import { useTenant } from '../../context/TenantContext.jsx';
import { useNotify } from '../../context/NotificationContext.jsx';
import { encryptField, maskSecret } from '../../lib/encryption.js';

const providers = [
  {
    key: 'instagram',
    label: 'Instagram',
    clientEnv: 'VITE_INSTAGRAM_CLIENT_ID',
    authorizeUrl: 'https://api.instagram.com/oauth/authorize',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    clientEnv: 'VITE_TIKTOK_CLIENT_ID',
    authorizeUrl: 'https://www.tiktok.com/v2/auth/authorize/',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    clientEnv: 'VITE_LINKEDIN_CLIENT_ID',
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
  },
];

const resolveEnv = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
    return import.meta.env[key];
  }
  const nodeEnv =
    typeof globalThis !== 'undefined' &&
    typeof globalThis.process === 'object' &&
    globalThis.process !== null &&
    typeof globalThis.process.env === 'object'
      ? globalThis.process.env
      : undefined;
  if (nodeEnv?.[key]) return nodeEnv[key];
  return '';
};

const SocialConnector = ({ tokens }) => {
  const { activeTenantId } = useTenant();
  const notify = useNotify();

  const tokenMap = useMemo(() => {
    const map = new Map();
    tokens?.forEach((token) => map.set(token.provider, token));
    return map;
  }, [tokens]);

  const beginOauth = async (provider) => {
    if (!activeTenantId) {
      notify({ type: 'warning', title: 'Select a workspace first' });
      return;
    }
    const clientId = resolveEnv(provider.clientEnv);
    if (!clientId) {
      notify({
        type: 'warning',
        title: 'Missing provider configuration',
        description: `Set ${provider.clientEnv} to enable ${provider.label} integration.`,
      });
      return;
    }

    const redirectUrl = `${window.location.origin}/oauth/${provider.key}/callback`;
    const url = new URL(provider.authorizeUrl);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'basic');

    window.open(url.toString(), '_blank', 'noopener');
    notify({
      type: 'info',
      title: `${provider.label} authorisation`,
      description: 'Complete the OAuth consent in the new tab, then paste the code below.',
    });
  };

  const storeToken = async (providerKey, token) => {
    if (!activeTenantId) return;
    const ref = doc(db, 'tenants', activeTenantId, 'socialTokens', providerKey);
    const encrypted = encryptField(token);
    if (!encrypted) {
      notify({ type: 'error', title: 'Encryption not configured' });
      return;
    }
    await setDoc(ref, {
      token: encrypted,
      lastFour: token.slice(-4),
      updatedAt: new Date().toISOString(),
    });
    notify({ type: 'success', title: `${providerKey} connected` });
  };

  return (
    <div className="space-y-4">
      {providers.map((provider) => {
        const activeToken = tokenMap.get(provider.key);
        return (
          <div
            key={provider.key}
            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-white">{provider.label}</p>
              <p className="text-xs text-white/60">
                {activeToken
                  ? 'Connected — tokens stored securely for auto-posting.'
                  : 'Connect to schedule and auto-publish campaigns.'}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => beginOauth(provider)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80 transition hover:border-indigo-400/60"
              >
                <FiLink />
                Connect
              </button>
              {activeToken ? (
                <div className="flex items-center gap-2 text-xs text-emerald-200">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 uppercase tracking-[0.3em]">
                    <FiCheckCircle /> Active
                  </span>
                  {activeToken.lastFour && <span>{`…${maskSecret(activeToken.lastFour, 4)}`}</span>}
                </div>
              ) : (
                <label className="flex items-center gap-2 text-xs text-white/60">
                  Token
                  <input
                    type="text"
                    placeholder="Paste token"
                    className="rounded-full border border-white/10 bg-black/50 px-3 py-1 text-xs text-white focus:border-indigo-400 focus:outline-none"
                    onBlur={(event) => event.target.value && storeToken(provider.key, event.target.value)}
                  />
                </label>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

SocialConnector.propTypes = {
  tokens: PropTypes.arrayOf(
    PropTypes.shape({
      provider: PropTypes.string.isRequired,
      lastFour: PropTypes.string,
      updatedAt: PropTypes.string,
    })
  ),
};

SocialConnector.defaultProps = {
  tokens: [],
};

export default SocialConnector;
