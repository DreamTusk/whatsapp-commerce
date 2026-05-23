import express, { Request, Response } from 'express';
import prisma from '../../utils/db.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// GET /api/storefront/categories — public, resolved by x-store-domain, active only
router.get('/', async (req: Request, res: Response) => {
  const domain = req.headers['x-store-domain'] as string;
  if (!domain) {
    res.status(400).json({ error: 'Missing x-store-domain header' });
    return;
  }

  try {
    const store = await prisma.store.findUnique({ where: { domain } });
    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    const categories = await prisma.category.findMany({
      where: { storeId: store.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, nameLocal: true, imageUrl: true, sortOrder: true },
    });

    res.json({
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        name_local: cat.nameLocal,
        image_url: cat.imageUrl,
        sort_order: cat.sortOrder,
      })),
    });
  } catch (err) {
    logger.error('GET /api/storefront/categories error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
