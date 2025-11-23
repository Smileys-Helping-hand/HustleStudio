import { collection, doc } from 'firebase/firestore';
import { db } from './firebase.js';
import { decryptField } from './encryption.js';

export const tenantCollection = (tenantId, ...segments) => {
  if (tenantId) {
    return collection(db, 'tenants', tenantId, ...segments);
  }
  return collection(db, ...segments);
};

export const tenantDoc = (tenantId, ...segments) => {
  if (tenantId) {
    return doc(db, 'tenants', tenantId, ...segments);
  }
  return doc(db, ...segments);
};

export const tenantPathSegments = (tenantId, segments) => {
  if (tenantId) {
    return ['tenants', tenantId, ...segments];
  }
  return segments;
};

export const decodeTenantData = (data = {}) => {
  const decoded = { ...data };
  if (!decoded.domain && decoded.domainEncrypted) {
    decoded.domain = decryptField(decoded.domainEncrypted) || '';
  }
  if (decoded.branding?.secret) {
    decoded.branding = {
      ...decoded.branding,
      secret: decryptField(decoded.branding.secret),
    };
  }
  return decoded;
};
