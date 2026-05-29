import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  private async getStoreId(userId: string): Promise<string> {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');
    return userStore.storeId;
  }

  async listCustomers(userId: string) {
    const storeId = await this.getStoreId(userId);

    const customers = await this.prisma.customer.findMany({
      where: { storeId },
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

    const totals = await this.prisma.order.groupBy({
      by: ['customerId'],
      where: { storeId },
      _sum: { totalAmount: true },
    });
    const totalMap = new Map(totals.map((t) => [t.customerId, t._sum.totalAmount ?? 0]));

    return {
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        order_count: c._count.orders,
        total_spent: totalMap.get(c.id) ?? 0,
        last_order_at: c.orders[0]?.createdAt ?? null,
        joined_at: c.createdAt,
      })),
    };
  }
}
