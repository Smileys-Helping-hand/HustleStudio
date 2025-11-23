import { spawnSync } from 'child_process';
import { logEvent as logTelemetryEvent } from '../src/lib/telemetryEngine.js';

const run = (command, args, options = {}) => {
  console.log(`[deploy] ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false, ...options });
  if (result.status !== 0) {
    throw new Error(`${command} failed with code ${result.status}`);
  }
};

const main = async () => {
  console.log('✅ Amplify deploy started...');
  const start = Date.now();
  try {
    run('npm', ['run', 'validate']);
    run('npm', ['run', 'build']);
    run('npm', ['run', 'qa']);
    console.log('✅ Build finished, collecting metrics...');
    run('amplify', ['publish', '--yes', '--invalidate-cloudfront']);
    console.log('[deploy] Amplify deployment complete.');
    await logTelemetryEvent('system', 'deploy', 'amplify_success', {
      durationMs: Date.now() - start,
    });
  } catch (error) {
    await logTelemetryEvent('system', 'deploy', 'amplify_failure', {
      error: error.message,
    });
    console.error('[deploy] Failed', error.message);
    process.exit(1);
  }
};

main();
