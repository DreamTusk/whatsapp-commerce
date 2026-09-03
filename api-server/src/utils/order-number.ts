import { PrismaService } from '../prisma/prisma.service';

export async function generateOrderNumber(prisma: PrismaService, storeId: string): Promise<string> {
  const last = await prisma.order.findFirst({
    where: { storeId },
    orderBy: { createdAt: 'desc' },
    select: { orderNumber: true },
  });
  const next = last ? (parseInt(last.orderNumber.replace('ORD-', ''), 10) || 0) + 1 : 1;
  return `ORD-${next.toString().padStart(4, '0')}`;
}
