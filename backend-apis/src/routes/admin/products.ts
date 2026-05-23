import express, { Request, Response } from 'express';
import prisma from '../../utils/db.js';
import { authMiddleware } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';
import upload from '../../middleware/upload.js';
import storageService from '../../external-services/storage.js';

const router = express.Router();
router.use(authMiddleware);

async function getStoreId(userId: string): Promise<string | null> {
  const userStore = await prisma.userStore.findFirst({ where: { userId } });
  return userStore?.storeId ?? null;
}

function formatProductSummary(p: {
  id: string; name: string; nameLocal: string | null; description: string | null;
  imageUrl: string | null; isActive: boolean; sortOrder: number;
  brandId: string | null; categoryId: string; storeId: string;
  createdAt: Date; updatedAt: Date;
  brand: { id: string; name: string } | null;
  category: { id: string; name: string };
  variants: { sellingPrice: number; originalPrice: number | null; isActive: boolean; inventory: { qty: number; outOfStockLevel: number } | null }[];
}) {
  const activeVariants = p.variants.filter(v => v.isActive);
  const prices = activeVariants.map(v => v.sellingPrice);
  const inStock = activeVariants.some(v =>
    v.inventory ? v.inventory.qty > v.inventory.outOfStockLevel : true
  );

  return {
    id: p.id,
    name: p.name,
    name_local: p.nameLocal,
    description: p.description,
    image_url: p.imageUrl,
    is_active: p.isActive,
    sort_order: p.sortOrder,
    brand: p.brand ? { id: p.brand.id, name: p.brand.name } : null,
    category: { id: p.category.id, name: p.category.name },
    store_id: p.storeId,
    variant_count: p.variants.length,
    price_range: prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
    in_stock: inStock,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

const variantInclude = {
  include: {
    variants: {
      select: {
        sellingPrice: true,
        originalPrice: true,
        isActive: true,
        inventory: { select: { qty: true, outOfStockLevel: true } },
      },
    },
    brand: { select: { id: true, name: true } },
    category: { select: { id: true, name: true } },
  },
};

// GET /api/products
router.get('/', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const { category_id, brand_id } = req.query;

    const products = await prisma.product.findMany({
      where: {
        storeId,
        ...(category_id ? { categoryId: category_id as string } : {}),
        ...(brand_id ? { brandId: brand_id as string } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      ...variantInclude,
    });

    res.json({ products: products.map(formatProductSummary) });
  } catch (err) {
    logger.error('GET /api/products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:id — full product with all variants + inventory
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const productId = req.params.id as string;
    const product = await prisma.product.findFirst({
      where: { id: productId, storeId },
      include: {
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        variants: {
          orderBy: { sortOrder: 'asc' },
          include: { inventory: true },
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
        is_active: product.isActive,
        sort_order: product.sortOrder,
        brand: product.brand,
        category: product.category,
        store_id: product.storeId,
        created_at: product.createdAt,
        updated_at: product.updatedAt,
        variants: product.variants.map(v => ({
          id: v.id,
          name: v.name,
          cost_price: v.costPrice,
          original_price: v.originalPrice,
          selling_price: v.sellingPrice,
          tax_percentage: v.taxPercentage,
          unit: v.unit,
          is_active: v.isActive,
          sort_order: v.sortOrder,
          created_at: v.createdAt,
          updated_at: v.updatedAt,
          inventory: v.inventory
            ? { qty: v.inventory.qty, out_of_stock_level: v.inventory.outOfStockLevel, updated_at: v.inventory.updatedAt }
            : null,
        })),
      },
    });
  } catch (err) {
    logger.error('GET /api/products/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const { name, name_local, description, brand_id, category_id, sort_order, is_active } = req.body;

    if (!name?.trim() || !category_id) {
      res.status(400).json({ error: 'name and category_id are required' }); return;
    }

    const category = await prisma.category.findFirst({ where: { id: category_id, storeId } });
    if (!category) { res.status(404).json({ error: 'Category not found' }); return; }

    if (brand_id) {
      const brand = await prisma.brand.findFirst({ where: { id: brand_id, storeId } });
      if (!brand) { res.status(404).json({ error: 'Brand not found' }); return; }
    }

    let imageUrl: string | null = null;
    if (req.file) {
      imageUrl = await storageService.uploadImage(req.file.buffer, 'products');
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        nameLocal: name_local?.trim() || null,
        description: description?.trim() || null,
        imageUrl,
        isActive: is_active !== undefined ? is_active === 'true' || is_active === true : true,
        sortOrder: sort_order ? parseInt(sort_order) : 0,
        brandId: brand_id || null,
        categoryId: category_id,
        storeId,
      },
      include: {
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        variants: { include: { inventory: { select: { qty: true, outOfStockLevel: true } } } },
      },
    });

    logger.info(`Product created: ${product.name}`);
    res.status(201).json({ product: formatProductSummary(product) });
  } catch (err) {
    logger.error('POST /api/products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/products/:id
router.put('/:id', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const productId = req.params.id as string;
    const existing = await prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!existing) { res.status(404).json({ error: 'Product not found' }); return; }

    const { name, name_local, description, brand_id, category_id, sort_order, is_active } = req.body;

    if (category_id) {
      const category = await prisma.category.findFirst({ where: { id: category_id, storeId } });
      if (!category) { res.status(404).json({ error: 'Category not found' }); return; }
    }

    if (brand_id) {
      const brand = await prisma.brand.findFirst({ where: { id: brand_id, storeId } });
      if (!brand) { res.status(404).json({ error: 'Brand not found' }); return; }
    }

    let imageUrl: string | undefined = undefined;
    if (req.file) {
      imageUrl = await storageService.uploadImage(req.file.buffer, 'products');
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(name && { name: name.trim() }),
        ...(name_local !== undefined && { nameLocal: name_local?.trim() || null }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(is_active !== undefined && { isActive: is_active === 'true' || is_active === true }),
        ...(sort_order !== undefined && { sortOrder: parseInt(sort_order) }),
        ...(brand_id !== undefined && { brandId: brand_id || null }),
        ...(category_id && { categoryId: category_id }),
      },
      include: {
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        variants: {
          select: {
            sellingPrice: true, originalPrice: true, isActive: true,
            inventory: { select: { qty: true, outOfStockLevel: true } },
          },
        },
      },
    });

    logger.info(`Product updated: ${product.name}`);
    res.json({ product: formatProductSummary(product) });
  } catch (err) {
    logger.error('PUT /api/products/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const productId = req.params.id as string;
    const existing = await prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!existing) { res.status(404).json({ error: 'Product not found' }); return; }

    await prisma.product.delete({ where: { id: productId } });
    logger.info(`Product deleted: ${existing.name}`);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    logger.error('DELETE /api/products/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
