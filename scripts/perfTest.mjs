#!/usr/bin/env node
import { spawn } from 'child_process';

const run = () => {
  const lighthouse = spawn('npx', ['lighthouse', 'http://localhost:4173', '--preset=desktop', '--quiet'], {
    stdio: 'inherit',
  });

  lighthouse.on('error', () => {
    console.warn('⚠️  Lighthouse CLI not available in this environment. Skipping performance check.');
  });
};

run();
