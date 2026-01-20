import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from './firebase';
import { recordCvGeneration, syncCvGenerationMetrics } from './candidateManager';
import { callAI } from './aiClient';
import jsPDF from 'jspdf';

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

export const CV_TEMPLATES = {
  modern: {
    id: 'modern',
    name: 'Modern Elegance',
    accent: '#D4C19C',
    accentSecondary: '#68785C',
    description: 'Clean and contemporary design with subtle gold accents',
    fontFamily: 'Helvetica',
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal Focus',
    accent: '#68785C',
    accentSecondary: '#D4C19C',
    description: 'Simple and focused layout that highlights content',
    fontFamily: 'Helvetica',
  },
  corporate: {
    id: 'corporate',
    name: 'Corporate Classic',
    accent: '#1f2937',
    accentSecondary: '#D4C19C',
    description: 'Traditional professional format for corporate roles',
    fontFamily: 'Times',
  },
  creative: {
    id: 'creative',
    name: 'Creative Bold',
    accent: '#6366f1',
    accentSecondary: '#8b5cf6',
    description: 'Eye-catching design for creative professionals',
    fontFamily: 'Helvetica',
  },
  executive: {
    id: 'executive',
    name: 'Executive Suite',
    accent: '#0f172a',
    accentSecondary: '#64748b',
    description: 'Sophisticated design for senior leadership',
    fontFamily: 'Times',
  },
};

