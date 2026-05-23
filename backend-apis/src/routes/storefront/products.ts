import express, { Request, Response } from 'express';
import prisma from '../../utils/db.js';
import logger from '../../utils/logger.js';

const router = express.Router();

function isVariantAvailable(v: { isActive: boolean; inventory: { qty: number; outOfStockLevel: number } | null }) {
  if (!v.isActive) return false;
  if (v.inventory) return v.inventory.qty > v.inventory.outOfStockLevel;
  return true;
}

// GET /api/storefront/products
router.get('/', async (req: Request, res: Response) => {
  const domain = req.headers['x-store-domain'] as string;
  if (!domain) { res.status(400).json({ error: 'Missing x-store-domain header' }); return; }

  try {
    const store = await prisma.store.findUnique({ where: { domain } });
    if (!store) { res.status(404).json({ error: 'Store not found' }); return; }

    const { category_id } = req.query;

    const products = await prisma.product.findMany({
      where: {
        storeId: store.id,
        isActive: true,
        variants: { some: { isActive: true } },
        ...(category_id ? { categoryId: category_id as string } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true, name: true, nameLocal: true, description: true,
        imageUrl: true, sortOrder: true, categoryId: true,
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true, name: true, sellingPrice: true, originalPrice: true,
            unit: true, isActive: true,
            inventory: { select: { qty: true, outOfStockLevel: true } },
          },
        },
      },
    });

    res.json({
      products: products.map(p => {
        const availableVariants = p.variants.filter(isVariantAvailable);
        const prices = p.variants.map(v => v.sellingPrice);
        return {
          id: p.id,
          name: p.name,
          name_local: p.nameLocal,
          description: p.description,
          image_url: p.imageUrl,
          sort_order: p.sortOrder,
          category_id: p.categoryId,
          in_stock: availableVariants.length > 0,
          price_range: prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
          variants: p.variants.map(v => ({
            id: v.id,
            name: v.name,
            selling_price: v.sellingPrice,
            original_price: v.originalPrice,
            unit: v.unit,
            in_stock: isVariantAvailable(v),
          })),
        };
      }),
    });
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
      where: { id: req.params.id as string, storeId: store.id, isActive: true },
      include: {
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, nameLocal: true } },
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: { inventory: { select: { qty: true, outOfStockLevel: true } } },
        },
      },
    });

    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }

    res.json({
      product: {
        id: product.id,
        name: product.name,
        name_local: product.nameLocal,
        description: product.description,
        image_url: product.imageUrl,
        category_id: product.categoryId,
        category: product.category,
        brand: product.brand,
        in_stock: product.variants.some(isVariantAvailable),
        variants: product.variants.map(v => ({
          id: v.id,
          name: v.name,
          selling_price: v.sellingPrice,
          original_price: v.originalPrice,
          unit: v.unit,
          tax_percentage: v.taxPercentage,
          in_stock: isVariantAvailable(v),
        })),
      },
    });
  } catch (err) {
    logger.error('GET /api/storefront/products/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
