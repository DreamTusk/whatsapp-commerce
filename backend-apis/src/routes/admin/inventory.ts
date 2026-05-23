import express, { Request, Response } from 'express';
import prisma from '../../utils/db.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/inventory — all tracked variants for this store, sorted by qty asc
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const userStore = await prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) { res.status(404).json({ error: 'No store found' }); return; }

    const inventories = await prisma.inventory.findMany({
      where: { storeId: userStore.storeId },
      orderBy: { qty: 'asc' },
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true, name: true, imageUrl: true,
                category: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    res.json({
      inventory: inventories.map(inv => {
        const status =
          inv.qty <= inv.outOfStockLevel ? 'out' :
          inv.qty <= inv.outOfStockLevel + 10 ? 'low' : 'in_stock';

        return {
          id: inv.id,
          qty: inv.qty,
          out_of_stock_level: inv.outOfStockLevel,
          status,
          updated_at: inv.updatedAt,
          variant: {
            id: inv.variant.id,
            name: inv.variant.name,
            selling_price: inv.variant.sellingPrice,
            unit: inv.variant.unit,
          },
          product: {
            id: inv.variant.product.id,
            name: inv.variant.product.name,
            image_url: inv.variant.product.imageUrl,
            category: inv.variant.product.category,
          },
        };
      }),
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

export default router;
