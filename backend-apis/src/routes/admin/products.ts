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

function formatProduct(p: {
  id: string; name: string; description: string | null;
  imageUrl: string | null; isActive: boolean;
  sellingPrice: number; originalPrice: number | null; unit: string | null; inStock: boolean;
  brandId: string | null; categoryId: string; storeId: string;
  createdAt: Date; updatedAt: Date;
  brand: { id: string; name: string } | null;
  category: { id: string; name: string };
}) {
  const discount =
    p.originalPrice && p.originalPrice > p.sellingPrice
      ? Math.round((1 - p.sellingPrice / p.originalPrice) * 100)
      : null;

  return {
    id: p.id,
    name: p.name,
    description: p.description,
    image_url: p.imageUrl,
    is_active: p.isActive,
    selling_price: p.sellingPrice,
    original_price: p.originalPrice,
    unit: p.unit,
    in_stock: p.inStock,
    discount_percent: discount,
    brand: p.brand ? { id: p.brand.id, name: p.brand.name } : null,
    category: { id: p.category.id, name: p.category.name },
    store_id: p.storeId,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

const productInclude = {
  include: {
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
      orderBy: { createdAt: 'asc' },
      ...productInclude,
    });

    res.json({ products: products.map(formatProduct) });
  } catch (err) {
    logger.error('GET /api/products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const product = await prisma.product.findFirst({
      where: { id: req.params.id as string, storeId },
      ...productInclude,
    });

    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
    res.json({ product: formatProduct(product) });
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

    const { name, description, brand_id, category_id, is_active,
            selling_price, original_price, unit, in_stock } = req.body;

    if (!name?.trim() || !category_id) {
      res.status(400).json({ error: 'name and category_id are required' }); return;
    }
    if (selling_price === undefined || selling_price === null || selling_price === '') {
      res.status(400).json({ error: 'selling_price is required' }); return;
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
        description: description?.trim() || null,
        imageUrl,
        isActive: is_active !== undefined ? is_active === 'true' || is_active === true : true,
        sellingPrice: parseFloat(selling_price),
        originalPrice: original_price ? parseFloat(original_price) : null,
        unit: unit?.trim() || null,
        inStock: in_stock !== undefined ? in_stock === 'true' || in_stock === true : true,
        brandId: brand_id || null,
        categoryId: category_id,
        storeId,
      },
      ...productInclude,
    });

    logger.info(`Product created: ${product.name}`);
    res.status(201).json({ product: formatProduct(product) });
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

    const { name, description, brand_id, category_id, is_active,
            selling_price, original_price, unit, in_stock } = req.body;

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
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(is_active !== undefined && { isActive: is_active === 'true' || is_active === true }),
        ...(selling_price !== undefined && { sellingPrice: parseFloat(selling_price) }),
        ...(original_price !== undefined && { originalPrice: original_price ? parseFloat(original_price) : null }),
        ...(unit !== undefined && { unit: unit?.trim() || null }),
        ...(in_stock !== undefined && { inStock: in_stock === 'true' || in_stock === true }),
        ...(brand_id !== undefined && { brandId: brand_id || null }),
        ...(category_id && { categoryId: category_id }),
      },
      ...productInclude,
    });

    logger.info(`Product updated: ${product.name}`);
    res.json({ product: formatProduct(product) });
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
