import { callOpenAI } from './openaiClient.js';
import { updateAIMetrics } from './aiMetrics.js';
import { db } from './firebase.js';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { recordGlobalEvent } from './globalInsights.js';
import { anonymizeTenant } from './anonymizer.js';

const isEvaluationEnabled = () => {
  const flag =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AI_QUALITY_EVAL) ||
    (typeof process !== 'undefined' && process.env?.VITE_AI_QUALITY_EVAL);
  if (flag === undefined || flag === null || flag === '') {
    return true;
  }
  const normalized = String(flag).toLowerCase();
  return normalized === 'true' || normalized === '1';
};

const parseEvaluation = (text) => {
  if (!text) return null;
  try {
    const match = text.match(/{[\s\S]+}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch (error) {
    console.warn('[QualityEvaluator] Unable to parse evaluation payload.', error);
    return null;
  }
};

export const evaluateResponse = async ({
  tenantId,
  assistant,
  prompt,
  response,
  auditLogId,
}) => {
  if (!isEvaluationEnabled()) {
    return null;
  }
  if (!prompt || !response) {
    return null;
  }

  const evaluationPrompt = `You are a neutral evaluator. Rate this assistant's reply from 0-10 for accuracy, helpfulness, tone, and relevance. Respond only with JSON matching {"accuracy":number,"helpfulness":number,"tone":number,"relevance":number,"overall":number}.`;

  try {
    const evaluationText = await callOpenAI(
      `Prompt:\n${prompt}\n\nResponse:\n${response}`,
      'gpt-4o-mini',
      {
        systemPrompt: evaluationPrompt,
        tenantId: tenantId ?? 'system',
        userId: 'quality-evaluator',
        skipLogging: true,
        skipQualityEval: true,
      }
    );

    const parsed = parseEvaluation(evaluationText);
    if (!parsed || !Number.isFinite(Number(parsed.overall))) {
      return null;
    }

    const overallScore = Number(parsed.overall);

    if (tenantId) {
      await updateAIMetrics(tenantId, assistant ?? 'assistant', overallScore);
    }

    if (auditLogId) {
      try {
        await updateDoc(doc(db, 'ai_audit_logs', auditLogId), {
          evaluation: parsed,
          overall: overallScore,
          evaluatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.warn('[QualityEvaluator] Unable to persist evaluation scores.', error);
      }
    }

    void recordGlobalEvent('ai_quality_score', {
      assistant: assistant ?? 'assistant',
      score: overallScore,
      tenant: anonymizeTenant(tenantId),
    });

    return parsed;
  } catch (error) {
    console.error('[QualityEvaluator] Evaluation failed.', error);
    return null;
  }
};
