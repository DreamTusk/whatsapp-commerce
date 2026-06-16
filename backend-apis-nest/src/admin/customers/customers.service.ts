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

  async getCustomer(userId: string, customerId: string) {
    const storeId = await this.getStoreId(userId);

    const c = await this.prisma.customer.findFirst({
      where: { id: customerId, storeId },
      include: {
        _count: { select: { Order: true } },
        CustomerAddress: { orderBy: [{ isDefault: 'desc' as const }, { createdAt: 'asc' as const }] },
      },
    });
    if (!c) throw new NotFoundException('Customer not found');

    const [totals] = await this.prisma.order.groupBy({
      by: ['customerId'],
      where: { customerId, storeId },
      _sum: { totalAmount: true },
    });

    return {
      customer: {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        order_count: c._count.Order,
        total_spent: totals?._sum.totalAmount ?? 0,
        joined_at: c.createdAt,
        addresses: c.CustomerAddress.map((a) => ({
          id: a.id,
          label: a.label,
          door_no: a.doorNo,
          street: a.street,
          city: a.city,
          state: a.state,
          country: a.country,
          pincode: a.pincode,
          is_default: a.isDefault,
        })),
      },
    };
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
