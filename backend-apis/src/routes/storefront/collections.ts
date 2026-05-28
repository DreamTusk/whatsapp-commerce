import express, { Request, Response } from 'express';
import prisma from '../../utils/db.js';
import logger from '../../utils/logger.js';
import { buildCriteriaWhere } from '../../utils/collection-criteria.js';

const formatProduct = (p: any) => ({
  id: p.id,
  name: p.name,
  image_url: p.imageUrl,
  selling_price: p.sellingPrice,
  original_price: p.originalPrice,
  in_stock: p.inStock,
  category_id: p.categoryId,
  brand_id: p.brandId,
  description: p.description,
});

const router = express.Router();

// GET /api/storefront/collections/:id
router.get('/:id', async (req: Request, res: Response) => {
  const domain = req.headers['x-store-domain'] as string;
  if (!domain) { res.status(400).json({ error: 'Missing x-store-domain header' }); return; }

  try {
    const store = await prisma.store.findUnique({ where: { domain } });
    if (!store) { res.status(404).json({ error: 'Store not found' }); return; }

    const id = req.params.id as string;
    const collection = await prisma.collection.findFirst({
      where: { id, storeId: store.id, isActive: true },
    });
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
        where: buildCriteriaWhere(collection.criteria, store.id),
        orderBy: { createdAt: 'desc' },
      });
      products = ps.map(formatProduct);
    }

    res.json({
      collection: {
        id: collection.id,
        name: collection.name,
        type: collection.type.toLowerCase(),
        image_url: collection.imageUrl,
      },
      products,
    });
  } catch (err) {
    logger.error('GET /api/storefront/collections/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
