import express, { Request, Response } from 'express';
import prisma from '../../utils/db.js';
import { customerAuthMiddleware } from '../../middleware/customerAuth.js';

const router = express.Router();
router.use(customerAuthMiddleware);

const formatItem = (item: {
  id: string; quantity: number; createdAt: Date; updatedAt: Date;
  product: {
    id: string; name: string; imageUrl: string | null;
    sellingPrice: number; originalPrice: number | null; unit: string | null; inStock: boolean;
  };
}) => ({
  id: item.id,
  quantity: item.quantity,
  created_at: item.createdAt,
  updated_at: item.updatedAt,
  product: {
    id: item.product.id,
    name: item.product.name,
    image_url: item.product.imageUrl,
    selling_price: item.product.sellingPrice,
    original_price: item.product.originalPrice,
    unit: item.product.unit,
    in_stock: item.product.inStock,
  },
});

const productSelect = {
  id: true, name: true, imageUrl: true,
  sellingPrice: true, originalPrice: true, unit: true, inStock: true,
};

// GET /api/storefront/cart
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, storeId } = req.customer!;

    const items = await prisma.cartItem.findMany({
      where: { customerId, storeId },
      include: { product: { select: productSelect } },
      orderBy: { createdAt: 'asc' },
    });

    const total = items.reduce((sum, i) => sum + i.product.sellingPrice * i.quantity, 0);
    res.json({ items: items.map(formatItem), total });
  } catch {
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// POST /api/storefront/cart — add product to cart
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, storeId } = req.customer!;
    const { product_id, quantity = 1 } = req.body;

    if (!product_id) { res.status(400).json({ error: 'product_id is required' }); return; }
    if (quantity < 1) { res.status(400).json({ error: 'quantity must be at least 1' }); return; }

    const product = await prisma.product.findFirst({
      where: { id: product_id, storeId, isActive: true },
      select: productSelect,
    });
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
    if (!product.inStock) { res.status(400).json({ error: 'Product is out of stock' }); return; }

    const existing = await prisma.cartItem.findUnique({
      where: { customerId_productId: { customerId, productId: product_id } },
    });

    const item = existing
      ? await prisma.cartItem.update({
          where: { customerId_productId: { customerId, productId: product_id } },
          data: { quantity: existing.quantity + quantity },
          include: { product: { select: productSelect } },
        })
      : await prisma.cartItem.create({
          data: { customerId, productId: product_id, storeId, quantity },
          include: { product: { select: productSelect } },
        });

    res.status(201).json({ item: formatItem(item) });
  } catch {
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// PATCH /api/storefront/cart/:productId — set quantity
router.patch('/:productId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, storeId } = req.customer!;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) { res.status(400).json({ error: 'quantity must be at least 1' }); return; }

    const existing = await prisma.cartItem.findUnique({
      where: { customerId_productId: { customerId, productId: req.params.productId as string } },
    });
    if (!existing || existing.storeId !== storeId) { res.status(404).json({ error: 'Cart item not found' }); return; }

    const item = await prisma.cartItem.update({
      where: { customerId_productId: { customerId, productId: req.params.productId as string } },
      data: { quantity },
      include: { product: { select: productSelect } },
    });

    res.json({ item: formatItem(item) });
  } catch {
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

// DELETE /api/storefront/cart/:productId
router.delete('/:productId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, storeId } = req.customer!;

    const existing = await prisma.cartItem.findUnique({
      where: { customerId_productId: { customerId, productId: req.params.productId as string } },
    });
    if (!existing || existing.storeId !== storeId) { res.status(404).json({ error: 'Cart item not found' }); return; }

    await prisma.cartItem.delete({
      where: { customerId_productId: { customerId, productId: req.params.productId as string } },
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
