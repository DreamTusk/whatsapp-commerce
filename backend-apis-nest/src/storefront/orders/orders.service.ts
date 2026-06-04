import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { generateOrderNumber } from '../../utils/order-number';

const orderInclude = {
  items: { include: { product: { select: { imageUrl: true } } } },
  payment: true,
};

@Injectable()
export class StorefrontOrdersService {
  constructor(private prisma: PrismaService) {}

  private formatOrderItem(item: any) {
    return {
      id: item.id,
      product_id: item.productId,
      product_name: item.productName,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal,
      image_url: item.product?.imageUrl ?? null,
    };
  }

  private formatOrder(o: any) {
    return {
      id: o.id,
      order_number: o.orderNumber,
      total_amount: o.totalAmount,
      status: o.status,
      address: o.address,
      notes: o.notes,
      cancellation_reason: o.cancellationReason,
      cancelled_by: o.cancelledBy,
      created_at: o.createdAt,
      updated_at: o.updatedAt,
      items: o.items.map((i: any) => this.formatOrderItem(i)),
      payment: o.payment
        ? { method: o.payment.method, status: o.payment.status, paid_at: o.payment.paidAt }
        : null,
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

    const { items, address_id, address, notes, alt_phone, name,
      door_no, street, city, state, country, pincode, payment_method = 'COD', latitude, longitude } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('items array is required');
    }

    let deliveryAddress: any = { address, doorNo: door_no, street, city, state, country, pincode, latitude, longitude };

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

    const method = payment_method.toUpperCase() === 'ONLINE' ? PaymentMethod.ONLINE : PaymentMethod.COD;

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
        const customerRecord = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { name: true, phone: true } });
        const createdBy = customerRecord?.name ?? customerRecord?.phone ?? null;

        order = await this.prisma.order.create({
          data: {
            orderNumber, customerId, storeId, totalAmount,
            status: OrderStatus.NEW,
            source: 'CUSTOMER',
            createdBy,
            address: deliveryAddress.address ?? null,
            notes: notes ?? null,
            altPhone: typeof alt_phone === 'string' && alt_phone.trim() ? alt_phone.trim() : null,
            doorNo: deliveryAddress.doorNo?.trim() || null,
            street: deliveryAddress.street?.trim() || null,
            city: deliveryAddress.city?.trim() || null,
            state: deliveryAddress.state?.trim() || null,
            country: deliveryAddress.country?.trim() || null,
            pincode: deliveryAddress.pincode?.trim() || null,
            latitude: typeof deliveryAddress.latitude === 'number' ? deliveryAddress.latitude : null,
            longitude: typeof deliveryAddress.longitude === 'number' ? deliveryAddress.longitude : null,
            items: { create: orderItemsData },
            payment: { create: { method, status: PaymentStatus.PENDING } },
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

    return { order: this.formatOrder(order) };
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
