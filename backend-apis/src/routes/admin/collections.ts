import express, { Request, Response } from 'express';
import prisma from '../../utils/db.js';
import { authMiddleware } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';
import { buildCriteriaWhere } from '../../utils/collection-criteria.js';

const router = express.Router();
router.use(authMiddleware);

async function getStoreId(userId: string): Promise<string | null> {
  const userStore = await prisma.userStore.findFirst({ where: { userId } });
  return userStore?.storeId ?? null;
}

const formatProduct = (p: any) => ({
  id: p.id,
  name: p.name,
  image_url: p.imageUrl,
  selling_price: p.sellingPrice,
  original_price: p.originalPrice,
  unit: p.unit,
  in_stock: p.inStock,
  category_id: p.categoryId,
  brand_id: p.brandId,
});

const formatCollection = (c: any) => ({
  id: c.id,
  name: c.name,
  type: c.type.toLowerCase(),
  criteria: c.criteria ?? null,
  is_active: c.isActive,
  display_order: c.displayOrder,
  image_url: c.imageUrl,
  created_at: c.createdAt,
  updated_at: c.updatedAt,
});

// GET /api/collections
router.get('/', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'Store not found' }); return; }

    const collections = await prisma.collection.findMany({
      where: { storeId },
      orderBy: { displayOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    });

    res.json({
      collections: collections.map(c => ({
        ...formatCollection(c),
        product_count: c._count.products,
      })),
    });
  } catch (err) {
    logger.error('GET /api/collections error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/collections
router.post('/', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'Store not found' }); return; }

    const { name, type, criteria, display_order, image_url, product_ids } = req.body;

    if (!name || !type) {
      res.status(400).json({ error: 'name and type are required' });
      return;
    }
    if (!['manual', 'auto'].includes(type)) {
      res.status(400).json({ error: 'type must be manual or auto' });
      return;
    }
    if (type === 'auto' && (!criteria || !Array.isArray(criteria.filters) || criteria.filters.length === 0)) {
      res.status(400).json({ error: 'criteria with at least one filter is required for auto collections' });
      return;
    }

    // Auto-assign display_order as next in sequence if not provided
    let resolvedOrder = display_order !== undefined ? Number(display_order) : null;
    if (resolvedOrder === null) {
      const count = await prisma.collection.count({ where: { storeId } });
      resolvedOrder = count;
    }

    const collection = await prisma.collection.create({
      data: {
        storeId,
        name,
        type: type.toUpperCase() as 'MANUAL' | 'AUTO',
        criteria: type === 'auto' ? criteria : undefined,
        displayOrder: resolvedOrder,
        imageUrl: image_url || null,
      },
    });

    if (type === 'manual' && Array.isArray(product_ids) && product_ids.length > 0) {
      await prisma.collectionProduct.createMany({
        data: product_ids.map((productId: string, idx: number) => ({
          collectionId: collection.id,
          productId,
          position: idx,
        })),
        skipDuplicates: true,
      });
    }

    logger.info(`Collection created: ${collection.name} (${collection.type})`);
    res.status(201).json({ collection: formatCollection(collection) });
  } catch (err) {
    logger.error('POST /api/collections error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/collections/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'Store not found' }); return; }

    const collection = await prisma.collection.findFirst({ where: { id, storeId } });
    if (!collection) { res.status(404).json({ error: 'Collection not found' }); return; }

    let products: any[] = [];
    if (collection.type === 'MANUAL') {
      const cp = await prisma.collectionProduct.findMany({
        where: { collectionId: collection.id },
        orderBy: { position: 'asc' },
        include: { product: true },
      });
      products = cp.map(({ product }) => formatProduct(product));
    } else {
      const ps = await prisma.product.findMany({
        where: buildCriteriaWhere(collection.criteria, storeId),
        orderBy: { createdAt: 'desc' },
      });
      products = ps.map(formatProduct);
    }

    res.json({ collection: { ...formatCollection(collection), products } });
  } catch (err) {
    logger.error('GET /api/collections/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/collections/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'Store not found' }); return; }

    const existing = await prisma.collection.findFirst({ where: { id, storeId } });
    if (!existing) { res.status(404).json({ error: 'Collection not found' }); return; }

    const { name, criteria, is_active, display_order, image_url } = req.body;

    const collection = await prisma.collection.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(criteria !== undefined && { criteria }),
        ...(is_active !== undefined && { isActive: is_active === true || is_active === 'true' }),
        ...(display_order !== undefined && { displayOrder: Number(display_order) }),
        ...(image_url !== undefined && { imageUrl: image_url || null }),
      },
    });

    res.json({ collection: formatCollection(collection) });
  } catch (err) {
    logger.error('PUT /api/collections/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/collections/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'Store not found' }); return; }

    const existing = await prisma.collection.findFirst({ where: { id, storeId } });
    if (!existing) { res.status(404).json({ error: 'Collection not found' }); return; }

    await prisma.collection.delete({ where: { id } });

    logger.info(`Collection deleted: ${existing.name}`);
    res.json({ message: 'Collection deleted' });
  } catch (err) {
    logger.error('DELETE /api/collections/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/collections/reorder — reorder the collection list
router.patch('/reorder', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'Store not found' }); return; }

    const { collection_ids } = req.body;
    if (!Array.isArray(collection_ids)) {
      res.status(400).json({ error: 'collection_ids array is required' });
      return;
    }

    await Promise.all(
      collection_ids.map((id: string, idx: number) =>
        prisma.collection.updateMany({
          where: { id, storeId },
          data: { displayOrder: idx },
        })
      )
    );

    res.json({ message: 'Collections reordered' });
  } catch (err) {
    logger.error('PATCH /api/collections/reorder error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/collections/:id/products — add products to a manual collection
router.post('/:id/products', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'Store not found' }); return; }

    const collection = await prisma.collection.findFirst({ where: { id, storeId } });
    if (!collection) { res.status(404).json({ error: 'Collection not found' }); return; }
    if (collection.type !== 'MANUAL') {
      res.status(400).json({ error: 'Only manual collections support product management' });
      return;
    }

    const { product_ids } = req.body;
    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      res.status(400).json({ error: 'product_ids array is required' });
      return;
    }

    const maxPos = await prisma.collectionProduct.aggregate({
      where: { collectionId: collection.id },
      _max: { position: true },
    });
    const startPos = (maxPos._max.position ?? -1) + 1;

    await prisma.collectionProduct.createMany({
      data: product_ids.map((productId: string, idx: number) => ({
        collectionId: collection.id,
        productId,
        position: startPos + idx,
      })),
      skipDuplicates: true,
    });

    res.json({ message: 'Products added to collection' });
  } catch (err) {
    logger.error('POST /api/collections/:id/products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/collections/:id/products/:productId
router.delete('/:id/products/:productId', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const productId = req.params.productId as string;
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'Store not found' }); return; }

    const collection = await prisma.collection.findFirst({ where: { id, storeId } });
    if (!collection) { res.status(404).json({ error: 'Collection not found' }); return; }

    await prisma.collectionProduct.deleteMany({
      where: { collectionId: collection.id, productId },
    });

    res.json({ message: 'Product removed from collection' });
  } catch (err) {
    logger.error('DELETE /api/collections/:id/products/:productId error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/collections/:id/products/reorder — reorder products in a manual collection
router.patch('/:id/products/reorder', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'Store not found' }); return; }

    const collection = await prisma.collection.findFirst({ where: { id, storeId } });
    if (!collection) { res.status(404).json({ error: 'Collection not found' }); return; }

    const { product_ids } = req.body;
    if (!Array.isArray(product_ids)) {
      res.status(400).json({ error: 'product_ids array is required' });
      return;
    }

    await Promise.all(
      product_ids.map((productId: string, idx: number) =>
        prisma.collectionProduct.update({
          where: { collectionId_productId: { collectionId: collection.id, productId } },
          data: { position: idx },
        })
      )
    );

    res.json({ message: 'Products reordered' });
  } catch (err) {
    logger.error('PATCH /api/collections/:id/products/reorder error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
