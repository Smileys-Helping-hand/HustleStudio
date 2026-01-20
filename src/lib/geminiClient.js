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

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Map OpenAI-style model names to Gemini models
 */
const MODEL_MAPPING = {
  'gpt-4o': 'gemini-1.5-pro',
  'gpt-4o-mini': 'gemini-1.5-flash',
  'gpt-4': 'gemini-1.5-pro',
  'gpt-3.5-turbo': 'gemini-1.5-flash',
  'gemini-pro': 'gemini-1.5-pro',
  'gemini-flash': 'gemini-1.5-flash',
};

const mapModelName = (model) => {
  return MODEL_MAPPING[model] || 'gemini-1.5-flash';
};

const parseResponse = async (response) => {
  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || 'Gemini API request failed';
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

/**
 * Convert OpenAI-style messages to Gemini format
 */
const convertMessagesToGemini = (messages) => {
  const contents = [];
  let systemInstruction = '';

  messages.forEach(msg => {
    if (msg.role === 'system') {
      systemInstruction = msg.content;
    } else if (msg.role === 'user') {
      // Handle both text and image content
      if (typeof msg.content === 'string') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }]
        });
      } else if (Array.isArray(msg.content)) {
        // Handle multimodal content (text + images)
        const parts = msg.content.map(item => {
          if (item.type === 'text') {
            return { text: item.text };
          } else if (item.type === 'image_url') {
            // Extract base64 data
            const imageData = item.image_url.url.split(',')[1];
            const mimeType = item.image_url.url.match(/data:(.*?);/)?.[1] || 'image/jpeg';
            return {
              inline_data: {
                mime_type: mimeType,
                data: imageData
              }
            };
          }
          return null;
        }).filter(Boolean);
        
        contents.push({
          role: 'user',
          parts
        });
      }
    } else if (msg.role === 'assistant') {
      contents.push({
        role: 'model',
        parts: [{ text: msg.content }]
      });
    }
  });

  return { contents, systemInstruction };
};

/**
 * Send chat completion request to Gemini API
 */
export const sendGeminiCompletion = async ({
  messages,
  model = 'gemini-1.5-flash',
  temperature = 0.3,
  signal,
  tenantId = 'system',
  userId = 'system',
  assistant,
  skipLogging = false,
  skipQualityEval = false,
}) => {
  const apiKey = resolveEnvValue('VITE_GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  const geminiModel = mapModelName(model);
  const { contents, systemInstruction } = convertMessagesToGemini(messages);

  const requestBody = {
    contents,
    generationConfig: {
      temperature,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
  };

  // Add system instruction if present
  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const url = `${GEMINI_API_URL}/${geminiModel}:generateContent?key=${apiKey}`;

  // Make API call with retry logic
  const payload = await retryAICall(async () => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal,
    });
    return parseResponse(response);
  }, 'Gemini');

  // Convert Gemini response to OpenAI-compatible format
  const convertedPayload = {
    id: payload.candidates?.[0]?.index || 'gemini-response',
    object: 'chat.completion',
    created: Date.now(),
    model: geminiModel,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: payload.candidates?.[0]?.content?.parts?.[0]?.text || '',
        },
        finish_reason: payload.candidates?.[0]?.finishReason?.toLowerCase() || 'stop',
      },
    ],
    usage: {
      prompt_tokens: payload.usageMetadata?.promptTokenCount || 0,
      completion_tokens: payload.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: payload.usageMetadata?.totalTokenCount || 0,
    },
  };

  let auditId = null;

  if (!skipLogging && isLoggingEnabled()) {
    const lastUserMessage = [...messages]
      .reverse()
      .find((entry) => entry?.role === 'user')?.content;
    
    // Handle both string and array content
    const promptText = typeof lastUserMessage === 'string' 
      ? lastUserMessage 
      : Array.isArray(lastUserMessage)
        ? lastUserMessage.find(item => item.type === 'text')?.text || ''
        : '';

    const assistantMessage = convertedPayload.choices[0]?.message?.content ?? '';
    const modelUsed = geminiModel;
    const tokensUsed = convertedPayload.usage.total_tokens;

    try {
      auditId = await logAIUsage({
        tenantId: tenantId ?? 'system',
        userId: userId ?? 'system',
        model: modelUsed,
        tokens: tokensUsed,
        prompt: promptText,
        response: assistantMessage,
        assistant,
        provider: 'gemini',
      });
    } catch (error) {
      console.warn('[Gemini] Failed to record AI usage.', error);
    }

    if (auditId) {
      convertedPayload.auditLogId = auditId;
    }
  }

  if (!skipQualityEval && isQualityEvaluationEnabled()) {
    const lastUserMessage = [...messages]
      .reverse()
      .find((entry) => entry?.role === 'user')?.content;
    
    const promptText = typeof lastUserMessage === 'string' 
      ? lastUserMessage 
      : Array.isArray(lastUserMessage)
        ? lastUserMessage.find(item => item.type === 'text')?.text || ''
        : '';

    const assistantMessage = convertedPayload.choices[0]?.message?.content ?? '';
    const modelUsed = geminiModel;

    if (promptText && assistantMessage) {
      try {
        const { evaluateResponse } = await import('./aiQualityEvaluator.js');
        await evaluateResponse({
          tenantId: tenantId ?? 'system',
          assistant: assistant ?? modelUsed,
          prompt: promptText,
          response: assistantMessage,
          auditLogId: convertedPayload?.auditLogId ?? auditId,
        });
      } catch (error) {
        console.warn('[Gemini] Quality evaluation failed.', error);
      }
    }
  }

  return convertedPayload;
};

