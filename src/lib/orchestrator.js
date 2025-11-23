import { callOpenAI } from './openaiClient.js';
import { recordTelemetry } from './telemetry.js';

export const orchestrateTask = async ({ prompt, tenantId, context }) => {
  if (!prompt) {
    throw new Error('No orchestration prompt supplied.');
  }

  const payload = {
    datasets: context?.datasets ?? [],
    latestMetrics: context?.metrics ?? {},
    timestamp: new Date().toISOString(),
  };

  const systemPrompt =
    'You are Hustle Studio Orchestrator. You can call CRM, Finance, Marketing, and Inventory automations. '
    + 'Respond with a numbered list of steps you executed, followed by a concise summary. '
    + 'Clearly indicate any modules that need manual confirmation.';

  const summary = await callOpenAI(
    `Tenant: ${tenantId}\nContext: ${JSON.stringify(payload)}\nInstruction: ${prompt}`,
    'gpt-4o-mini',
    { systemPrompt, temperature: 0.2 }
  );

  await recordTelemetry('ai.orchestrator', tenantId, { prompt });
  return summary;
};
