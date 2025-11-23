import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    const { code } = req.query ?? {};
    if (!code) {
      const results = await prisma.faultCode.findMany({
        orderBy: { code: 'asc' },
        take: 100,
      });
      return res.status(200).json(results);
    }

    const normalized = String(code).toUpperCase();
    const fault = await prisma.faultCode.findUnique({ where: { code: normalized } });
    if (!fault) {
      return res.status(404).json({ error: 'Fault code not found' });
    }

    return res.status(200).json(fault);
  } catch (error) {
    console.error('[/api/codes] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
