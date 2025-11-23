import { callOpenAI } from './openaiClient.js';

const defaultModel = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MARKETING_AI_MODEL) {
    return import.meta.env.VITE_MARKETING_AI_MODEL;
  }
  const nodeEnv =
    typeof globalThis !== 'undefined' &&
    typeof globalThis.process === 'object' &&
    globalThis.process !== null &&
    typeof globalThis.process.env === 'object'
      ? globalThis.process.env
      : undefined;
  if (nodeEnv?.VITE_MARKETING_AI_MODEL) {
    return nodeEnv.VITE_MARKETING_AI_MODEL;
  }
  return 'gpt-4o-mini';
};

const runCompletion = async (prompt, model) => {
  const response = await callOpenAI(prompt, model ?? defaultModel());
  if (typeof response === 'string') return response.trim();
  if (response?.choices?.[0]?.message?.content) {
    return response.choices[0].message.content.trim();
  }
  return 'No response generated.';
};

export async function generateCampaignBrief(product, audience = 'general') {
  const prompt = `You are the Hustle Studio Marketing Lab. Create a concise 3-phase social media campaign for the product below. Include goals, headline angle, hero asset suggestion, and CTA for each phase.\nProduct: ${product}\nAudience: ${audience}`;
  return runCompletion(prompt);
}

export async function generateCaptions(product, tone = 'modern', platforms = ['Instagram']) {
  const prompt = `Generate 5 short, catchy captions with emoji and hashtags for ${product}. Tone: ${tone}. Platforms: ${platforms.join(
    ', '
  )}. Return each caption as a bullet point.`;
  return runCompletion(prompt);
}

export async function generateHashtags(industry, vibe = 'modern') {
  const prompt = `List 15 high-performing hashtags for the ${industry} niche with a ${vibe} tone. Separate using spaces.`;
  return runCompletion(prompt);
}

export async function generateEmailSequence(product, audience = 'subscribers') {
  const prompt = `Draft a 3-email sequence to nurture ${audience} about ${product}. Each email should have: subject, preview text, and 3 bullet points.`;
  return runCompletion(prompt);
}

export async function suggestPostingSchedule(goal, cadence = '3 posts per week') {
  const prompt = `Suggest an optimal social posting schedule. Goal: ${goal}. Cadence: ${cadence}. Provide day, time, platform focus, and content angle.`;
  return runCompletion(prompt);
}

export async function summarizeCampaignPerformance(metrics) {
  const prompt = `Summarize this marketing performance data and recommend one optimisation idea per channel.\nData: ${JSON.stringify(
    metrics
  )}`;
  return runCompletion(prompt);
}
