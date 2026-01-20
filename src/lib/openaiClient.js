import { logAIUsage } from './aiLogger.js';
import { retryAICall } from './retryHelper.js';

const resolveEnvValue = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.process === 'object' &&
    globalThis.process !== null &&
    typeof globalThis.process.env === 'object' &&
    globalThis.process.env[key]
  ) {
    return globalThis.process.env[key];
  }
  return '';
};

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const parseResponse = async (response) => {
  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || 'OpenAI request failed';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return payload;
};

const isLoggingEnabled = () => {
  const flag = resolveEnvValue('VITE_AI_LOGGING_ENABLED');
  if (!flag) return true;
  const normalized = String(flag).toLowerCase();
  return normalized === 'true' || normalized === '1';
};

const isQualityEvaluationEnabled = () => {
  const flag = resolveEnvValue('VITE_AI_QUALITY_EVAL');
  if (flag === undefined || flag === null || flag === '') {
    return true;
  }
  const normalized = String(flag).toLowerCase();
  return normalized === 'true' || normalized === '1';
};

export const sendChatCompletion = async ({
  messages,
  model = 'gpt-4o-mini',
  temperature = 0.3,
  signal,
  tenantId = 'system',
  userId = 'system',
  assistant,
  skipLogging = false,
  skipQualityEval = false,
}) => {
  const apiKey = resolveEnvValue('VITE_OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured.');
  }

  // Make API call with retry logic
  const payload = await retryAICall(async () => {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      }),
      signal,
    });
    return parseResponse(response);
  }, 'OpenAI');

  let auditId = null;

  if (!skipLogging && isLoggingEnabled()) {
    const lastUserMessage = [...messages]
      .reverse()
      .find((entry) => entry?.role === 'user')?.content;
    const assistantMessage = payload?.choices?.[0]?.message?.content ?? '';
    const modelUsed = payload?.model ?? model;
    const tokensUsed = payload?.usage?.total_tokens ?? 0;

    try {
      auditId = await logAIUsage({
        tenantId: tenantId ?? 'system',
        userId: userId ?? 'system',
        model: modelUsed,
        tokens: tokensUsed,
        prompt: lastUserMessage ?? '',
        response: assistantMessage ?? '',
        assistant,
      });
    } catch (error) {
      console.warn('[OpenAI] Failed to record AI usage.', error);
    }

    if (auditId) {
      payload.auditLogId = auditId;
    }
  }

  if (!skipQualityEval && isQualityEvaluationEnabled()) {
    const lastUserMessage = [...messages]
      .reverse()
      .find((entry) => entry?.role === 'user')?.content;
    const assistantMessage = payload?.choices?.[0]?.message?.content ?? '';
    const modelUsed = payload?.model ?? model;

    if (lastUserMessage && assistantMessage) {
      try {
        const { evaluateResponse } = await import('./aiQualityEvaluator.js');
        await evaluateResponse({
          tenantId: tenantId ?? 'system',
          assistant: assistant ?? modelUsed,
          prompt: lastUserMessage,
          response: assistantMessage,
          auditLogId: payload?.auditLogId ?? auditId,
        });
      } catch (error) {
        console.warn('[OpenAI] Quality evaluation failed.', error);
      }
    }
  }

  return payload;
};

export const callOpenAI = async (
  prompt,
  model = 'gpt-4o-mini',
  options = {}
) => {
  const {
    systemPrompt = "You are Hustle Studio's AI analyst. Provide concise insights.",
    temperature = 0.3,
    signal,
    metadata,
    skipLogging = false,
    skipQualityEval = false,
    ...rest
  } = options;

  const response = await sendChatCompletion({
    model,
    temperature,
    signal,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    ...(metadata ?? {}),
    ...rest,
    skipLogging,
    skipQualityEval,
  });

  return response?.choices?.[0]?.message?.content?.trim?.() ?? '';
};

export const supportedAssistants = {
  strategy: {
    title: 'StrategyGPT',
    description: 'Translate performance signals into a weekly playbook and growth roadmap.',
    systemPrompt:
      'You are StrategyGPT, a business strategist for Hustle Studio. Provide actionable recommendations grounded in sales, marketing, and operational context. Be concise but insightful.',
    defaultModel: 'gpt-4o',
  },
  finance: {
    title: 'FinanceGPT',
    description: 'Explain financial signals, highlight anomalies, and summarise cashflow in plain language.',
    systemPrompt:
      'You are FinanceGPT, a CFO-style analyst for Hustle Studio. Analyse cashflow, revenue, expense trends, and provide guidance grounded in sound financial management.',
    defaultModel: 'gpt-4o-mini',
  },
  inventory: {
    title: 'InventoryGPT',
    description: 'Balance stock levels, flag shrinkage, and forecast procurement windows.',
    systemPrompt:
      'You are InventoryGPT, an operations analyst. Use inventory insights to highlight risks, replenishment needs, and process improvements.',
    defaultModel: 'gpt-4o-mini',
  },
  assistant: {
    title: 'AssistantGPT',
    description: 'Handle day-to-day prompts, meetings, and multi-step reminders.',
    systemPrompt:
      'You are AssistantGPT, a general operational assistant for Hustle Studio. Support meetings, tasks, and communication with professional clarity.',
    defaultModel: 'gpt-4o-mini',
  },
  growthCoach: {
    title: 'Growth Coach',
    description: 'Review analytics, campaigns, and sales to suggest next best marketing moves.',
    systemPrompt:
      'You are Growth Coach, an AI advisor focused on revenue expansion. Analyse metrics, marketing performance, and campaigns before recommending growth experiments.',
    defaultModel: 'gpt-4o-mini',
  },
};
