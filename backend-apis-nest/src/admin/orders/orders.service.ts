import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

const orderInclude = {
  customer: { select: { name: true, phone: true } },
  items: true,
  payment: true,
};

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private formatOrderItem(item: {
    id: string; productId: string; productName: string;
    price: number; quantity: number; subtotal: number;
  }) {
    return {
      id: item.id,
      product_id: item.productId,
      product_name: item.productName,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal,
    };
  }

  private formatPayment(p: any) {
    if (!p) return null;
    return {
      id: p.id,
      method: p.method,
      status: p.status,
      razorpay_link_id: p.razorpayLinkId,
      razorpay_payment_id: p.razorpayPaymentId,
      paid_at: p.paidAt,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    };
  }

  private formatOrder(o: any) {
    return {
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
      cancelled_by: o.cancelledBy ?? null,
      created_at: o.createdAt,
      updated_at: o.updatedAt,
      customer: { name: o.customer.name, phone: o.customer.phone },
      items: o.items.map((i: any) => this.formatOrderItem(i)),
      payment: this.formatPayment(o.payment),
    };
  }

  private async notifyCustomer(
    storeId: string,
    customerPhone: string | null,
    orderNumber: string,
    status: OrderStatus,
    cancellationReason?: string,
  ): Promise<void> {
    if (!customerPhone) return;

    const messages: Partial<Record<OrderStatus, string>> = {
      [OrderStatus.CONFIRMED]: `✅ Your order *${orderNumber}* has been confirmed! We're preparing it now.`,
      [OrderStatus.OUT_FOR_DELIVERY]: `🛵 Your order *${orderNumber}* is on its way! Get ready to receive it.`,
      [OrderStatus.DELIVERED]: `🎉 Your order *${orderNumber}* has been delivered. Thank you for shopping with us!`,
      [OrderStatus.CANCELLED]: `❌ Your order *${orderNumber}* has been cancelled.\n\n*Reason:* ${cancellationReason}`,
    };

    const message = messages[status];
    if (!message) return;

    // TODO: send via WhatsApp Business API — see pending-integrations.md
    console.log(`\n📱 ORDER NOTIFICATION\nTo: ${customerPhone}\n${message}\n`);
  }

  private async getStoreId(userId: string): Promise<string> {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');
    return userStore.storeId;
  }

  async listOrders(
    userId: string,
    filters: { status?: string; payment_method?: string; start_date?: string; end_date?: string },
  ) {
    const storeId = await this.getStoreId(userId);

    const where: Record<string, unknown> = { storeId };
    if (filters.status) where.status = filters.status;
    if (filters.payment_method) where.payment = { method: filters.payment_method.toUpperCase() };
    if (filters.start_date || filters.end_date) {
      const createdAt: Record<string, Date> = {};
      if (filters.start_date) createdAt.gte = new Date(filters.start_date);
      if (filters.end_date) createdAt.lte = new Date(filters.end_date);
      where.createdAt = createdAt;
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });

    return { orders: orders.map((o) => this.formatOrder(o)) };
  }

  async getOrder(userId: string, orderId: string) {
    const storeId = await this.getStoreId(userId);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('Order not found');

    return { order: this.formatOrder(order) };
  }

  async updateOrderStatus(
    userId: string,
    orderId: string,
    status: string,
    cancellation_reason?: string,
  ) {
    if (!status) throw new BadRequestException('status is required');

    const validStatuses = Object.values(OrderStatus);
    if (!validStatuses.includes(status as OrderStatus)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    if (status === OrderStatus.CANCELLED && !cancellation_reason?.trim()) {
      throw new BadRequestException('cancellation_reason is required when cancelling an order');
    }

    const storeId = await this.getStoreId(userId);

    const existing = await this.prisma.order.findFirst({ where: { id: orderId, storeId } });
    if (!existing) throw new NotFoundException('Order not found');

    const updateData: any = { status };
    if (status === OrderStatus.CANCELLED) {
      updateData.cancellationReason = cancellation_reason!.trim();
      updateData.cancelledBy = 'STORE';
    }

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: orderInclude,
    });

    // Fire-and-forget — never blocks the response
    this.notifyCustomer(storeId, order.customer.phone, order.orderNumber, status as OrderStatus, updateData.cancellationReason).catch(() => {});

    return { order: this.formatOrder(order) };
  }
}
