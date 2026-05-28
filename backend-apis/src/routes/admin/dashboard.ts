import express, { Request, Response } from 'express';
import { OrderStatus } from '@prisma/client';
import prisma from '../../utils/db.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const userStore = await prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) { res.status(404).json({ error: 'No store found' }); return; }
    const storeId = userStore.storeId;

    const [
      totalOrders,
      revenueAgg,
      totalCustomers,
      totalProducts,
      outOfStockCount,
      ordersByStatus,
      recentOrders,
      outOfStockProducts,
    ] = await Promise.all([
      prisma.order.count({ where: { storeId } }),

      prisma.order.aggregate({
        where: { storeId, status: OrderStatus.DELIVERED },
        _sum: { totalAmount: true },
      }),

      prisma.customer.count({ where: { storeId } }),

      prisma.product.count({ where: { storeId, isActive: true } }),

      prisma.product.count({ where: { storeId, inStock: false, isActive: true } }),

      prisma.order.groupBy({
        by: ['status'],
        where: { storeId },
        _count: { id: true },
      }),

      prisma.order.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          customer: { select: { name: true, phone: true } },
        },
      }),

      prisma.product.findMany({
        where: { storeId, inStock: false, isActive: true },
        take: 5,
        select: { id: true, name: true, imageUrl: true, sellingPrice: true, category: { select: { name: true } } },
      }),
    ]);

    const statusMap = Object.fromEntries(
      ordersByStatus.map(r => [r.status, r._count.id])
    );

    res.json({
      total_orders: totalOrders,
      total_revenue: revenueAgg._sum.totalAmount ?? 0,
      total_customers: totalCustomers,
      total_products: totalProducts,
      out_of_stock_count: outOfStockCount,
      orders_by_status: {
        new: statusMap['NEW'] ?? 0,
        confirmed: statusMap['CONFIRMED'] ?? 0,
        out_for_delivery: statusMap['OUT_FOR_DELIVERY'] ?? 0,
        delivered: statusMap['DELIVERED'] ?? 0,
        cancelled: statusMap['CANCELLED'] ?? 0,
      },
      recent_orders: recentOrders.map(o => ({
        id: o.id,
        order_number: o.orderNumber,
        total_amount: o.totalAmount,
        status: o.status,
        created_at: o.createdAt,
        customer_name: o.customer.name ?? o.customer.phone,
      })),
      out_of_stock_products: outOfStockProducts.map(p => ({
        id: p.id,
        name: p.name,
        image_url: p.imageUrl,
        selling_price: p.sellingPrice,
        category: p.category.name,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
