/**
 * Unified AI Client
 * Automatically routes requests to OpenAI or Gemini based on configuration
 */

import { callOpenAI, sendChatCompletion } from './openaiClient.js';
import { callGemini, sendGeminiCompletion, isGeminiAvailable, getPreferredProvider } from './geminiClient.js';

/**
 * Get the active AI provider
 */
export const getActiveProvider = () => {
  return getPreferredProvider();
};

/**
 * Universal AI chat completion - routes to appropriate provider
 */
export const sendAICompletion = async (options) => {
  const provider = getActiveProvider();
  
  if (provider === 'gemini' && isGeminiAvailable()) {
    return await sendGeminiCompletion(options);
  }
  
  // Fallback to OpenAI
  return await sendChatCompletion(options);
};

/**
 * Universal AI call with simple prompt - routes to appropriate provider
 */
export const callAI = async (prompt, model, options = {}) => {
  const provider = getActiveProvider();
  
  if (provider === 'gemini' && isGeminiAvailable()) {
    const response = await callGemini(prompt, model, options);
    // Return content string for consistency with callOpenAI
    return response?.choices?.[0]?.message?.content?.trim?.() ?? '';
  }
  
  // Fallback to OpenAI
  return await callOpenAI(prompt, model, options);
};

/**
 * Get available models for current provider
 */
export const getAvailableModels = () => {
  const provider = getActiveProvider();
  
  if (provider === 'gemini') {
    return {
      fast: 'gemini-1.5-flash',
      powerful: 'gemini-1.5-pro',
      default: 'gemini-1.5-flash',
    };
  }
  
  return {
    fast: 'gpt-4o-mini',
    powerful: 'gpt-4o',
    default: 'gpt-4o-mini',
  };
};

/**
 * Get provider info
 */
export const getProviderInfo = () => {
  const provider = getActiveProvider();
  
  if (provider === 'gemini') {
    return {
      name: 'Gemini',
      provider: 'google',
      models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
      icon: '✨',
      color: '#4285f4',
    };
  }
  
  return {
    name: 'OpenAI',
    provider: 'openai',
    models: ['gpt-4o', 'gpt-4o-mini'],
    icon: '🤖',
    color: '#10a37f',
  };
};

export default {
  sendAICompletion,
  callAI,
  getActiveProvider,
  getAvailableModels,
  getProviderInfo,
};
