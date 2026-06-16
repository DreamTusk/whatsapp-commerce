import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { generateOrderNumber } from '../../utils/order-number';
import { PaymentProvidersService } from '../../admin/payment-providers/payment-providers.service';
import { createHmac } from 'crypto';
import Razorpay from 'razorpay';

const orderInclude = {
  OrderItem: {
    include: {
      Product: {
        select: {
          ProductMedia: {
            orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }],
            take: 1,
            include: { Media: { select: { url: true, thumbnailUrl: true } } },
          },
        },
      },
    },
  },
  Payment: true,
  OrderShipment: { orderBy: { createdAt: 'desc' as const } },
};

@Injectable()
export class StorefrontOrdersService {
  constructor(
    private prisma: PrismaService,
    private paymentProviders: PaymentProvidersService,
  ) {}

  private formatOrderItem(item: any) {
    const media = item.Product?.ProductMedia?.[0]?.Media ?? null;
    return {
      id: item.id,
      product_id: item.productId,
      product_name: item.productName,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal,
      image_url: media?.thumbnailUrl ?? media?.url ?? null,
    };
  }

  private formatOrder(o: any) {
    return {
      id: o.id,
      order_number: o.orderNumber,
      total_amount: o.totalAmount,
      status: o.status,
      delivery_type: o.deliveryType ?? 'HOME_DELIVERY',
      expected_pickup_time: o.expectedPickupTime ?? null,
      delivery_notes: o.deliveryNotes ?? null,
      address: o.address,
      notes: o.notes,
      cancellation_reason: o.cancellationReason,
      cancelled_by: o.cancelledBy,
      created_at: o.createdAt,
      updated_at: o.updatedAt,
      items: o.OrderItem.map((i: any) => this.formatOrderItem(i)),
      payment: o.Payment
        ? { method: o.Payment.method, status: o.Payment.status, paid_at: o.Payment.paidAt }
        : null,
      shipments: (o.OrderShipment ?? []).map((s: any) => ({
        id: s.id,
        carrier_name: s.carrierName,
        tracking_id: s.trackingId,
        tracking_url: s.trackingUrl,
        created_at: s.createdAt,
      })),
    };
  }

