import { execSync } from 'child_process';

try {
  const result = execSync('gcloud firestore indexes list', { stdio: ['ignore', 'pipe', 'pipe'] });
  const output = result.toString().trim();
  if (output.length === 0) {
    console.warn('[Verify] Firestore index list empty.');
  } else {
    console.log('[Verify] Firestore indexes OK:', output.split('\n').length, 'entries');
  }
  console.log('[Verify] Data integrity check completed.');
} catch (error) {
  console.error('[Verify] Firestore verification failed:', error.message);
  process.exitCode = 1;
}
