import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function withFaultContext(userMessage, baseContext = '') {
  if (!userMessage) return baseContext;
  const match = userMessage.match(/\b[PBU]\d{4}\b/i);
  if (!match) {
    return baseContext;
  }

  const code = match[0].toUpperCase();
  const fault = await prisma.faultCode.findUnique({ where: { code } });
  if (!fault) {
    return baseContext;
  }

  const context = `\nDetected diagnostic trouble code: ${fault.code}\nDescription: ${fault.description}\nSubsystem: ${fault.subsystem}\n\nTypical causes:\n${fault.causes}\n\nRecommended checks:\n${fault.checks}\n\nTypical repairs:\n${fault.repairs}\n\nDiagram reference: ${fault.diagramUrl ?? 'N/A'}\n\nWhen responding:\n- Explain what this code means in simple terms.\n- List likely causes in order of probability.\n- Describe safe, step-by-step inspection before replacing parts.\n- If relevant, reference the diagram path so the UI can show it.\n- Avoid guessing; tell the user when advanced tools or a professional are required.`;

  return `${baseContext}\n\n${context}`.trim();
}
