import express, { Request, Response } from 'express';
import prisma from '../../utils/db.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

// GET /api/inventory — all products for this store with stock status
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const userStore = await prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) { res.status(404).json({ error: 'No store found' }); return; }

    const products = await prisma.product.findMany({
      where: { storeId: userStore.storeId },
      include: { category: { select: { id: true, name: true } } },
    });

    res.json({
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        image_url: p.imageUrl,
        selling_price: p.sellingPrice,
        unit: p.unit,
        in_stock: p.inStock,
        is_active: p.isActive,
        category: p.category,
      })),
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// PATCH /api/inventory/:productId — toggle in_stock
router.patch('/:productId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const userStore = await prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) { res.status(404).json({ error: 'No store found' }); return; }

    const productId = req.params.productId as string;
    const product = await prisma.product.findFirst({
      where: { id: productId, storeId: userStore.storeId },
    });
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }

    const { in_stock } = req.body;
    if (in_stock === undefined) { res.status(400).json({ error: 'in_stock is required' }); return; }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { inStock: in_stock === true || in_stock === 'true' },
    });

    res.json({ product: { id: updated.id, in_stock: updated.inStock } });
  } catch {
    res.status(500).json({ error: 'Failed to update stock status' });
  }
});

export default router;
