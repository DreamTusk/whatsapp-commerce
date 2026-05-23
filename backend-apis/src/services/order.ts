import { ConversationSession, OrderStatus, PaymentMethod } from '@prisma/client';
import prisma from '../utils/db.js';
import logger from '../utils/logger.js';
import type { CartItem, OrderFilters, StoreStats } from '../types/index.js';

class OrderService {
  async createOrder(session: ConversationSession, paymentMethod: string, storeId: string) {
    try {
      const cart = (session.cartData as unknown as CartItem[]) || [];
      if (cart.length === 0) throw new Error('Cannot create order with empty cart');

      const customer = await prisma.customer.findUnique({ where: { id: session.customerId } });
      if (!customer) throw new Error('Customer not found');

      const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const orderNumber = await this.generateOrderNumber(storeId);
      const method = paymentMethod.toUpperCase() === 'ONLINE' ? PaymentMethod.ONLINE : PaymentMethod.COD;

      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          storeId,
          totalAmount,
          status: OrderStatus.NEW,
          latitude: customer.latitude,
          longitude: customer.longitude,
          address: customer.address,
          items: {
            create: cart.map(item => ({
              productId: item.productId,
              productName: item.name,
              price: item.price,
              quantity: item.quantity,
              subtotal: item.price * item.quantity,
            })),
          },
          payment: {
            create: { method, status: 'PENDING' },
          },
        },
        include: { items: true, payment: true },
      });

      logger.info(`Order created: ${orderNumber} for customer ${customer.phone}`);
      return order;
    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  async generateOrderNumber(storeId: string): Promise<string> {
    const count = await prisma.order.count({ where: { storeId } });
    return `ORD-${(count + 1).toString().padStart(4, '0')}`;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    try {
      const order = await prisma.order.update({ where: { id: orderId }, data: { status } });
      logger.info(`Order ${order.orderNumber} status updated to ${status}`);
      return order;
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  async getOrder(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, store: true, items: true, payment: true },
    });
  }

  async getStoreOrders(storeId: string, filters: OrderFilters = {}) {
    const where: Record<string, unknown> = { storeId };
    if (filters.status) where.status = filters.status;
    if (filters.paymentMethod) where.payment = { method: filters.paymentMethod };
    if (filters.startDate || filters.endDate) {
      const createdAt: Record<string, Date> = {};
      if (filters.startDate) createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) createdAt.lte = new Date(filters.endDate);
      where.createdAt = createdAt;
    }
    return prisma.order.findMany({
      where,
      include: { customer: { select: { phone: true, name: true } }, items: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStoreStats(storeId: string, date = new Date()): Promise<StoreStats> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: { storeId, createdAt: { gte: startOfDay, lte: endOfDay } },
      include: { payment: true },
    });

    return {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
      pendingOrders: orders.filter(o => o.status === OrderStatus.NEW).length,
      completedOrders: orders.filter(o => o.status === OrderStatus.DELIVERED).length,
      codOrders: orders.filter(o => o.payment?.method === PaymentMethod.COD).length,
      onlineOrders: orders.filter(o => o.payment?.method === PaymentMethod.ONLINE).length,
    };
  }
}

export default new OrderService();
