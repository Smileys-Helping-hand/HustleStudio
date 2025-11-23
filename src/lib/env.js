const hasProcessEnv = () =>
  typeof globalThis !== 'undefined' &&
  typeof globalThis.process === 'object' &&
  globalThis.process !== null &&
  typeof globalThis.process.env === 'object';

const getRawEnv = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && key in import.meta.env) {
    return import.meta.env[key];
  }
  if (hasProcessEnv()) {
    if (key in globalThis.process.env) {
      return globalThis.process.env[key];
    }
    const serverKey = key.replace(/^VITE_/, '');
    if (serverKey in globalThis.process.env) {
      return globalThis.process.env[serverKey];
    }
  }
  return undefined;
};

export const getBooleanEnv = (key, fallback = false) => {
  const raw = getRawEnv(key);
  if (raw === undefined || raw === null || raw === '') {
    return Boolean(fallback);
  }
  const normalised = String(raw).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalised)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalised)) {
    return false;
  }
  return Boolean(fallback);
};

export const getEnvValue = (key, fallback) => {
  const raw = getRawEnv(key);
  if (raw === undefined || raw === null || raw === '') {
    return fallback;
  }
  return raw;
};
