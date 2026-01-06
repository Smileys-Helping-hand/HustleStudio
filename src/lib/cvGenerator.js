import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from './firebase';
import { recordCvGeneration, syncCvGenerationMetrics } from './candidateManager';

function resolveEnv(key) {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return undefined;
}

function formatTimestamp(timestamp = new Date()) {
  return new Date(timestamp).toISOString();
}

function createTemplate(template) {
  switch (template) {
    case 'minimal':
      return {
        name: 'Minimal',
        accent: '#68785C',
        accentSecondary: '#D4C19C',
      };
    case 'corporate':
      return {
        name: 'Corporate',
        accent: '#1f2937',
        accentSecondary: '#D4C19C',
      };
    default:
      return {
        name: 'Modern',
        accent: '#D4C19C',
        accentSecondary: '#68785C',
      };
  }
}

function buildCvSections(candidate, overrides = {}) {
  const summary =
    overrides.summary ||
    `${candidate.name ?? 'Candidate'} brings ${candidate.experience ?? 0}+ years of experience across ${
      (candidate.skills || []).slice(0, 5).join(', ') || 'multiple disciplines'
    }.`;

  return {
    header: {
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      location: overrides.location || candidate.location || 'Remote',
    },
    summary,
    experience: overrides.experience ?? candidate.experienceHistory ?? [],
    skills: overrides.skills ?? candidate.skills ?? [],
    education: overrides.education ?? candidate.education ?? [],
    references: overrides.references ?? [],
  };
}

function buildMarkdown(sections) {
  return `# ${sections.header.name}\n\n` +
    `**Email:** ${sections.header.email}  \n` +
    `**Phone:** ${sections.header.phone}  \n` +
    `**Location:** ${sections.header.location}\n\n` +
    `## Professional Summary\n${sections.summary}\n\n` +
    `## Experience\n${
      sections.experience.length
        ? sections.experience.map((item) => `- ${item.title ?? item.company ?? item}`).join('\n')
        : 'Details to be provided.'
    }\n\n` +
    `## Skills\n${sections.skills.length ? sections.skills.join(', ') : 'Skills pending input.'}\n\n` +
    `## Education\n${
      sections.education.length
        ? sections.education.map((item) => `- ${item.school ?? item}`).join('\n')
        : 'Education history pending input.'
    }\n\n` +
    `## References\n${
      sections.references.length
        ? sections.references.map((ref) => `- ${ref.name ?? ref}`).join('\n')
        : 'Available upon request.'
    }\n`;
}

async function requestGeneration(payload, signal) {
  const endpoint = resolveEnv('VITE_CV_GENERATOR_ENDPOINT');
  if (!endpoint) {
    return null;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    throw new Error(`CV generator endpoint responded with status ${response.status}`);
  }

  return response.json();
}

export async function generateCvDraft({ candidate, template = 'modern', overrides = {}, signal } = {}) {
  if (!candidate) {
    throw new Error('Candidate details are required to generate a CV.');
  }

  const templateMeta = createTemplate(template);
  const remoteResult = await requestGeneration(
    { candidate, template },
    signal
  ).catch((error) => {
    console.error('Falling back to local CV generation', error);
    return null;
  });

  if (remoteResult?.sections) {
    return { ...remoteResult, template: templateMeta };
  }

  const sections = buildCvSections(candidate, overrides);
  const markdown = buildMarkdown(sections);
  return {
    sections,
    markdown,
    template: templateMeta,
    generatedAt: formatTimestamp(),
  };
}

async function uploadCvMarkdown({ tenantId, candidateId, markdown, template }) {
  const versionId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const storagePath = `candidates/${tenantId}/${candidateId}/cv-${versionId}.md`;
  const fileRef = ref(storage, storagePath);
  const blob = new Blob([markdown], { type: 'text/markdown' });
  await uploadBytes(fileRef, blob);
  const url = await getDownloadURL(fileRef);
  return { storagePath, url, versionId, template };
}

export async function saveCvDraft({
  tenantId,
  candidateId,
  draft,
  cost = 0,
}) {
  if (!tenantId) {
    throw new Error('Tenant ID is required to save the CV draft.');
  }
  const upload = await uploadCvMarkdown({
    tenantId,
    candidateId,
    markdown: draft.markdown,
    template: draft.template?.name ?? 'Modern',
  });

  const recordRef = doc(db, 'cvs', `${candidateId}-${upload.versionId}`);
  await setDoc(recordRef, {
    tenantId,
    candidateId,
    template: draft.template,
    generatedAt: serverTimestamp(),
    downloadUrl: upload.url,
    storagePath: upload.storagePath,
  });

  await recordCvGeneration({
    tenantId,
    candidateId,
    versionId: upload.versionId,
    template: draft.template?.name ?? 'Modern',
    summary: draft.sections?.summary ?? '',
    storagePath: upload.storagePath,
    metrics: { cost },
  });
  await syncCvGenerationMetrics({ tenantId, candidateId, cost });

  return upload;
}

export async function generateCandidateInsights(candidate, { signal } = {}) {
  if (!candidate) {
    throw new Error('Candidate data is required for AI insights.');
  }

  const endpoint = resolveEnv('VITE_OPENAI_SUMMARY_ENDPOINT');
  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate }),
        signal,
      });
      if (response.ok) {
        return await response.json();
      }
      console.error('AI summary endpoint returned', response.status);
    } catch (error) {
      console.error('AI summary request failed, using fallback', error);
    }
  }

  const topSkills = (candidate.skills ?? []).slice(0, 5);
  return {
    summary: `${candidate.name ?? 'This candidate'} offers ${candidate.experience ?? 0}+ years of experience and brings strengths across ${
      topSkills.join(', ') || 'their core skill areas'
    }.`,
    rating: topSkills.length >= 5 ? '⭐️⭐️⭐️⭐️' : '⭐️⭐️⭐️',
    recommendedActions: [
      'Schedule an introductory screening call.',
      'Share role-specific assessment task.',
      'Prepare tailored interview panel.',
    ],
    suggestedQuestions: [
      'Describe a recent win that highlights your top skill.',
      'How do you collaborate with distributed teams?',
      'What would be your plan for the first 30 days?',
    ],
  };
}

export default {
  generateCvDraft,
  saveCvDraft,
  generateCandidateInsights,
};
