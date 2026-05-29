import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private async getStoreId(userId: string): Promise<string> {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');
    return userStore.storeId;
  }

  async getStats(userId: string) {
    const storeId = await this.getStoreId(userId);

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
      this.prisma.order.count({ where: { storeId } }),

      this.prisma.order.aggregate({
        where: { storeId, status: OrderStatus.DELIVERED },
        _sum: { totalAmount: true },
      }),

      this.prisma.customer.count({ where: { storeId } }),

      this.prisma.product.count({ where: { storeId, isActive: true } }),

      this.prisma.product.count({ where: { storeId, inStock: false, isActive: true } }),

      this.prisma.order.groupBy({
        by: ['status'],
        where: { storeId },
        _count: { id: true },
      }),

      this.prisma.order.findMany({
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

      this.prisma.product.findMany({
        where: { storeId, inStock: false, isActive: true },
        take: 5,
        select: {
          id: true, name: true, imageUrl: true, sellingPrice: true,
          category: { select: { name: true } },
        },
      }),
    ]);

    const statusMap = Object.fromEntries(
      ordersByStatus.map((r) => [r.status, r._count.id]),
    );

    return {
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
      recent_orders: recentOrders.map((o) => ({
        id: o.id,
        order_number: o.orderNumber,
        total_amount: o.totalAmount,
        status: o.status,
        created_at: o.createdAt,
        customer_name: o.customer.name ?? o.customer.phone,
      })),
      out_of_stock_products: outOfStockProducts.map((p) => ({
        id: p.id,
        name: p.name,
        image_url: p.imageUrl,
        selling_price: p.sellingPrice,
        category: p.category.name,
      })),
    };
  }
}
