import { callOpenAI } from './openaiClient.js';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from './firebase.js';

const globalInsightsEnabled = () => {
  const viteFlag = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_GLOBAL_INSIGHTS_ENABLED : undefined;
  const nodeFlag = typeof process !== 'undefined' ? process.env?.VITE_GLOBAL_INSIGHTS_ENABLED ?? process.env?.GLOBAL_INSIGHTS_ENABLED : undefined;
  const value = viteFlag ?? nodeFlag;
  if (value === undefined || value === null || value === '') {
    return true;
  }
  const normalized = String(value).toLowerCase();
  return !(normalized === 'false' || normalized === '0' || normalized === 'off');
};

const globalCollectionName = () => {
  const viteName = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_GLOBAL_INSIGHTS_COLLECTION : undefined;
  const nodeName = typeof process !== 'undefined' ? process.env?.VITE_GLOBAL_INSIGHTS_COLLECTION ?? process.env?.GLOBAL_INSIGHTS_COLLECTION : undefined;
  return (viteName || nodeName || 'global_insights').trim();
};

const stringify = (input) => {
  try {
    return JSON.stringify(input, null, 2);
  } catch (error) {
    console.warn('[InsightBot] Unable to stringify input for prompt.', error);
    return String(input);
  }
};

export async function generateSalesInsight(sales, options = {}) {
  const prompt = `Analyse this sales ledger and provide three insights with action items.\n${stringify(sales)}`;
  return callOpenAI(prompt, 'gpt-4o-mini', {
    systemPrompt:
      'You are Hustle Studio\'s revenue strategist. Highlight top opportunities, anomalies, and a recommended next action.',
    temperature: 0.35,
    ...options,
  });
}

export async function generateInventoryInsight(items, options = {}) {
  const prompt = `Assess stock levels, highlight low-stock risks, and suggest replenishment actions.\n${stringify(items)}`;
  return callOpenAI(prompt, 'gpt-4o-mini', {
    systemPrompt:
      'You are Hustle Studio\'s operations analyst. Provide practical restock and merchandising recommendations.',
    temperature: 0.35,
    ...options,
  });
}

export async function generateFinanceInsight(finance, options = {}) {
  const prompt = `Review revenue, expenses, and invoices to surface trends and concerns.\n${stringify(finance)}`;
  return callOpenAI(prompt, 'gpt-4o', {
    systemPrompt:
      'You are Hustle Studio\'s financial intelligence engine. Summarise trends, risks, and cashflow suggestions.',
    temperature: 0.3,
    ...options,
  });
}

const extractPayload = (entry) => {
  if (!entry?.payload) return {};
  try {
    return JSON.parse(entry.payload);
  } catch (error) {
    console.warn('[InsightBot] Failed to parse global insight payload.', error);
    return {};
  }
};

export async function getGlobalRecommendations(goal, context = {}) {
  if (!globalInsightsEnabled()) {
    return '';
  }

  try {
    const q = query(collection(db, globalCollectionName()), orderBy('createdAt', 'desc'), limit(20));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return '';
    }

    const events = snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data();
      const payload = extractPayload(data);
      return {
        type: data.type,
        assistant: payload.assistant ?? payload.model ?? null,
        score: typeof payload.score === 'number' ? payload.score : undefined,
        tokens: typeof payload.tokens === 'number' ? payload.tokens : undefined,
        insight: payload.insight ?? payload.summary ?? undefined,
      };
    });

    const trimmed = events.slice(0, 12);
    const summaryInput = JSON.stringify({ goal, context, events: trimmed }).slice(0, 3500);

    const response = await callOpenAI(
      `Use the following anonymised cross-workspace signals to suggest actions.\n${summaryInput}`,
      'gpt-4o-mini',
      {
        systemPrompt:
          'You are Hustle Studio\'s global intelligence analyst. Provide at most three bullet recommendations that any workspace can action. Avoid referencing specific tenants.',
        temperature: 0.2,
        skipQualityEval: true,
      }
    );

    return typeof response === 'string' ? response.trim() : '';
  } catch (error) {
    console.warn('[InsightBot] Unable to generate global recommendations.', error);
    return '';
  }
}
