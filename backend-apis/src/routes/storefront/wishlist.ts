import express, { Request, Response } from 'express';
import prisma from '../../utils/db.js';
import { customerAuthMiddleware } from '../../middleware/customerAuth.js';

const router = express.Router();
router.use(customerAuthMiddleware);

const productSelect = {
  id: true, name: true, imageUrl: true,
  sellingPrice: true, originalPrice: true, unit: true, inStock: true,
};

function formatWishlistItem(item: {
  id: string; createdAt: Date;
  product: {
    id: string; name: string; imageUrl: string | null;
    sellingPrice: number; originalPrice: number | null; unit: string | null; inStock: boolean;
  };
}) {
  return {
    id: item.id,
    created_at: item.createdAt,
    product: {
      id: item.product.id,
      name: item.product.name,
      image_url: item.product.imageUrl,
      selling_price: item.product.sellingPrice,
      original_price: item.product.originalPrice,
      unit: item.product.unit,
      in_stock: item.product.inStock,
    },
  };
}

// GET /api/storefront/wishlist
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, storeId } = req.customer!;

    const items = await prisma.wishlistItem.findMany({
      where: { customerId, storeId },
      include: { product: { select: productSelect } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ items: items.map(formatWishlistItem) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// POST /api/storefront/wishlist
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, storeId } = req.customer!;
    const { product_id } = req.body;

    if (!product_id) { res.status(400).json({ error: 'product_id is required' }); return; }

    const product = await prisma.product.findFirst({ where: { id: product_id, storeId } });
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }

    const existing = await prisma.wishlistItem.findUnique({
      where: { customerId_productId: { customerId, productId: product_id } },
    });
    if (existing) { res.status(409).json({ error: 'Product already in wishlist' }); return; }

    const item = await prisma.wishlistItem.create({
      data: { customerId, productId: product_id, storeId },
      include: { product: { select: productSelect } },
    });

    res.status(201).json({ item: formatWishlistItem(item) });
  } catch {
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// DELETE /api/storefront/wishlist/:productId
router.delete('/:productId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, storeId } = req.customer!;

    const existing = await prisma.wishlistItem.findUnique({
      where: { customerId_productId: { customerId, productId: req.params.productId as string } },
    });
    if (!existing || existing.storeId !== storeId) { res.status(404).json({ error: 'Wishlist item not found' }); return; }

    await prisma.wishlistItem.delete({
      where: { customerId_productId: { customerId, productId: req.params.productId as string } },
    });

    res.json({ message: 'Item removed from wishlist' });
  } catch {
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

export default router;
