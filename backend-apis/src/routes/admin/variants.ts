import express, { Request, Response } from 'express';
import prisma from '../../utils/db.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

async function getStoreId(userId: string): Promise<string | null> {
  const userStore = await prisma.userStore.findFirst({ where: { userId } });
  return userStore?.storeId ?? null;
}

function formatVariant(v: {
  id: string; productId: string; name: string;
  costPrice: number | null; originalPrice: number | null; sellingPrice: number;
  taxPercentage: number; unit: string | null; isActive: boolean; sortOrder: number;
  createdAt: Date; updatedAt: Date;
  inventory: { qty: number; outOfStockLevel: number; updatedAt: Date } | null;
}) {
  return {
    id: v.id,
    product_id: v.productId,
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
  };
}

// GET /api/products/:productId/variants
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const productId = req.params.productId as string;
    const product = await prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }

    const variants = await prisma.productVariant.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
      include: { inventory: true },
    });

    res.json({ variants: variants.map(formatVariant) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch variants' });
  }
});

// POST /api/products/:productId/variants
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const productId = req.params.productId as string;
    const product = await prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }

    const { name, cost_price, original_price, selling_price, tax_percentage, unit, is_active, sort_order } = req.body;

    if (!name?.trim()) { res.status(400).json({ error: 'name is required' }); return; }
    if (selling_price === undefined || selling_price === null) { res.status(400).json({ error: 'selling_price is required' }); return; }

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        name: name.trim(),
        costPrice: cost_price != null ? parseFloat(cost_price) : null,
        originalPrice: original_price != null ? parseFloat(original_price) : null,
        sellingPrice: parseFloat(selling_price),
        taxPercentage: tax_percentage != null ? parseFloat(tax_percentage) : 0,
        unit: unit?.trim() || null,
        isActive: is_active !== undefined ? is_active === 'true' || is_active === true : true,
        sortOrder: sort_order != null ? parseInt(sort_order) : 0,
      },
      include: { inventory: true },
    });

    res.status(201).json({ variant: formatVariant(variant) });
  } catch {
    res.status(500).json({ error: 'Failed to create variant' });
  }
});

// PUT /api/products/:productId/variants/:variantId
router.put('/:variantId', async (req: Request, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const productId = req.params.productId as string;
    const variantId = req.params.variantId as string;

    const product = await prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }

    const existing = await prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!existing) { res.status(404).json({ error: 'Variant not found' }); return; }

    const { name, cost_price, original_price, selling_price, tax_percentage, unit, is_active, sort_order } = req.body;

    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(cost_price !== undefined && { costPrice: cost_price != null ? parseFloat(cost_price) : null }),
        ...(original_price !== undefined && { originalPrice: original_price != null ? parseFloat(original_price) : null }),
        ...(selling_price !== undefined && { sellingPrice: parseFloat(selling_price) }),
        ...(tax_percentage !== undefined && { taxPercentage: parseFloat(tax_percentage) }),
        ...(unit !== undefined && { unit: unit?.trim() || null }),
        ...(is_active !== undefined && { isActive: is_active === 'true' || is_active === true }),
        ...(sort_order !== undefined && { sortOrder: parseInt(sort_order) }),
      },
      include: { inventory: true },
    });

    res.json({ variant: formatVariant(variant) });
  } catch {
    res.status(500).json({ error: 'Failed to update variant' });
  }
});

// DELETE /api/products/:productId/variants/:variantId
router.delete('/:variantId', async (req: Request, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const productId = req.params.productId as string;
    const variantId = req.params.variantId as string;

    const product = await prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }

    const existing = await prisma.productVariant.findFirst({ where: { id: variantId, productId } });
    if (!existing) { res.status(404).json({ error: 'Variant not found' }); return; }

    await prisma.productVariant.delete({ where: { id: variantId } });
    res.json({ message: 'Variant deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete variant' });
  }
});

// POST /api/products/:productId/variants/:variantId/inventory — enable tracking
router.post('/:variantId/inventory', async (req: Request, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const productId = req.params.productId as string;
    const variantId = req.params.variantId as string;

    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId, product: { storeId } },
    });
    if (!variant) { res.status(404).json({ error: 'Variant not found' }); return; }

    const existing = await prisma.inventory.findUnique({ where: { variantId } });
    if (existing) { res.status(409).json({ error: 'Inventory tracking already enabled for this variant' }); return; }

    const { qty = 0, out_of_stock_level = 0 } = req.body;

    const inventory = await prisma.inventory.create({
      data: {
        variantId,
        storeId,
        qty: parseFloat(qty),
        outOfStockLevel: parseFloat(out_of_stock_level),
      },
    });

    res.status(201).json({
      inventory: { qty: inventory.qty, out_of_stock_level: inventory.outOfStockLevel, updated_at: inventory.updatedAt },
    });
  } catch {
    res.status(500).json({ error: 'Failed to enable inventory tracking' });
  }
});

// PATCH /api/products/:productId/variants/:variantId/inventory — adjust stock
router.patch('/:variantId/inventory', async (req: Request, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const variantId = req.params.variantId as string;
    const inv = await prisma.inventory.findFirst({ where: { variantId, storeId } });
    if (!inv) { res.status(404).json({ error: 'Inventory not found — enable tracking first' }); return; }

    const { add, qty, out_of_stock_level } = req.body;

    let newQty = inv.qty;
    if (add != null) newQty = inv.qty + parseFloat(add);
    if (qty != null) newQty = parseFloat(qty);

    const updated = await prisma.inventory.update({
      where: { variantId },
      data: {
        qty: newQty,
        ...(out_of_stock_level != null && { outOfStockLevel: parseFloat(out_of_stock_level) }),
      },
    });

    res.json({
      inventory: { qty: updated.qty, out_of_stock_level: updated.outOfStockLevel, updated_at: updated.updatedAt },
    });
  } catch {
    res.status(500).json({ error: 'Failed to update inventory' });
  }
});

// DELETE /api/products/:productId/variants/:variantId/inventory — disable tracking
router.delete('/:variantId/inventory', async (req: Request, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req.user!.userId);
    if (!storeId) { res.status(404).json({ error: 'No store found' }); return; }

    const variantId = req.params.variantId as string;
    const inv = await prisma.inventory.findFirst({ where: { variantId, storeId } });
    if (!inv) { res.status(404).json({ error: 'Inventory not found' }); return; }

    await prisma.inventory.delete({ where: { variantId } });
    res.json({ message: 'Inventory tracking disabled' });
  } catch {
    res.status(500).json({ error: 'Failed to disable inventory tracking' });
  }
});

export default router;
