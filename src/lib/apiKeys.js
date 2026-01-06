// API Key Management Utilities
import { collection, addDoc, getDocs, doc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';

/**
 * Generate a cryptographically secure API key
 * Format: hs_live_[32 random chars] or hs_test_[32 random chars]
 */
export function generateApiKey(environment = 'live') {
  const prefix = environment === 'test' ? 'hs_test_' : 'hs_live_';
  const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .substring(0, 32);
  return prefix + randomPart;
}

/**
 * Hash an API key for secure storage using Web Crypto API
 */
export async function hashApiKey(key) {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get the last 8 characters of a key for display (like GitHub)
 */
export function maskApiKey(key) {
  if (!key || key.length < 12) return '••••••••';
  return '•••••••• ' + key.slice(-8);
}

/**
 * API Key Scopes - what each key can access
 */
export const API_SCOPES = {
  'invoices:read': { label: 'Read Invoices', description: 'View invoice data' },
  'invoices:write': { label: 'Write Invoices', description: 'Create and update invoices' },
  'clients:read': { label: 'Read Clients', description: 'View client data' },
  'clients:write': { label: 'Write Clients', description: 'Create and update clients' },
  'health:read': { label: 'Read Business Health', description: 'View business metrics' },
  'projects:read': { label: 'Read Projects', description: 'View project data' },
  'projects:write': { label: 'Write Projects', description: 'Create and update projects' },
};

/**
 * Create a new API key in Firestore
 */
export async function createApiKey({ tenantId, name, scopes = [], environment = 'live' }) {
  if (!tenantId || !name) {
    throw new Error('Tenant ID and name are required');
  }

  const key = generateApiKey(environment);
  const hashedKey = await hashApiKey(key);
  
  const keyDoc = await addDoc(collection(db, 'api_keys'), {
    tenantId,
    name,
    hashedKey,
    keyPreview: maskApiKey(key),
    scopes,
    environment,
    createdAt: serverTimestamp(),
    lastUsed: null,
    usageCount: 0,
    isActive: true,
  });

  return {
    id: keyDoc.id,
    key, // Return the plain key ONCE, never stored
    hashedKey,
    keyPreview: maskApiKey(key),
  };
}

/**
 * Validate an API key and return tenant + scopes if valid
 */
export async function validateApiKey(key) {
  if (!key || !key.startsWith('hs_')) {
    return null;
  }

  const hashedKey = await hashApiKey(key);
  const q = query(
    collection(db, 'api_keys'),
    where('hashedKey', '==', hashedKey),
    where('isActive', '==', true)
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }

  const keyData = snapshot.docs[0].data();
  
  // Update last used timestamp (do this asynchronously, don't wait)
  const keyDocRef = doc(db, 'api_keys', snapshot.docs[0].id);
  import('./firebase.js').then(({ db }) => {
    import('firebase/firestore').then(({ updateDoc, serverTimestamp, increment }) => {
      updateDoc(keyDocRef, {
        lastUsed: serverTimestamp(),
        usageCount: increment(1),
      }).catch(err => console.error('[API] Failed to update key usage', err));
    });
  });

  return {
    tenantId: keyData.tenantId,
    scopes: keyData.scopes || [],
    environment: keyData.environment,
    keyId: snapshot.docs[0].id,
  };
}

/**
 * Check if a key has a specific scope
 */
export function hasScope(keyData, requiredScope) {
  if (!keyData || !keyData.scopes) return false;
  return keyData.scopes.includes(requiredScope);
}

/**
 * Revoke (deactivate) an API key
 */
export async function revokeApiKey(keyId) {
  const keyDocRef = doc(db, 'api_keys', keyId);
  const { updateDoc } = await import('firebase/firestore');
  await updateDoc(keyDocRef, {
    isActive: false,
    revokedAt: serverTimestamp(),
  });
}

/**
 * Delete an API key permanently
 */
export async function deleteApiKey(keyId) {
  const keyDocRef = doc(db, 'api_keys', keyId);
  await deleteDoc(keyDocRef);
}

/**
 * List all API keys for a tenant
 */
export async function listApiKeys(tenantId) {
  const q = query(
    collection(db, 'api_keys'),
    where('tenantId', '==', tenantId),
    where('isActive', '==', true)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}
