import express, { Request, Response } from 'express';
import prisma from '../../utils/db.js';
import { authMiddleware } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';
import upload from '../../middleware/upload.js';
import storageService from '../../external-services/storage.js';

const router = express.Router();

const formatCategory = (cat: {
  id: string; name: string; nameLocal: string | null; imageUrl: string | null;
  sortOrder: number; isActive: boolean; storeId: string; createdAt: Date;
}) => ({
  id: cat.id,
  name: cat.name,
  name_local: cat.nameLocal,
  image_url: cat.imageUrl,
  sort_order: cat.sortOrder,
  is_active: cat.isActive,
  store_id: cat.storeId,
  created_at: cat.createdAt,
});

router.use(authMiddleware);

// GET /api/categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userStore = await prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) { res.status(404).json({ error: 'No store found' }); return; }

    const categories = await prisma.category.findMany({
      where: { storeId: userStore.storeId },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({ categories: categories.map(formatCategory) });
  } catch (err) {
    logger.error('GET /api/categories error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/categories
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userStore = await prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) { res.status(404).json({ error: 'No store found' }); return; }

    const { name, name_local, sort_order, is_active } = req.body;
    if (!name) { res.status(400).json({ error: 'name is required' }); return; }

    let imageUrl: string | null = null;
    if (req.file) {
      imageUrl = await storageService.uploadImage(req.file.buffer, 'categories');
    }

    const category = await prisma.category.create({
      data: {
        name,
        nameLocal: name_local || null,
        imageUrl,
        sortOrder: sort_order ? parseInt(sort_order) : 0,
        isActive: is_active !== undefined ? is_active === 'true' || is_active === true : true,
        storeId: userStore.storeId,
      },
    });

    logger.info(`Category created: ${category.name}`);
    res.status(201).json({ category: formatCategory(category) });
  } catch (err) {
    logger.error('POST /api/categories error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/categories/:id
router.put('/:id', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userStore = await prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) { res.status(404).json({ error: 'No store found' }); return; }

    const existing = await prisma.category.findUnique({ where: { id: req.params.id as string } });
    if (!existing || existing.storeId !== userStore.storeId) {
      res.status(404).json({ error: 'Category not found' }); return;
    }

    const { name, name_local, sort_order, is_active } = req.body;

    let imageUrl: string | undefined = undefined;
    if (req.file) {
      imageUrl = await storageService.uploadImage(req.file.buffer, 'categories');
    }

    const newSortOrder = sort_order !== undefined ? parseInt(sort_order) : undefined;

    // Swap sort_order if another category in this store already has the requested value
    if (newSortOrder !== undefined && newSortOrder !== existing.sortOrder) {
      const conflict = await prisma.category.findFirst({
        where: { storeId: userStore.storeId, sortOrder: newSortOrder, id: { not: existing.id } },
      });
      if (conflict) {
        await prisma.category.update({
          where: { id: conflict.id },
          data: { sortOrder: existing.sortOrder },
        });
      }
    }

    const category = await prisma.category.update({
      where: { id: req.params.id as string },
      data: {
        ...(name && { name }),
        ...(name_local !== undefined && { nameLocal: name_local || null }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(newSortOrder !== undefined && { sortOrder: newSortOrder }),
        ...(is_active !== undefined && { isActive: is_active === 'true' || is_active === true }),
      },
    });

    logger.info(`Category updated: ${category.name}`);
    res.json({ category: formatCategory(category) });
  } catch (err) {
    logger.error('PUT /api/categories/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userStore = await prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) { res.status(404).json({ error: 'No store found' }); return; }

    const existing = await prisma.category.findUnique({ where: { id: req.params.id as string } });
    if (!existing || existing.storeId !== userStore.storeId) {
      res.status(404).json({ error: 'Category not found' }); return;
    }

    await prisma.category.delete({ where: { id: req.params.id as string } });
    logger.info(`Category deleted: ${existing.name}`);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    logger.error('DELETE /api/categories/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
