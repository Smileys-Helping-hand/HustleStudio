import fetch from 'node-fetch';
import { logEvent as logTelemetryEvent } from '../src/lib/telemetryEngine.js';

const target = process.env.VITE_APP_URL || 'https://app.hustlestudio.io';
const healthEndpoint = `${target.replace(/\/$/, '')}/api/health`;

const run = async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(healthEndpoint, { signal: controller.signal });
    clearTimeout(timeout);
    if (response && response.ok) {
      console.log(`[Uptime ✅] ${target} OK ${response.status}`);
      await logTelemetryEvent('system', 'monitor', 'uptime_ok', {
        target,
        status: response.status,
      });
      return;
    }
    clearTimeout(timeout);
    await logTelemetryEvent('system', 'monitor', 'downtime', {
      target,
      status: response?.status ?? 'no_response',
    });
    console.error(`[Uptime ⚠️] ${target} returned status ${response?.status ?? 'unknown'}`);
  } catch (error) {
    clearTimeout(timeout);
    await logTelemetryEvent('system', 'monitor', 'downtime', {
      target,
      error: error.message,
    });
    console.error(`[Uptime ❌] ${target} unreachable`, error.message);
  }
};

run();
