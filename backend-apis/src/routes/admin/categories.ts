import express, { Request, Response } from 'express';
import prisma from '../../utils/db.js';
import { authMiddleware } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';
import upload from '../../middleware/upload.js';
import storageService from '../../external-services/storage.js';

const router = express.Router();
router.use(authMiddleware);

type RawCategory = {
  id: string; name: string; imageUrl: string | null;
  isActive: boolean; parentId: string | null; storeId: string; createdAt: Date;
};

function formatCategory(cat: RawCategory, children: RawCategory[] = []) {
  return {
    id: cat.id,
    name: cat.name,
    image_url: cat.imageUrl,
    is_active: cat.isActive,
    parent_id: cat.parentId,
    store_id: cat.storeId,
    created_at: cat.createdAt,
    children: children.map(c => formatCategory(c)),
  };
}

async function getStoreId(userId: string) {
  const userStore = await prisma.userStore.findFirst({ where: { userId } });
  return userStore?.storeId ?? null;
}

// GET /api/categories — top-level only, with children nested
router.get('/', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const all = await prisma.category.findMany({
      where: { storeId },
      orderBy: { createdAt: 'asc' },
    });

    const childrenMap = new Map<string, RawCategory[]>();
    for (const cat of all) {
      if (cat.parentId) {
        const arr = childrenMap.get(cat.parentId) ?? [];
        arr.push(cat);
        childrenMap.set(cat.parentId, arr);
      }
    }

    const topLevel = all
      .filter(c => !c.parentId)
      .map(c => formatCategory(c, childrenMap.get(c.id) ?? []));

    res.json({ categories: topLevel });
  } catch (err) {
    logger.error('GET /api/categories error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/categories
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const { name, is_active, parent_id } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: 'name is required' }); return; }

    if (parent_id) {
      const parent = await prisma.category.findFirst({ where: { id: parent_id, storeId } });
      if (!parent) { res.status(404).json({ error: 'Parent category not found' }); return; }
      if (parent.parentId) { res.status(400).json({ error: 'Only one level of sub-categories is allowed' }); return; }
    }

    let imageUrl: string | null = null;
    if (req.file) imageUrl = await storageService.uploadImage(req.file.buffer, 'categories');

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        imageUrl,
        isActive: is_active !== undefined ? is_active === 'true' || is_active === true : true,
        parentId: parent_id || null,
        storeId,
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
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const existing = await prisma.category.findFirst({ where: { id: req.params.id, storeId } });
    if (!existing) { res.status(404).json({ error: 'Category not found' }); return; }

    const { name, is_active, parent_id } = req.body;

    if (parent_id !== undefined && parent_id) {
      if (parent_id === req.params.id) { res.status(400).json({ error: 'Category cannot be its own parent' }); return; }
      const parent = await prisma.category.findFirst({ where: { id: parent_id, storeId } });
      if (!parent) { res.status(404).json({ error: 'Parent category not found' }); return; }
      if (parent.parentId) { res.status(400).json({ error: 'Only one level of sub-categories is allowed' }); return; }
    }

    let imageUrl: string | undefined = undefined;
    if (req.file) imageUrl = await storageService.uploadImage(req.file.buffer, 'categories');

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(is_active !== undefined && { isActive: is_active === 'true' || is_active === true }),
        ...(parent_id !== undefined && { parentId: parent_id || null }),
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
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const existing = await prisma.category.findFirst({
      where: { id: req.params.id, storeId },
      include: { children: true },
    });
    if (!existing) { res.status(404).json({ error: 'Category not found' }); return; }

    if (existing.children.length > 0) {
      res.status(400).json({ error: 'Delete all sub-categories first' }); return;
    }

    await prisma.category.delete({ where: { id: req.params.id } });
    logger.info(`Category deleted: ${existing.name}`);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    logger.error('DELETE /api/categories/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
