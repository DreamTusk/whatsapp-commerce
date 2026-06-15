import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, OrderSource, PaymentMethod, PaymentStatus } from '@prisma/client';
import { generateOrderNumber } from '../../utils/order-number';

const orderInclude = {
  Customer: { select: { name: true, phone: true } },
  OrderItem: true,
  Payment: true,
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
      razorpay_order_id: p.razorpayOrderId,
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
      source: o.source,
      created_by: o.createdBy ?? null,
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
      delivery_type: o.deliveryType ?? 'HOME_DELIVERY',
      expected_pickup_time: o.expectedPickupTime ?? null,
      delivery_notes: o.deliveryNotes ?? null,
      alt_phone: o.altPhone,
      cancellation_reason: o.cancellationReason,
      cancelled_by: o.cancelledBy ?? null,
      created_at: o.createdAt,
      updated_at: o.updatedAt,
      customer: { name: o.Customer.name, phone: o.Customer.phone },
      items: o.OrderItem.map((i: any) => this.formatOrderItem(i)),
      payment: this.formatPayment(o.Payment),
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

  async createManualOrder(userId: string, body: {
    customer_id?: string;
    new_customer?: { name: string; phone: string };
    items: { product_id: string; quantity: number }[];
    address: {
      door_no: string; street: string; area: string;
      city: string; pincode: string; state: string; country: string;
    };
    payment_method?: string;
    notes?: string;
  }) {
    const storeId = await this.getStoreId(userId);

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const createdBy = user?.name ?? 'Staff';

    if (!body.items || body.items.length === 0) throw new BadRequestException('items are required');

    const addr = body.address;
    if (!addr?.door_no?.trim() || !addr?.street?.trim() || !addr?.area?.trim() ||
        !addr?.city?.trim() || !addr?.pincode?.trim() || !addr?.state?.trim() || !addr?.country?.trim()) {
      throw new BadRequestException('All address fields are required');
    }

    // Resolve or create customer
    let customerId: string;
    if (body.customer_id) {
      const existing = await this.prisma.customer.findFirst({ where: { id: body.customer_id, storeId } });
      if (!existing) throw new NotFoundException('Customer not found');
      customerId = existing.id;
    } else if (body.new_customer) {
      const { name, phone } = body.new_customer;
      if (!phone?.trim()) throw new BadRequestException('Customer phone is required');

      const existing = await this.prisma.customer.findFirst({
        where: { phone: phone.trim(), storeId },
      });

      if (existing) {
        if (name?.trim()) {
          await this.prisma.customer.update({
            where: { id: existing.id },
            data: { name: name.trim() },
          });
        }
        customerId = existing.id;
      } else {
        const created = await this.prisma.customer.create({
          data: { phone: phone.trim(), name: name?.trim() || null, storeId },
        });
        customerId = created.id;
      }
    } else {
      throw new BadRequestException('customer_id or new_customer is required');
    }

    // Save address to customer address book
    await this.prisma.customerAddress.create({
      data: {
        customerId,
        storeId,
        label: 'Other',
        doorNo: addr.door_no.trim(),
        street: addr.street.trim(),
        address: addr.area.trim(),
        city: addr.city.trim(),
        pincode: addr.pincode.trim(),
        state: addr.state.trim(),
        country: addr.country.trim(),
        isDefault: false,
      },
    });

    const productIds = body.items.map((i) => i.product_id);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, storeId, isActive: true },
    });
    if (products.length !== productIds.length) throw new BadRequestException('One or more products are unavailable');

    const orderItemsData = body.items.map((item) => {
      const product = products.find((p) => p.id === item.product_id)!;
      return {
        productId: product.id,
        productName: product.name,
        price: product.sellingPrice,
        quantity: item.quantity,
        subtotal: product.sellingPrice * item.quantity,
      };
    });

    const totalAmount = orderItemsData.reduce((sum, i) => sum + i.subtotal, 0);
    const method = body.payment_method?.toUpperCase() === 'ONLINE' ? PaymentMethod.ONLINE : PaymentMethod.COD;

    let order: any;
    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 50 + Math.random() * 150));
      const orderNumber = await generateOrderNumber(this.prisma, storeId);
      try {
        order = await this.prisma.order.create({
          data: {
            orderNumber, customerId, storeId, totalAmount,
            status: OrderStatus.NEW,
            source: OrderSource.MANUAL,
            createdBy,
            notes: body.notes?.trim() || null,
            doorNo: addr.door_no.trim(),
            street: addr.street.trim(),
            address: addr.area.trim(),
            city: addr.city.trim(),
            pincode: addr.pincode.trim(),
            state: addr.state.trim(),
            country: addr.country.trim(),
            OrderItem: { create: orderItemsData },
            Payment: { create: { method, status: PaymentStatus.PENDING } },
          },
          include: orderInclude,
        });
        break;
      } catch (err: any) {
        if (err?.code === 'P2002' && attempt < 4) continue;
        throw err;
      }
    }

    if (!order) throw new BadRequestException('Failed to generate order number');
    return { order: this.formatOrder(order) };
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
    this.notifyCustomer(storeId, order.Customer.phone, order.orderNumber, status as OrderStatus, updateData.cancellationReason).catch(() => {});

    return { order: this.formatOrder(order) };
  }
}
