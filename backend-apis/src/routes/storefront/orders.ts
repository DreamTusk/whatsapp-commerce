import express, { Request, Response } from 'express';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import prisma from '../../utils/db.js';
import { customerAuthMiddleware } from '../../middleware/customerAuth.js';

const router = express.Router();

async function getStore(domain: string) {
  return prisma.store.findUnique({ where: { domain } });
}

async function generateOrderNumber(storeId: string): Promise<string> {
  const last = await prisma.order.findFirst({
    where: { storeId },
    orderBy: { createdAt: 'desc' },
    select: { orderNumber: true },
  });
  const next = last ? (parseInt(last.orderNumber.replace('ORD-', ''), 10) || 0) + 1 : 1;
  return `ORD-${next.toString().padStart(4, '0')}`;
}

const formatOrderItem = (item: {
  id: string; productId: string; productName: string;
  price: number; quantity: number; subtotal: number;
}) => ({
  id: item.id,
  product_id: item.productId,
  product_name: item.productName,
  price: item.price,
  quantity: item.quantity,
  subtotal: item.subtotal,
});

const formatOrder = (o: {
  id: string; orderNumber: string; totalAmount: number; status: string;
  address: string | null; notes: string | null; createdAt: Date; updatedAt: Date;
  items: { id: string; productId: string; productName: string; price: number; quantity: number; subtotal: number }[];
  payment: { method: string; status: string; paidAt: Date | null } | null;
}) => ({
  id: o.id,
  order_number: o.orderNumber,
  total_amount: o.totalAmount,
  status: o.status,
  address: o.address,
  notes: o.notes,
  created_at: o.createdAt,
  updated_at: o.updatedAt,
  items: o.items.map(formatOrderItem),
  payment: o.payment ? {
    method: o.payment.method,
    status: o.payment.status,
    paid_at: o.payment.paidAt,
  } : null,
});

// GET /api/storefront/orders
router.get('/', customerAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.customer!;
    const orders = await prisma.order.findMany({
      where: { customerId },
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ orders: orders.map(formatOrder) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST /api/storefront/orders
router.post('/', customerAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, storeId } = req.customer!;
    const domain = req.headers['x-store-domain'] as string;
    if (!domain) { res.status(400).json({ error: 'x-store-domain header required' }); return; }

    const store = await getStore(domain);
    if (!store || store.id !== storeId) { res.status(404).json({ error: 'Store not found' }); return; }

    const { items, address, notes, alt_phone, name, door_no, street, city, state, country, pincode, payment_method = 'COD', latitude, longitude } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items array is required' }); return;
    }
    if (!address) { res.status(400).json({ error: 'address is required' }); return; }

    const method = payment_method.toUpperCase() === 'ONLINE' ? PaymentMethod.ONLINE : PaymentMethod.COD;

    const productIds: string[] = items.map((i: { product_id: string }) => i.product_id);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, storeId, isActive: true },
    });

    if (products.length !== productIds.length) {
      res.status(400).json({ error: 'One or more products are unavailable' }); return;
    }

    const outOfStock = products.find(p => !p.inStock);
    if (outOfStock) {
      res.status(400).json({ error: `"${outOfStock.name}" is out of stock` }); return;
    }

    const orderItemsData = items.map((item: { product_id: string; quantity: number }) => {
      const product = products.find(p => p.id === item.product_id)!;
      return {
        productId: product.id,
        productName: product.name,
        price: product.sellingPrice,
        quantity: item.quantity,
        subtotal: product.sellingPrice * item.quantity,
      };
    });

    const totalAmount = orderItemsData.reduce((sum, i) => sum + i.subtotal, 0);

    if (store.minOrderAmount > 0 && totalAmount < store.minOrderAmount) {
      res.status(400).json({ error: `Minimum order amount is ₹${store.minOrderAmount}` }); return;
    }

    let order: Prisma.OrderGetPayload<{ include: { items: true; payment: true } }> | undefined;
    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 50 + Math.random() * 150));
      const orderNumber = await generateOrderNumber(storeId);
      try {
        order = await prisma.order.create({
          data: {
            orderNumber,
            customerId,
            storeId,
            totalAmount,
            status: OrderStatus.NEW,
            address,
            notes: notes ?? null,
            altPhone: typeof alt_phone === 'string' && alt_phone.trim() ? alt_phone.trim() : null,
            doorNo: door_no?.trim() || null,
            street: street?.trim() || null,
            city: city?.trim() || null,
            state: state?.trim() || null,
            country: country?.trim() || null,
            pincode: pincode?.trim() || null,
            latitude: typeof latitude === 'number' ? latitude : null,
            longitude: typeof longitude === 'number' ? longitude : null,
            items: { create: orderItemsData },
            payment: { create: { method, status: PaymentStatus.PENDING } },
          },
          include: { items: true, payment: true },
        });
        break;
      } catch (err) {
        if ((err as { code?: string })?.code === 'P2002' && attempt < 4) continue;
        throw err;
      }
    }

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        address,
        doorNo: door_no?.trim() || null,
        street: street?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        country: country?.trim() || null,
        pincode: pincode?.trim() || null,
      },
    });

    await prisma.cartItem.deleteMany({ where: { customerId, storeId } });

    if (!order) { res.status(500).json({ error: 'Failed to generate order number' }); return; }
    res.status(201).json({ order: formatOrder(order) });
  } catch {
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// GET /api/storefront/orders/:id
router.get('/:id', customerAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.customer!;
    const order = await prisma.order.findFirst({
      where: { id: req.params.id as string, customerId },
      include: { items: true, payment: true },
    });

    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
    res.json({ order: formatOrder(order) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

export default router;