function createTemplate(template) {
  return CV_TEMPLATES[template] || CV_TEMPLATES.modern;
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

export async function generateCvDraft({ candidate, template = 'modern', overrides = {}, signal, tenantId, userId } = {}) {
  if (!candidate) {
    throw new Error('Candidate details are required to generate a CV.');
  }

  const templateMeta = createTemplate(template);
  
  // Use AI to enhance CV content
  try {
    const aiPrompt = `You are a professional CV writer. Create a compelling, ATS-friendly CV for this candidate.

Candidate Details:
Name: ${candidate.name || 'Not provided'}
Email: ${candidate.email || 'Not provided'}
Phone: ${candidate.phone || 'Not provided'}
Location: ${candidate.location || 'Not provided'}
Experience: ${candidate.experience || 0} years
Skills: ${(candidate.skills || []).join(', ') || 'Not provided'}
Education: ${JSON.stringify(candidate.education || [])}
Work History: ${JSON.stringify(candidate.experienceHistory || [])}

Generate a professional CV in the following JSON format:
{
  "professionalSummary": "compelling 3-4 sentence summary highlighting achievements and expertise",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Month Year - Month Year",
      "achievements": ["Achievement 1", "Achievement 2", "Achievement 3"]
    }
  ],
  "skills": {
    "technical": ["skill1", "skill2"],
    "soft": ["skill1", "skill2"],
    "languages": ["language1", "language2"]
  },
  "education": [
    {
      "degree": "Degree Name",
      "institution": "Institution Name",
      "year": "Year",
      "achievements": "Notable achievements"
    }
  ],
  "certifications": ["cert1", "cert2"],
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description",
      "technologies": ["tech1", "tech2"]
    }
  ]
}

Make it professional, achievement-focused, and compelling. Use action verbs. Quantify achievements where possible.`;

    const response = await callAI(aiPrompt, 'gemini-1.5-flash', {
      temperature: 0.7,
      tenantId: tenantId || 'system',
      userId: userId || 'system',
      assistant: 'cv-generator',
      systemPrompt: 'You are an expert CV writer. Generate compelling, professional CV content in JSON format only.',
    });

    const content = response?.trim() || '{}';
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || content.match(/(\{[\s\S]*\})/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;
    
    const aiGeneratedContent = JSON.parse(jsonString);
    
    // Build enhanced sections using AI content
    const sections = {
      header: {
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location || 'Remote',
      },
      summary: aiGeneratedContent.professionalSummary || buildCvSections(candidate, overrides).summary,
      experience: aiGeneratedContent.experience || candidate.experienceHistory || [],
      skills: aiGeneratedContent.skills || { technical: candidate.skills || [], soft: [], languages: [] },
      education: aiGeneratedContent.education || candidate.education || [],
      certifications: aiGeneratedContent.certifications || [],
      projects: aiGeneratedContent.projects || [],
    };

    const markdown = buildEnhancedMarkdown(sections);
    
    return {
      sections,
      markdown,
      template: templateMeta,
      generatedAt: formatTimestamp(),
      aiEnhanced: true,
    };
  } catch (error) {
    console.error('AI CV generation failed, using basic generation:', error);
    
    // Fallback to basic generation
    const sections = buildCvSections(candidate, overrides);
    const markdown = buildMarkdown(sections);
    return {
      sections,
      markdown,
      template: templateMeta,
      generatedAt: formatTimestamp(),
      aiEnhanced: false,
    };
  }
}

function buildEnhancedMarkdown(sections) {
  let md = `# ${sections.header.name}\n\n`;
  md += `**Email:** ${sections.header.email}  \n`;
  md += `**Phone:** ${sections.header.phone}  \n`;
  md += `**Location:** ${sections.header.location}\n\n`;
  
  md += `---\n\n`;
  md += `## Professional Summary\n\n${sections.summary}\n\n`;
  
  if (sections.experience && sections.experience.length > 0) {
    md += `## Professional Experience\n\n`;
    sections.experience.forEach(exp => {
      md += `### ${exp.title} | ${exp.company}\n`;
      md += `*${exp.duration}*\n\n`;
      if (exp.achievements && exp.achievements.length > 0) {
        exp.achievements.forEach(achievement => {
          md += `- ${achievement}\n`;
        });
        md += '\n';
      }
    });
  }
  
  if (sections.skills) {
    md += `## Skills\n\n`;
    if (sections.skills.technical && sections.skills.technical.length > 0) {
      md += `**Technical Skills:** ${sections.skills.technical.join(' • ')}\n\n`;
    }
    if (sections.skills.soft && sections.skills.soft.length > 0) {
      md += `**Professional Skills:** ${sections.skills.soft.join(' • ')}\n\n`;
    }
    if (sections.skills.languages && sections.skills.languages.length > 0) {
      md += `**Languages:** ${sections.skills.languages.join(' • ')}\n\n`;
    }
  }
  
  if (sections.projects && sections.projects.length > 0) {
    md += `## Key Projects\n\n`;
    sections.projects.forEach(project => {
      md += `### ${project.name}\n`;
      md += `${project.description}\n\n`;
      if (project.technologies && project.technologies.length > 0) {
        md += `*Technologies: ${project.technologies.join(', ')}*\n\n`;
      }
    });
  }
  
  if (sections.education && sections.education.length > 0) {
    md += `## Education\n\n`;
    sections.education.forEach(edu => {
      md += `### ${edu.degree || edu.school || edu}\n`;
      if (edu.institution) md += `${edu.institution}\n`;
      if (edu.year) md += `*${edu.year}*\n`;
      if (edu.achievements) md += `\n${edu.achievements}\n`;
      md += '\n';
    });
  }
  
  if (sections.certifications && sections.certifications.length > 0) {
    md += `## Certifications\n\n`;
    sections.certifications.forEach(cert => {
      md += `- ${cert}\n`;
    });
    md += '\n';
  }
  
  md += `---\n\n`;
  md += `*References available upon request*\n`;
  
  return md;
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

/**
 * Export CV as PDF with professional formatting
 */
export async function exportCvAsPDF(draft, candidate) {
  const doc = new jsPDF();
  const template = draft.template || CV_TEMPLATES.modern;
  const sections = draft.sections;
  
  // Set up colors
  const primaryColor = template.accent || '#D4C19C';
  const textColor = [0, 0, 0];
  const secondaryColor = [100, 100, 100];
  
  // Helper to convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  };
  
  const accentRgb = hexToRgb(primaryColor);
  
  let yPos = 20;
  const lineHeight = 7;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  
  // Header - Name
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...accentRgb);
  doc.text(sections.header.name, margin, yPos);
  yPos += 10;
  
  // Contact Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  const contactInfo = [
    sections.header.email,
    sections.header.phone,
    sections.header.location
  ].filter(Boolean).join(' • ');
  doc.text(contactInfo, margin, yPos);
  yPos += 15;
  
  // Divider line
  doc.setDrawColor(...accentRgb);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;
  
  // Professional Summary
  if (sections.summary) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...accentRgb);
    doc.text('PROFESSIONAL SUMMARY', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    const summaryLines = doc.splitTextToSize(sections.summary, maxWidth);
    summaryLines.forEach(line => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, margin, yPos);
      yPos += lineHeight;
    });
    yPos += 5;
  }
  
  // Experience
  if (sections.experience && sections.experience.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...accentRgb);
    doc.text('PROFESSIONAL EXPERIENCE', margin, yPos);
    yPos += 8;
    
    sections.experience.forEach(exp => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      // Job title and company
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textColor);
      doc.text(`${exp.title} | ${exp.company}`, margin, yPos);
      yPos += 6;
      
      // Duration
      if (exp.duration) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...secondaryColor);
        doc.text(exp.duration, margin, yPos);
        yPos += 6;
      }
      
      // Achievements
      if (exp.achievements && exp.achievements.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textColor);
        
        exp.achievements.forEach(achievement => {
          const bulletLines = doc.splitTextToSize(`• ${achievement}`, maxWidth - 5);
          bulletLines.forEach(line => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            doc.text(line, margin + 2, yPos);
            yPos += lineHeight;
          });
        });
      }
      
      yPos += 4;
    });
  }
  
  // Skills
  if (sections.skills) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...accentRgb);
    doc.text('SKILLS', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    
    if (sections.skills.technical && sections.skills.technical.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Technical Skills:', margin, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      const techLines = doc.splitTextToSize(sections.skills.technical.join(' • '), maxWidth);
      techLines.forEach(line => {
        doc.text(line, margin, yPos);
        yPos += lineHeight;
      });
      yPos += 2;
    }
    
    if (sections.skills.soft && sections.skills.soft.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Professional Skills:', margin, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      const softLines = doc.splitTextToSize(sections.skills.soft.join(' • '), maxWidth);
      softLines.forEach(line => {
        doc.text(line, margin, yPos);
        yPos += lineHeight;
      });
    }
    
    yPos += 5;
  }
  
  // Education
  if (sections.education && sections.education.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...accentRgb);
    doc.text('EDUCATION', margin, yPos);
    yPos += 8;
    
    sections.education.forEach(edu => {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textColor);
      doc.text(edu.degree || edu.school || edu, margin, yPos);
      yPos += 6;
      
      if (edu.institution) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(edu.institution, margin, yPos);
        yPos += 6;
      }
      
      if (edu.year) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...secondaryColor);
        doc.text(edu.year, margin, yPos);
        yPos += 6;
      }
      
      yPos += 2;
    });
  }
  
  // Save PDF
  const fileName = `${candidate?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'CV'}_${Date.now()}.pdf`;
  doc.save(fileName);
  
  return fileName;
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