  async listOrders(customerId: string) {
    const orders = await this.prisma.order.findMany({
      where: { customerId },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
    return { orders: orders.map((o) => this.formatOrder(o)) };
  }

  async getOrder(customerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('Order not found');
    return { order: this.formatOrder(order) };
  }

  async placeOrder(customerId: string, storeId: string, domain: string, body: any) {
    if (!domain) throw new BadRequestException('x-store-domain header required');

    const store = await this.prisma.store.findUnique({ where: { domain } });
    if (!store || store.id !== storeId) throw new NotFoundException('Store not found');
    if (!store.isActive) throw new BadRequestException('Store is not active');

    const {
      items, address_id, address, notes, alt_phone, name,
      door_no, street, city, state, country, pincode,
      payment_method = 'COD', latitude, longitude,
      delivery_type = 'HOME_DELIVERY', expected_pickup_time, delivery_notes,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('items array is required');
    }

    const isPickup = delivery_type.toUpperCase() === 'PICKUP';

    if (isPickup && !store.isPickupEnabled) {
      throw new BadRequestException('Pickup is not enabled for this store');
    }

    const method = payment_method.toUpperCase() === 'ONLINE' ? PaymentMethod.ONLINE : PaymentMethod.COD;

    let razorpayProvider: { keyId: string; keySecret: string } | null = null;
    if (method === PaymentMethod.ONLINE) {
      razorpayProvider = await this.paymentProviders.getActiveProvider(storeId, 'RAZORPAY');
      if (!razorpayProvider) {
        throw new BadRequestException('Online payments are not configured for this store');
      }
    }

    let deliveryAddress: any = { address, doorNo: door_no, street, city, state, country, pincode, latitude, longitude };

    if (!isPickup) {
      if (address_id) {
        const saved = await this.prisma.customerAddress.findFirst({ where: { id: address_id, customerId, storeId } });
        if (!saved) throw new NotFoundException('Saved address not found');
        deliveryAddress = {
          address: saved.address, doorNo: saved.doorNo, street: saved.street,
          city: saved.city, state: saved.state, country: saved.country,
          pincode: saved.pincode, latitude: saved.latitude, longitude: saved.longitude,
        };
      }
      if (!deliveryAddress.address && !deliveryAddress.street && !deliveryAddress.city) {
        throw new BadRequestException('address or address_id is required');
      }
    }

    const productIds: string[] = items.map((i: any) => i.product_id);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, storeId, isActive: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products are unavailable');
    }

    const outOfStock = products.find((p) => !p.inStock);
    if (outOfStock) throw new BadRequestException(`"${outOfStock.name}" is out of stock`);

    const orderItemsData = items.map((item: any) => {
      const product = products.find((p) => p.id === item.product_id)!;
      return {
        productId: product.id,
        productName: product.name,
        price: product.sellingPrice,
        quantity: item.quantity,
        subtotal: product.sellingPrice * item.quantity,
      };
    });

    const totalAmount = orderItemsData.reduce((sum: number, i: any) => sum + i.subtotal, 0);

    if (store.minOrderAmount > 0 && totalAmount < store.minOrderAmount) {
      throw new BadRequestException(`Minimum order amount is ₹${store.minOrderAmount}`);
    }

    let order: any;
    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 50 + Math.random() * 150));
      const orderNumber = await generateOrderNumber(this.prisma, storeId);
      try {
        const customerRecord = await this.prisma.customer.findUnique({
          where: { id: customerId },
          select: { name: true, phone: true },
        });
        const createdBy = customerRecord?.name ?? customerRecord?.phone ?? null;

        order = await this.prisma.order.create({
          data: {
            orderNumber, customerId, storeId, totalAmount,
            status: OrderStatus.NEW,
            source: 'CUSTOMER',
            createdBy,
            deliveryType: isPickup ? 'PICKUP' : 'HOME_DELIVERY',
            expectedPickupTime: isPickup && expected_pickup_time ? new Date(expected_pickup_time) : null,
            deliveryNotes: delivery_notes?.trim() || null,
            address: isPickup ? null : (deliveryAddress.address ?? null),
            notes: notes ?? null,
            altPhone: typeof alt_phone === 'string' && alt_phone.trim() ? alt_phone.trim() : null,
            doorNo: isPickup ? null : (deliveryAddress.doorNo?.trim() || null),
            street: isPickup ? null : (deliveryAddress.street?.trim() || null),
            city: isPickup ? null : (deliveryAddress.city?.trim() || null),
            state: isPickup ? null : (deliveryAddress.state?.trim() || null),
            country: isPickup ? null : (deliveryAddress.country?.trim() || null),
            pincode: isPickup ? null : (deliveryAddress.pincode?.trim() || null),
            latitude: isPickup ? null : (typeof deliveryAddress.latitude === 'number' ? deliveryAddress.latitude : null),
            longitude: isPickup ? null : (typeof deliveryAddress.longitude === 'number' ? deliveryAddress.longitude : null),
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

    if (name?.trim()) {
      await this.prisma.customer.update({ where: { id: customerId }, data: { name: name.trim() } });
    }

    await this.prisma.cartItem.deleteMany({ where: { customerId, storeId } });

    // COD — return order directly
    if (method === PaymentMethod.COD) {
      return { order: this.formatOrder(order) };
    }

    // ONLINE — create Razorpay order and return payment details
    const razorpay = new Razorpay({
      key_id: razorpayProvider!.keyId,
      key_secret: razorpayProvider!.keySecret,
    });

    const amountPaise = Math.round(totalAmount * 100);
    const rzpOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: order.orderNumber,
    });

    await this.prisma.payment.update({
      where: { orderId: order.id },
      data: { razorpayOrderId: rzpOrder.id },
    });

    return {
      order: this.formatOrder(order),
      razorpay_order_id: rzpOrder.id,
      razorpay_key_id: razorpayProvider!.keyId,
      amount_paise: amountPaise,
    };
  }

  async verifyPayment(
    customerId: string,
    orderId: string,
    body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
  ) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new BadRequestException('razorpay_order_id, razorpay_payment_id and razorpay_signature are required');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: { Payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.Payment) throw new BadRequestException('Payment record not found');

    // Idempotency — already verified
    if (order.Payment.status === PaymentStatus.PAID) {
      return { order: this.formatOrder({ ...order, OrderItem: await this.prisma.orderItem.findMany({ where: { orderId } }) }) };
    }

    // Verify Razorpay signature
    const razorpayProvider = await this.paymentProviders.getActiveProvider(order.storeId, 'RAZORPAY');
    if (!razorpayProvider) throw new BadRequestException('Payment provider not configured');

    const expectedSignature = createHmac('sha256', razorpayProvider.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new BadRequestException('Payment verification failed — invalid signature');
    }

    // Mark payment as paid and confirm order
    await this.prisma.payment.update({
      where: { orderId },
      data: {
        status: PaymentStatus.PAID,
        razorpayPaymentId: razorpay_payment_id,
        paidAt: new Date(),
      },
    });

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CONFIRMED },
      include: orderInclude,
    });

    return { order: this.formatOrder(updated) };
  }

  async cancelOrder(customerId: string, orderId: string, reason?: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, customerId } });
    if (!order) throw new NotFoundException('Order not found');
    if (!['NEW', 'CONFIRMED'].includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledBy: 'CUSTOMER',
        cancellationReason: reason?.trim() || null,
      },
      include: orderInclude,
    });

    return { order: this.formatOrder(updated) };
  }
}
