const stripPadding = (value) => value.replace(/=+$/u, '');

export function anonymizeTenant(identifier) {
  if (!identifier) {
    return 'anon';
  }
  try {
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      return stripPadding(window.btoa(identifier)).slice(0, 12);
    }
    if (typeof Buffer !== 'undefined') {
      return stripPadding(Buffer.from(String(identifier)).toString('base64')).slice(0, 12);
    }
  } catch (error) {
    console.warn('[Anonymizer] Unable to encode identifier.', error);
  }
  return 'anon';
}

export function anonymizeUser(userId) {
  return anonymizeTenant(userId);
}
