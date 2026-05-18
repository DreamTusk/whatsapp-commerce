import { ConversationSession, Prisma } from '@prisma/client';
import prisma from '../utils/db.js';
import logger from '../utils/logger.js';
import type { CartItem, OrderFilters, OrderItem, StoreStats } from '../types/index.js';

class OrderService {
  async createOrder(session: ConversationSession, paymentMethod: string, storeId: string) {
    try {
      const cart = (session.cartData as unknown as CartItem[]) || [];

      if (cart.length === 0) throw new Error('Cannot create order with empty cart');

      const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const customer = await prisma.customer.findUnique({ where: { id: session.customerId } });
      if (!customer) throw new Error('Customer not found');

      const orderNumber = await this.generateOrderNumber(storeId);

      const orderItems: OrderItem[] = cart.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        unit: item.unit,
        subtotal: item.price * item.quantity,
      }));

      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          storeId,
          items: orderItems as unknown as Prisma.InputJsonValue,
          totalAmount,
          paymentMethod,
          paymentStatus: 'PENDING',
          orderStatus: 'NEW',
          latitude: customer.latitude,
          longitude: customer.longitude,
          address: customer.address,
        },
      });

      logger.info(`Order created: ${orderNumber} for customer ${customer.phone}`);
      return order;
    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  async generateOrderNumber(storeId: string): Promise<string> {
    const orderCount = await prisma.order.count({ where: { storeId } });
    const orderNum = (orderCount + 1).toString().padStart(4, '0');
    return `ORD-${orderNum}`;
  }

  async updateOrderStatus(orderId: string, status: string) {
    try {
      const order = await prisma.order.update({
        where: { id: orderId },
        data: { orderStatus: status },
      });
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
      include: { customer: true, store: true },
    });
  }

  async getStoreOrders(storeId: string, filters: OrderFilters = {}) {
    const where: Record<string, unknown> = { storeId };

    if (filters.status) where.orderStatus = filters.status;
    if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;

    if (filters.startDate || filters.endDate) {
      const createdAt: Record<string, Date> = {};
      if (filters.startDate) createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) createdAt.lte = new Date(filters.endDate);
      where.createdAt = createdAt;
    }

    return prisma.order.findMany({
      where,
      include: { customer: { select: { phone: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStoreStats(storeId: string, date = new Date()): Promise<StoreStats> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const todayOrders = await prisma.order.findMany({
      where: { storeId, createdAt: { gte: startOfDay, lte: endOfDay } },
    });

    return {
      totalOrders: todayOrders.length,
      totalRevenue: todayOrders.reduce((sum, order) => sum + order.totalAmount, 0),
      pendingOrders: todayOrders.filter((o) => o.orderStatus === 'NEW').length,
      completedOrders: todayOrders.filter((o) => o.orderStatus === 'DELIVERED').length,
      codOrders: todayOrders.filter((o) => o.paymentMethod === 'COD').length,
      onlineOrders: todayOrders.filter((o) => o.paymentMethod === 'ONLINE').length,
    };
  }
}

export default new OrderService();