/**
 * Call Gemini API with a simple prompt
 */
export const callGemini = async (
  prompt,
  model = 'gemini-1.5-flash',
  options = {}
) => {
  const {
    systemPrompt = "You are Hustle Studio's AI analyst. Provide concise insights.",
    temperature = 0.3,
    signal,
    metadata,
    skipLogging = false,
    skipQualityEval = false,
    messages: customMessages,
    ...rest
  } = options;

  // If custom messages provided (e.g., for vision API), use them
  const messages = customMessages || [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ];

  const response = await sendGeminiCompletion({
    model,
    temperature,
    signal,
    messages,
    ...(metadata ?? {}),
    ...rest,
    skipLogging,
    skipQualityEval,
  });

  return response;
};

/**
 * Check if Gemini API is configured and available
 */
export const isGeminiAvailable = () => {
  const apiKey = resolveEnvValue('VITE_GEMINI_API_KEY');
  return Boolean(apiKey);
};

/**
 * Get preferred AI provider
 */
export const getPreferredProvider = () => {
  const provider = resolveEnvValue('VITE_AI_PROVIDER');
  if (provider) {
    return provider.toLowerCase();
  }
  
  // Default to Gemini if available, otherwise OpenAI
  if (isGeminiAvailable()) {
    return 'gemini';
  }
  
  return 'openai';
};

/**
 * Gemini model configurations for different use cases
 */
export const GEMINI_MODELS = {
  pro: {
    name: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    description: 'Most capable model for complex tasks',
    contextWindow: 2000000,
    maxOutputTokens: 8192,
  },
  flash: {
    name: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash',
    description: 'Fast and efficient for everyday tasks',
    contextWindow: 1000000,
    maxOutputTokens: 8192,
  },
};

/**
 * Supported assistants with Gemini models
 */
export const supportedGeminiAssistants = {
  strategy: {
    title: 'StrategyGPT',
    description: 'Translate performance signals into a weekly playbook and growth roadmap.',
    systemPrompt:
      'You are StrategyGPT, a business strategist for Hustle Studio. Provide actionable recommendations grounded in sales, marketing, and operational context. Be concise but insightful.',
    defaultModel: 'gemini-1.5-pro',
  },
  finance: {
    title: 'FinanceGPT',
    description: 'Explain financial signals, highlight anomalies, and summarise cashflow in plain language.',
    systemPrompt:
      'You are FinanceGPT, a CFO-style analyst for Hustle Studio. Analyse cashflow, revenue, expense trends, and provide guidance grounded in sound financial management.',
    defaultModel: 'gemini-1.5-flash',
  },
  inventory: {
    title: 'InventoryGPT',
    description: 'Balance stock levels, flag shrinkage, and forecast procurement windows.',
    systemPrompt:
      'You are InventoryGPT, an operations analyst. Use inventory insights to highlight risks, replenishment needs, and process improvements.',
    defaultModel: 'gemini-1.5-flash',
  },
  assistant: {
    title: 'AssistantGPT',
    description: 'Handle day-to-day prompts, meetings, and multi-step reminders.',
    systemPrompt:
      'You are AssistantGPT, a general operational assistant for Hustle Studio. Support meetings, tasks, and communication with professional clarity.',
    defaultModel: 'gemini-1.5-flash',
  },
  growthCoach: {
    title: 'Growth Coach',
    description: 'Review analytics, campaigns, and sales to suggest next best marketing moves.',
    systemPrompt:
      'You are Growth Coach, an AI advisor focused on revenue expansion. Analyse metrics, marketing performance, and campaigns before recommending growth experiments.',
    defaultModel: 'gemini-1.5-flash',
  },
  documentExtractor: {
    title: 'Document Extractor',
    description: 'Extract structured data from documents with high accuracy.',
    systemPrompt:
      'You are a precise document data extraction assistant. Extract information accurately and return it in the requested JSON format.',
    defaultModel: 'gemini-1.5-flash',
  },
};

export default {
  sendGeminiCompletion,
  callGemini,
  isGeminiAvailable,
  getPreferredProvider,
  GEMINI_MODELS,
  supportedGeminiAssistants,
};
