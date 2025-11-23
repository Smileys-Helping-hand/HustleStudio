import { execSync } from 'child_process';

const bucket = process.env.VITE_BACKUP_BUCKET;
const retentionDays = Number(process.env.VITE_BACKUP_RETENTION_DAYS || '7');

if (!bucket) {
  console.error('[Backup] VITE_BACKUP_BUCKET not configured.');
  process.exit(1);
}

const stamp = new Date().toISOString().split('T')[0];
const targetPath = `backups/${stamp}`;

try {
  console.log(`[Backup] Exporting Firestore → gs://${bucket}/${targetPath}`);
  execSync(`gcloud firestore export gs://${bucket}/${targetPath}`, { stdio: 'inherit' });

  console.log('[Backup] Cleaning old backups…');
  const listCommand = `gsutil ls gs://${bucket}/backups/`;
  const listings = execSync(listCommand, { stdio: ['ignore', 'pipe', 'pipe'] })
    .toString()
    .split('\n')
    .filter(Boolean)
    .sort();

  if (retentionDays > 0 && listings.length > retentionDays) {
    const toDelete = listings.slice(0, listings.length - retentionDays);
    for (const key of toDelete) {
      console.log(`[Backup] Removing ${key}`);
      execSync(`gsutil rm -r ${key}`, { stdio: 'inherit' });
    }
  }

  console.log('[Backup] Completed successfully.');
} catch (error) {
  console.error('[Backup] Failed:', error.message);
  process.exit(1);
}
