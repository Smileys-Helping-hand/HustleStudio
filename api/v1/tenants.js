import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { method } = req;
  const { uid } = req.query; // Firebase Auth UID

  if (!uid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (method) {
      case 'GET':
        // Get all tenants for a user
        const memberships = await prisma.tenantMember.findMany({
          where: { uid },
          include: { tenant: true },
        });
        return res.status(200).json(memberships);

      case 'POST':
        // Create new tenant
        const { name, accent } = req.body;
        const tenant = await prisma.tenant.create({
          data: {
            name: name || 'New Workspace',
            accent: accent || '#6366f1',
            ownerId: uid,
            members: {
              create: {
                uid,
                email: req.body.email || '',
                role: 'Owner',
              },
            },
          },
          include: { members: true },
        });
        return res.status(201).json(tenant);

      case 'PATCH':
        // Update tenant
        const { tenantId, ...updates } = req.body;
        
        // Verify user is member
        const member = await prisma.tenantMember.findFirst({
          where: { tenantId, uid },
        });
        
        if (!member) {
          return res.status(403).json({ error: 'Not a member of this workspace' });
        }

        const updatedTenant = await prisma.tenant.update({
          where: { id: tenantId },
          data: updates,
        });
        return res.status(200).json(updatedTenant);

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('[API] Tenants error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
