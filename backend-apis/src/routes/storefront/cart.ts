import express, { Request, Response } from 'express';
import prisma from '../../utils/db.js';
import { customerAuthMiddleware } from '../../middleware/customerAuth.js';

const router = express.Router();
router.use(customerAuthMiddleware);

const variantSelect = {
  id: true, name: true, sellingPrice: true, originalPrice: true,
  unit: true, isActive: true,
  product: { select: { id: true, name: true, nameLocal: true, imageUrl: true } },
  inventory: { select: { qty: true, outOfStockLevel: true } },
};

function isVariantAvailable(v: { isActive: boolean; inventory: { qty: number; outOfStockLevel: number } | null }) {
  if (!v.isActive) return false;
  if (v.inventory) return v.inventory.qty > v.inventory.outOfStockLevel;
  return true;
}

const formatItem = (item: {
  id: string; quantity: number; createdAt: Date; updatedAt: Date;
  variant: {
    id: string; name: string; sellingPrice: number; originalPrice: number | null;
    unit: string | null; isActive: boolean;
    product: { id: string; name: string; nameLocal: string | null; imageUrl: string | null };
    inventory: { qty: number; outOfStockLevel: number } | null;
  };
}) => ({
  id: item.id,
  quantity: item.quantity,
  created_at: item.createdAt,
  updated_at: item.updatedAt,
  variant: {
    id: item.variant.id,
    name: item.variant.name,
    selling_price: item.variant.sellingPrice,
    original_price: item.variant.originalPrice,
    unit: item.variant.unit,
    in_stock: isVariantAvailable(item.variant),
  },
  product: {
    id: item.variant.product.id,
    name: item.variant.product.name,
    name_local: item.variant.product.nameLocal,
    image_url: item.variant.product.imageUrl,
  },
});

// GET /api/storefront/cart
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, storeId } = req.customer!;

    const items = await prisma.cartItem.findMany({
      where: { customerId, storeId },
      include: { variant: { select: variantSelect } },
      orderBy: { createdAt: 'asc' },
    });

    const total = items.reduce((sum, i) => sum + i.variant.sellingPrice * i.quantity, 0);
    res.json({ items: items.map(formatItem), total });
  } catch {
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// POST /api/storefront/cart — add variant to cart
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, storeId } = req.customer!;
    const { variant_id, quantity = 1 } = req.body;

    if (!variant_id) { res.status(400).json({ error: 'variant_id is required' }); return; }
    if (quantity < 1) { res.status(400).json({ error: 'quantity must be at least 1' }); return; }

    const variant = await prisma.productVariant.findFirst({
      where: { id: variant_id, product: { storeId } },
      include: { inventory: { select: { qty: true, outOfStockLevel: true } } },
    });
    if (!variant) { res.status(404).json({ error: 'Variant not found' }); return; }
    if (!isVariantAvailable(variant)) { res.status(400).json({ error: 'Variant is out of stock' }); return; }

    const existing = await prisma.cartItem.findUnique({
      where: { customerId_variantId: { customerId, variantId: variant_id } },
    });

    const item = existing
      ? await prisma.cartItem.update({
          where: { customerId_variantId: { customerId, variantId: variant_id } },
          data: { quantity: existing.quantity + quantity },
          include: { variant: { select: variantSelect } },
        })
      : await prisma.cartItem.create({
          data: { customerId, variantId: variant_id, storeId, quantity },
          include: { variant: { select: variantSelect } },
        });

    res.status(201).json({ item: formatItem(item) });
  } catch {
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// PATCH /api/storefront/cart/:variantId — set quantity
router.patch('/:variantId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, storeId } = req.customer!;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) { res.status(400).json({ error: 'quantity must be at least 1' }); return; }

    const existing = await prisma.cartItem.findUnique({
      where: { customerId_variantId: { customerId, variantId: (req.params.variantId as string) } },
    });
    if (!existing || existing.storeId !== storeId) { res.status(404).json({ error: 'Cart item not found' }); return; }

    const item = await prisma.cartItem.update({
      where: { customerId_variantId: { customerId, variantId: (req.params.variantId as string) } },
      data: { quantity },
      include: { variant: { select: variantSelect } },
    });

    res.json({ item: formatItem(item) });
  } catch {
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

// DELETE /api/storefront/cart/:variantId
router.delete('/:variantId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, storeId } = req.customer!;

    const existing = await prisma.cartItem.findUnique({
      where: { customerId_variantId: { customerId, variantId: (req.params.variantId as string) } },
    });
    if (!existing || existing.storeId !== storeId) { res.status(404).json({ error: 'Cart item not found' }); return; }

    await prisma.cartItem.delete({
      where: { customerId_variantId: { customerId, variantId: (req.params.variantId as string) } },
    });

    res.json({ message: 'Item removed from cart' });
  } catch {
    res.status(500).json({ error: 'Failed to remove cart item' });
  }
});

// DELETE /api/storefront/cart — clear entire cart
router.delete('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, storeId } = req.customer!;
    await prisma.cartItem.deleteMany({ where: { customerId, storeId } });
    res.json({ message: 'Cart cleared' });
  } catch {
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

export default router;
