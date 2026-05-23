import express, { Request, Response } from 'express';
import { OrderStatus } from '@prisma/client';
import prisma from '../../utils/db.js';
import { authMiddleware } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';

const router = express.Router();

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

const formatPayment = (p: {
  id: string; method: string; status: string;
  razorpayLinkId: string | null; razorpayPaymentId: string | null;
  paidAt: Date | null; createdAt: Date; updatedAt: Date;
} | null) => p ? ({
  id: p.id,
  method: p.method,
  status: p.status,
  razorpay_link_id: p.razorpayLinkId,
  razorpay_payment_id: p.razorpayPaymentId,
  paid_at: p.paidAt,
  created_at: p.createdAt,
  updated_at: p.updatedAt,
}) : null;

const formatOrder = (o: {
  id: string; orderNumber: string; customerId: string; storeId: string;
  totalAmount: number; status: string; address: string | null;
  doorNo: string | null; street: string | null; city: string | null;
  state: string | null; country: string | null; pincode: string | null;
  latitude: number | null; longitude: number | null;
  notes: string | null; altPhone: string | null; cancellationReason?: string | null;
  createdAt: Date; updatedAt: Date;
  customer: { name: string | null; phone: string | null };
  items: { id: string; productId: string; productName: string; price: number; quantity: number; subtotal: number }[];
  payment: { id: string; method: string; status: string; razorpayLinkId: string | null; razorpayPaymentId: string | null; paidAt: Date | null; createdAt: Date; updatedAt: Date } | null;
}) => ({
  id: o.id,
  order_number: o.orderNumber,
  customer_id: o.customerId,
  store_id: o.storeId,
  total_amount: o.totalAmount,
  status: o.status,
  address: o.address,
  door_no: o.doorNo,
  street: o.street,
  city: o.city,
  state: o.state,
  country: o.country,
  pincode: o.pincode,
  latitude: o.latitude,
  longitude: o.longitude,
  notes: o.notes,
  alt_phone: o.altPhone,
  cancellation_reason: o.cancellationReason,
  created_at: o.createdAt,
  updated_at: o.updatedAt,
  customer: { name: o.customer.name, phone: o.customer.phone },
  items: o.items.map(formatOrderItem),
  payment: formatPayment(o.payment),
});

const ORDER_STATUS_MESSAGES: Partial<Record<OrderStatus, (orderNumber: string, storeName: string, storePhone: string, reason?: string) => string>> = {
  [OrderStatus.CONFIRMED]: (num, store) =>
    `✅ Your order *${num}* from *${store}* has been confirmed! We're preparing it now.`,
  [OrderStatus.OUT_FOR_DELIVERY]: (num, store) =>
    `🛵 Your order *${num}* from *${store}* is on its way! Get ready to receive it.`,
  [OrderStatus.DELIVERED]: (num, store) =>
    `🎉 Your order *${num}* from *${store}* has been delivered. Thank you for shopping with us!`,
  [OrderStatus.CANCELLED]: (num, store, phone, reason) =>
    `❌ Your order *${num}* from *${store}* has been cancelled.\n\n*Reason:* ${reason}\n\nFor any queries, contact us at ${phone}.`,
};

async function notifyCustomer(
  storeId: string,
  customerPhone: string | null,
  orderNumber: string,
  status: OrderStatus,
  cancellationReason?: string
): Promise<void> {
  if (!customerPhone) return;

  const messageFn = ORDER_STATUS_MESSAGES[status];
  if (!messageFn) return;

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return;

  const message = messageFn(orderNumber, store.name, store.phone, cancellationReason);

  // TODO: send via WhatsApp Business API — see pending-integrations.md
  logger.info(`\n📱 ORDER NOTIFICATION\nTo: ${customerPhone}\n${message}\n`);
}

router.use(authMiddleware);

// GET /api/orders
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const userStore = await prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) { res.status(404).json({ error: 'No store found' }); return; }

    const { status, payment_method, start_date, end_date } = req.query;

    const where: Record<string, unknown> = { storeId: userStore.storeId };
    if (status) where.status = status;
    if (payment_method) where.payment = { method: (payment_method as string).toUpperCase() };
    if (start_date || end_date) {
      const createdAt: Record<string, Date> = {};
      if (start_date) createdAt.gte = new Date(start_date as string);
      if (end_date) createdAt.lte = new Date(end_date as string);
      where.createdAt = createdAt;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true } },
        items: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ orders: orders.map(formatOrder) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const userStore = await prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) { res.status(404).json({ error: 'No store found' }); return; }

    const order = await prisma.order.findFirst({
      where: { id: req.params.id as string, storeId: userStore.storeId },
      include: {
        customer: { select: { name: true, phone: true } },
        items: true,
        payment: true,
      },
    });

    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }

    res.json({ order: formatOrder(order) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PUT /api/orders/:id/status
router.put('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const userStore = await prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) { res.status(404).json({ error: 'No store found' }); return; }

    const { status, cancellation_reason } = req.body;
    if (!status) { res.status(400).json({ error: 'status is required' }); return; }

    const validStatuses = Object.values(OrderStatus);
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    if (status === OrderStatus.CANCELLED && !cancellation_reason?.trim()) {
      res.status(400).json({ error: 'cancellation_reason is required when cancelling an order' });
      return;
    }

    const existing = await prisma.order.findFirst({
      where: { id: req.params.id as string, storeId: userStore.storeId },
    });
    if (!existing) { res.status(404).json({ error: 'Order not found' }); return; }

    const updateData: { status: OrderStatus; cancellationReason?: string } = { status };
    if (status === OrderStatus.CANCELLED) {
      updateData.cancellationReason = cancellation_reason.trim();
    }

    const order = await prisma.order.update({
      where: { id: req.params.id as string },
      data: updateData,
      include: {
        customer: { select: { name: true, phone: true } },
        items: true,
        payment: true,
      },
    });

    // Fire-and-forget notification — never blocks the response
    notifyCustomer(
      userStore.storeId,
      order.customer.phone,
      order.orderNumber,
      status,
      updateData.cancellationReason
    ).catch(() => {});

    res.json({ order: formatOrder(order) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

export default router;
