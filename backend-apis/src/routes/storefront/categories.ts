import express, { Request, Response } from 'express';
import prisma from '../../utils/db.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// GET /api/storefront/categories — top-level active categories with active children
router.get('/', async (req: Request, res: Response) => {
  const domain = req.headers['x-store-domain'] as string;
  if (!domain) { res.status(400).json({ error: 'Missing x-store-domain header' }); return; }

  try {
    const store = await prisma.store.findUnique({ where: { domain } });
    if (!store) { res.status(404).json({ error: 'Store not found' }); return; }

    const all = await prisma.category.findMany({
      where: { storeId: store.id, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, imageUrl: true, parentId: true },
    });

    const childrenMap = new Map<string, typeof all>();
    for (const cat of all) {
      if (cat.parentId) {
        const arr = childrenMap.get(cat.parentId) ?? [];
        arr.push(cat);
        childrenMap.set(cat.parentId, arr);
      }
    }

    const categories = all
      .filter(c => !c.parentId)
      .map(c => ({
        id: c.id,
        name: c.name,
        image_url: c.imageUrl,
        children: (childrenMap.get(c.id) ?? []).map(ch => ({
          id: ch.id,
          name: ch.name,
          image_url: ch.imageUrl,
        })),
      }));

    res.json({ categories });
  } catch (err) {
    logger.error('GET /api/storefront/categories error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
