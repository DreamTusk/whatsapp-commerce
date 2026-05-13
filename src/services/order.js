import prisma from '../utils/db.js';
import logger from '../utils/logger.js';

class OrderService {
  /**
   * Create a new order from conversation session
   */
  async createOrder(session, paymentMethod, storeId) {
    try {
      const cart = session.cartData || [];

      if (cart.length === 0) {
        throw new Error('Cannot create order with empty cart');
      }

      // Calculate total
      const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Get customer data
      const customer = await prisma.customer.findUnique({
        where: { id: session.customerId },
      });

      // Generate order number
      const orderNumber = await this.generateOrderNumber(storeId);

      // Create order items
      const orderItems = cart.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        unit: item.unit,
        subtotal: item.price * item.quantity,
      }));

      // Create order
      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          storeId,
          items: orderItems,
          totalAmount,
          paymentMethod,
          paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
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

  /**
   * Generate human-readable order number
   */
  async generateOrderNumber(storeId) {
    // Get the count of orders for this store
    const orderCount = await prisma.order.count({
      where: { storeId },
    });

    // Generate order number like ORD-0001, ORD-0002, etc.
    const orderNum = (orderCount + 1).toString().padStart(4, '0');
    return `ORD-${orderNum}`;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status) {
    try {
      const order = await prisma.order.update({
        where: { id: orderId },
        data: { orderStatus: status },
      });

      logger.info(`Order ${order.orderNumber} status updated to ${status}`);

      // TODO: Send WhatsApp notification to customer about status change

      return order;
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId) {
    return await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        store: true,
      },
    });
  }

  /**
   * Get orders for a store
   */
  async getStoreOrders(storeId, filters = {}) {
    const where = { storeId };

    if (filters.status) {
      where.orderStatus = filters.status;
    }

    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters.startDate) {
      where.createdAt = {
        ...where.createdAt,
        gte: new Date(filters.startDate),
      };
    }

    if (filters.endDate) {
      where.createdAt = {
        ...where.createdAt,
        lte: new Date(filters.endDate),
      };
    }

    return await prisma.order.findMany({
      where,
      include: {
        customer: {
          select: {
            phone: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get order statistics for a store
   */
  async getStoreStats(storeId, date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Today's orders
    const todayOrders = await prisma.order.findMany({
      where: {
        storeId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Calculate stats
    const stats = {
      totalOrders: todayOrders.length,
      totalRevenue: todayOrders.reduce((sum, order) => sum + order.totalAmount, 0),
      pendingOrders: todayOrders.filter((o) => o.orderStatus === 'NEW').length,
      completedOrders: todayOrders.filter((o) => o.orderStatus === 'DELIVERED').length,
      codOrders: todayOrders.filter((o) => o.paymentMethod === 'COD').length,
      onlineOrders: todayOrders.filter((o) => o.paymentMethod === 'ONLINE').length,
    };

    return stats;
  }
}

export default new OrderService();
