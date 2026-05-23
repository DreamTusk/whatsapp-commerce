import express, { Request, Response } from 'express';
import prisma from '../../utils/db.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

async function getStoreId(userId: string): Promise<string | null> {
  const userStore = await prisma.userStore.findFirst({ where: { userId } });
  return userStore?.storeId ?? null;
}

// GET /api/brands
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const brands = await prisma.brand.findMany({
      where: { storeId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });

    res.json({
      brands: brands.map(b => ({
        id: b.id,
        name: b.name,
        product_count: b._count.products,
        created_at: b.createdAt,
      })),
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// POST /api/brands
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const { name } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: 'name is required' }); return; }

    const brand = await prisma.brand.create({
      data: { name: name.trim(), storeId },
    });

    res.status(201).json({ brand: { id: brand.id, name: brand.name, product_count: 0, created_at: brand.createdAt } });
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2002') {
      res.status(409).json({ error: 'A brand with this name already exists' }); return;
    }
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

// PUT /api/brands/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const id = req.params.id as string;
    const existing = await prisma.brand.findFirst({ where: { id, storeId } });
    if (!existing) { res.status(404).json({ error: 'Brand not found' }); return; }

    const { name } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: 'name is required' }); return; }

    const brand = await prisma.brand.update({
      where: { id },
      data: { name: name.trim() },
      include: { _count: { select: { products: true } } },
    });

    res.json({ brand: { id: brand.id, name: brand.name, product_count: brand._count.products, created_at: brand.createdAt } });
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2002') {
      res.status(409).json({ error: 'A brand with this name already exists' }); return;
    }
    res.status(500).json({ error: 'Failed to update brand' });
  }
});

// DELETE /api/brands/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const id = req.params.id as string;
    const existing = await prisma.brand.findFirst({ where: { id, storeId } });
    if (!existing) { res.status(404).json({ error: 'Brand not found' }); return; }

    await prisma.brand.delete({ where: { id } });
    res.json({ message: 'Brand deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete brand' });
  }
});

export default router;
