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

  async searchCustomers(userId: string, q: string) {
    const storeId = await this.getStoreId(userId);
    if (!q || q.trim().length < 1) return { customers: [] };

    const customers = await this.prisma.customer.findMany({
      where: {
        storeId,
        OR: [
          { phone: { contains: q.trim(), mode: 'insensitive' } },
          { name: { contains: q.trim(), mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, phone: true, email: true },
      take: 10,
    });

    return { customers };
  }

  async listCustomers(userId: string) {
    const storeId = await this.getStoreId(userId);

    const customers = await this.prisma.customer.findMany({
      where: { storeId },
      include: {
        _count: { select: { Order: true } },
        Order: {
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
        order_count: c._count.Order,
        total_spent: totalMap.get(c.id) ?? 0,
        last_order_at: c.Order[0]?.createdAt ?? null,
        joined_at: c.createdAt,
      })),
    };
  }
}
