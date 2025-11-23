import CryptoJS from 'crypto-js';

const resolveSecret = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENCRYPTION_SECRET) {
    return import.meta.env.VITE_ENCRYPTION_SECRET;
  }
  const globalProcess = typeof globalThis !== 'undefined' ? globalThis.process : undefined;
  if (globalProcess?.env?.VITE_ENCRYPTION_SECRET) {
    return globalProcess.env.VITE_ENCRYPTION_SECRET;
  }
  console.warn('[Encryption] Secret missing.');
  return '';
};

export function encryptField(value) {
  if (!value) return null;
  const secret = resolveSecret();
  if (!secret) return null;
  return CryptoJS.AES.encrypt(value, secret).toString();
}

export function decryptField(cipher) {
  if (!cipher) return null;
  const secret = resolveSecret();
  if (!secret) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, secret);
    return bytes.toString(CryptoJS.enc.Utf8) || null;
  } catch (error) {
    console.warn('[Encryption] Failed to decrypt field:', error.message);
    return null;
  }
}

export function hashField(value) {
  if (!value) return '';
  return CryptoJS.SHA256(value).toString(CryptoJS.enc.Hex);
}

export function maskSecret(value, visible = 4) {
  if (!value) return '';
  const length = value.length;
  if (length <= visible) return value;
  const hidden = Math.max(length - visible, 0);
  return `${'*'.repeat(hidden)}${value.slice(-visible)}`;
}
