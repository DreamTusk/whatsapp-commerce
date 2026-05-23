import express, { Request, Response } from 'express';
import prisma from '../../utils/db.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/customers
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const userStore = await prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) { res.status(404).json({ error: 'No store found' }); return; }

    const customers = await prisma.customer.findMany({
      where: { storeId: userStore.storeId },
      include: {
        _count: { select: { orders: true } },
        orders: {
          select: { totalAmount: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate total spent per customer in one query
    const totals = await prisma.order.groupBy({
      by: ['customerId'],
      where: { storeId: userStore.storeId },
      _sum: { totalAmount: true },
    });
    const totalMap = new Map(totals.map(t => [t.customerId, t._sum.totalAmount ?? 0]));

    const formatted = customers.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      order_count: c._count.orders,
      total_spent: totalMap.get(c.id) ?? 0,
      last_order_at: c.orders[0]?.createdAt ?? null,
      joined_at: c.createdAt,
    }));

    res.json({ customers: formatted });
  } catch {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

export default router;
