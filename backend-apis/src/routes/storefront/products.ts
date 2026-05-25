import express, { Request, Response } from 'express';
import prisma from '../../utils/db.js';
import logger from '../../utils/logger.js';

const router = express.Router();

const productInclude = {
  include: {
    brand: { select: { id: true, name: true } },
    category: {
      select: {
        id: true, name: true,
        parent: { select: { id: true, name: true } },
      },
    },
  },
};

function formatProduct(p: {
  id: string; name: string; description: string | null;
  imageUrl: string | null; isActive: boolean; categoryId: string;
  sellingPrice: number; originalPrice: number | null; unit: string | null; inStock: boolean;
  brand: { id: string; name: string } | null;
  category: { id: string; name: string; parent: { id: string; name: string } | null };
}) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    image_url: p.imageUrl,
    category_id: p.categoryId,
    category: {
      id: p.category.id,
      name: p.category.name,
      parent: p.category.parent,
    },
    brand: p.brand,
    selling_price: p.sellingPrice,
    original_price: p.originalPrice,
    unit: p.unit,
    in_stock: p.inStock,
  };
}

// GET /api/storefront/products
router.get('/', async (req: Request, res: Response) => {
  const domain = req.headers['x-store-domain'] as string;
  if (!domain) { res.status(400).json({ error: 'Missing x-store-domain header' }); return; }

  try {
    const store = await prisma.store.findUnique({ where: { domain } });
    if (!store) { res.status(404).json({ error: 'Store not found' }); return; }

    const { category_id } = req.query;

    let categoryFilter: { categoryId: string | { in: string[] } } | undefined;
    if (category_id) {
      // If parent category, expand to all children
      const children = await prisma.category.findMany({
        where: { parentId: category_id as string, storeId: store.id },
        select: { id: true },
      });
      if (children.length > 0) {
        categoryFilter = { categoryId: { in: children.map(c => c.id) } };
      } else {
        categoryFilter = { categoryId: category_id as string };
      }
    }

    const products = await prisma.product.findMany({
      where: { storeId: store.id, isActive: true, ...categoryFilter },
      orderBy: { createdAt: 'asc' },
      ...productInclude,
    });

    res.json({ products: products.map(formatProduct) });
  } catch (err) {
    logger.error('GET /api/storefront/products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/storefront/products/:id
router.get('/:id', async (req: Request, res: Response) => {
  const domain = req.headers['x-store-domain'] as string;
  if (!domain) { res.status(400).json({ error: 'Missing x-store-domain header' }); return; }

  try {
    const store = await prisma.store.findUnique({ where: { domain } });
    if (!store) { res.status(404).json({ error: 'Store not found' }); return; }

    const product = await prisma.product.findFirst({
      where: { id: req.params.id, storeId: store.id, isActive: true },
      ...productInclude,
    });

    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
    res.json({ product: formatProduct(product) });
  } catch (err) {
    logger.error('GET /api/storefront/products/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
