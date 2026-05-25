import { Store, ConversationSession, Prisma } from '@prisma/client';
import prisma from '../utils/db.js';
import logger from '../utils/logger.js';
import whatsappService from './whatsapp.js';
import orderService from './order.js';
import type { CartItem, MessageInput, LocationData, CatalogOrderData } from '../types/index.js';

const STATES = {
  WELCOME: 'WELCOME',
  BROWSING_CATEGORIES: 'BROWSING_CATEGORIES',
  BROWSING_PRODUCTS: 'BROWSING_PRODUCTS',
  CART: 'CART',
  CHECKOUT_LOCATION: 'CHECKOUT_LOCATION',
  CHECKOUT_PAYMENT: 'CHECKOUT_PAYMENT',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
} as const;

class ConversationService {
  async handleIncomingMessage(store: Store, message: {
    id: string;
    from: string;
    type: string;
    text?: { body: string };
    interactive?: {
      type: string;
      list_reply?: { id: string; title: string };
      button_reply?: { id: string; title: string };
      nfm_reply?: CatalogOrderData;
    };
    order?: CatalogOrderData;
    location?: { latitude: number; longitude: number; address?: string };
  }): Promise<void> {
    try {
      const customerPhone = message.from;
      await whatsappService.markAsRead(store, message.id);

      let customer = await prisma.customer.findUnique({
        where: { phone_storeId: { phone: customerPhone, storeId: store.id } },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: { phone: customerPhone, storeId: store.id },
        });
        logger.info(`New customer created: ${customerPhone}`);
      }

      const session = await this.getOrCreateSession(customer.id, store.id);

      let messageText = '';
      let selectedId: string | null = null;
      let location: LocationData | null = null;
      let orderData: CatalogOrderData | null = null;

      if (message.type === 'text') {
        messageText = message.text!.body.toLowerCase().trim();
      } else if (message.type === 'interactive') {
        if (message.interactive!.type === 'list_reply') {
          selectedId = message.interactive!.list_reply!.id;
          messageText = message.interactive!.list_reply!.title.toLowerCase();
        } else if (message.interactive!.type === 'button_reply') {
          selectedId = message.interactive!.button_reply!.id;
          messageText = message.interactive!.button_reply!.title.toLowerCase();
        } else if (message.interactive!.type === 'nfm_reply') {
          orderData = message.interactive!.nfm_reply!;
        }
      } else if (message.type === 'order') {
        orderData = message.order!;
      } else if (message.type === 'location') {
        location = {
          latitude: message.location!.latitude,
          longitude: message.location!.longitude,
          address: message.location!.address || '',
        };
      }

      if (orderData) {
        await this.handleCatalogOrder(store, session, customer, orderData);
        return;
      }

      if (['hi', 'hello', 'start'].includes(messageText)) {
        await this.handleWelcome(store, session, customerPhone);
        return;
      }

      if (messageText === 'cart') {
        await this.handleCart(store, session, customerPhone);
        return;
      }

      if (messageText === 'help') {
        await this.handleHelp(store, customerPhone);
        return;
      }

      await this.processState(store, session, customerPhone, { messageText, selectedId, location });
    } catch (error) {
      logger.error('Error handling incoming message:', error);
    }
  }

  async getOrCreateSession(customerId: string, storeId: string): Promise<ConversationSession> {
    let session = await prisma.conversationSession.findFirst({
      where: { customerId, storeId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      session = await prisma.conversationSession.create({
        data: { customerId, storeId, state: STATES.WELCOME, expiresAt },
      });
      logger.info(`New session created for customer: ${customerId}`);
    }

    return session;
  }

  async processState(
    store: Store,
    session: ConversationSession,
    customerPhone: string,
    input: MessageInput
  ): Promise<void> {
    switch (session.state) {
      case STATES.WELCOME:
      case STATES.BROWSING_CATEGORIES:
        await this.handleCategorySelection(store, session, customerPhone, input.selectedId);
        break;
      case STATES.BROWSING_PRODUCTS:
        await this.handleProductSelection(store, session, customerPhone, input);
        break;
      case STATES.CART:
        await this.handleCartAction(store, session, customerPhone, input);
        break;
      case STATES.CHECKOUT_LOCATION:
        if (input.location) {
          await this.handleLocation(store, session, customerPhone, input.location);
        } else {
          await whatsappService.sendTextMessage(store, customerPhone, 'Please share your location using the button below to proceed with checkout.');
          await whatsappService.sendLocationRequest(store, customerPhone);
        }
        break;
      case STATES.CHECKOUT_PAYMENT:
        await this.handlePaymentChoice(store, session, customerPhone, input);
        break;
      default:
        await this.handleWelcome(store, session, customerPhone);
    }
  }

  async handleWelcome(store: Store, session: ConversationSession, customerPhone: string): Promise<void> {
    await prisma.conversationSession.update({
      where: { id: session.id },
      data: { state: STATES.BROWSING_CATEGORIES, cartData: [] },
    });

    if (!store.catalogId) {
      const categories = await prisma.category.findMany({
        where: { storeId: store.id, isActive: true },
        orderBy: { sortOrder: 'asc' },
        take: 10,
      });

      if (categories.length === 0) {
        await whatsappService.sendTextMessage(store, customerPhone, 'Sorry, no products available at the moment. Please try again later.');
        return;
      }

      const welcomeText = `Welcome to ${store.name}! 🛒\n\nBrowse our categories and start shopping.\n\nCommands:\n• Type "cart" to view your cart\n• Type "help" for assistance`;
      await whatsappService.sendTextMessage(store, customerPhone, welcomeText);

      await whatsappService.sendInteractiveList(store, customerPhone, 'Browse Categories', 'Select a category to view products', 'View Categories', [
        {
          title: 'Categories',
          rows: categories.map((cat) => ({ id: `cat_${cat.id}`, title: cat.name, description: cat.nameLocal || '' })),
        },
      ]);
      return;
    }

    const welcomeText = `Welcome to ${store.name}! 🛒\n\nBrowse our complete catalog below. You can:\n• View all products with images\n• Add multiple items to cart\n• Adjust quantities\n• Complete checkout\n\nCommands:\n• Type "help" for assistance`;
    await whatsappService.sendTextMessage(store, customerPhone, welcomeText);
    await whatsappService.sendCatalogMessage(store, customerPhone, 'Tap below to browse products and add items to your cart');
  }

  async handleCategorySelection(store: Store, session: ConversationSession, customerPhone: string, selectedId: string | null): Promise<void> {
    if (!selectedId || !selectedId.startsWith('cat_')) {
      await this.handleWelcome(store, session, customerPhone);
      return;
    }

    const categoryId = selectedId.replace('cat_', '');
    const products = await prisma.product.findMany({
      where: { categoryId, storeId: store.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
      take: 10,
    });

    if (products.length === 0) {
      await whatsappService.sendTextMessage(store, customerPhone, 'No products available in this category. Please select another category.');
      await this.handleWelcome(store, session, customerPhone);
      return;
    }

    await prisma.conversationSession.update({
      where: { id: session.id },
      data: { state: STATES.BROWSING_PRODUCTS },
    });

    const category = await prisma.category.findUnique({ where: { id: categoryId } });

    await whatsappService.sendInteractiveList(store, customerPhone, category!.name, 'Select a product to add to cart', 'View Products', [
      {
        title: category!.name,
        rows: products.map((product) => ({
          id: `prod_${product.id}`,
          title: `${product.name} - ₹${product.sellingPrice}`,
          description: product.unit || product.description || '',
        })),
      },
    ]);
  }

  async handleProductSelection(store: Store, session: ConversationSession, customerPhone: string, input: MessageInput): Promise<void> {
    if (!input.selectedId || !input.selectedId.startsWith('prod_')) {
      await whatsappService.sendTextMessage(store, customerPhone, 'Please select a product from the list.');
      return;
    }

    const productId = input.selectedId.replace('prod_', '');
    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      await whatsappService.sendTextMessage(store, customerPhone, 'Sorry, this product is not available.');
      return;
    }

    if (!product.inStock) {
      await whatsappService.sendTextMessage(store, customerPhone, 'Sorry, this product is out of stock.');
      return;
    }

    const cart = ((session.cartData as unknown as CartItem[]) || []);
    const existingItem = cart.find((item) => item.productId === product.id);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ productId: product.id, name: product.name, price: product.sellingPrice, unit: product.unit ?? undefined, quantity: 1 });
    }

    await prisma.conversationSession.update({
      where: { id: session.id },
      data: { cartData: cart as unknown as Prisma.InputJsonValue },
    });

    const cartSummary = this.formatCartSummary(cart);
    await whatsappService.sendTextMessage(store, customerPhone, `✅ ${product.name} added to cart!\n\n${cartSummary}`);
    await whatsappService.sendInteractiveButtons(store, customerPhone, 'What would you like to do next?', [
      { id: 'continue_shopping', title: 'Add More Items' },
      { id: 'checkout', title: 'Checkout' },
    ]);
  }

  async handleCartAction(store: Store, session: ConversationSession, customerPhone: string, input: MessageInput): Promise<void> {
    if (input.selectedId === 'continue_shopping') {
      await this.handleWelcome(store, session, customerPhone);
    } else if (input.selectedId === 'checkout') {
      await this.handleCheckout(store, session, customerPhone);
    } else {
      await this.handleCart(store, session, customerPhone);
    }
  }

  async handleCart(store: Store, session: ConversationSession, customerPhone: string): Promise<void> {
    const cart = (session.cartData as unknown as CartItem[]) || [];

    if (cart.length === 0) {
      await whatsappService.sendTextMessage(store, customerPhone, 'Your cart is empty. Type "hi" to start shopping!');
      return;
    }

    const cartSummary = this.formatCartSummary(cart);
    await whatsappService.sendTextMessage(store, customerPhone, `🛒 Your Cart:\n\n${cartSummary}`);
    await whatsappService.sendInteractiveButtons(store, customerPhone, 'Ready to checkout?', [
      { id: 'continue_shopping', title: 'Add More Items' },
      { id: 'checkout', title: 'Checkout' },
    ]);

    await prisma.conversationSession.update({
      where: { id: session.id },
      data: { state: STATES.CART },
    });
  }

  async handleCheckout(store: Store, session: ConversationSession, customerPhone: string): Promise<void> {
    const cart = (session.cartData as unknown as CartItem[]) || [];

    if (cart.length === 0) {
      await whatsappService.sendTextMessage(store, customerPhone, 'Your cart is empty. Add some items first!');
      await this.handleWelcome(store, session, customerPhone);
      return;
    }

    await prisma.conversationSession.update({
      where: { id: session.id },
      data: { state: STATES.CHECKOUT_LOCATION },
    });

    await whatsappService.sendTextMessage(store, customerPhone, 'Great! To complete your order, please share your delivery location.');
    await whatsappService.sendLocationRequest(store, customerPhone);
  }

  async handleLocation(store: Store, session: ConversationSession, customerPhone: string, location: LocationData): Promise<void> {
    await prisma.customer.update({
      where: { phone_storeId: { phone: customerPhone, storeId: store.id } },
      data: { latitude: location.latitude, longitude: location.longitude, address: location.address },
    });

    await prisma.conversationSession.update({
      where: { id: session.id },
      data: { state: STATES.CHECKOUT_PAYMENT },
    });

    await whatsappService.sendTextMessage(store, customerPhone, '📍 Location received! Now, please choose your payment method:');
    await whatsappService.sendInteractiveButtons(store, customerPhone, 'How would you like to pay?', [
      { id: 'payment_cod', title: 'Cash on Delivery' },
      { id: 'payment_online', title: 'Pay Online' },
    ]);
  }

  async handlePaymentChoice(store: Store, session: ConversationSession, customerPhone: string, input: MessageInput): Promise<void> {
    if (!input.selectedId || !input.selectedId.startsWith('payment_')) {
      await whatsappService.sendTextMessage(store, customerPhone, 'Please select a payment method.');
      return;
    }

    const paymentMethod = input.selectedId === 'payment_cod' ? 'COD' : 'ONLINE';
    const order = await orderService.createOrder(session, paymentMethod, store.id);

    if (paymentMethod === 'COD') {
      await prisma.conversationSession.update({
        where: { id: session.id },
        data: { state: STATES.ORDER_CONFIRMED },
      });

      await whatsappService.sendTextMessage(store, customerPhone,
        `✅ Order Confirmed!\n\nOrder #: ${order.orderNumber}\nTotal: ₹${order.totalAmount}\nPayment: Cash on Delivery\n\nWe'll deliver to your location soon. Thank you for your order!\n\nType "hi" to start a new order.`
      );
    } else {
      await prisma.conversationSession.update({
        where: { id: session.id },
        data: { state: STATES.AWAITING_PAYMENT },
      });

      await whatsappService.sendTextMessage(store, customerPhone,
        `Please complete your payment to confirm the order.\n\nOrder #: ${order.orderNumber}\nAmount: ₹${order.totalAmount}\n\nPayment link: [Will be integrated with Razorpay]\n\nFor now, we'll mark this as COD. Type "hi" to start a new order.`
      );
    }

    await prisma.conversationSession.update({
      where: { id: session.id },
      data: { cartData: [] },
    });
  }

  async handleHelp(store: Store, customerPhone: string): Promise<void> {
    const helpText = `📱 How to Order:\n\n1. Type "hi" to start\n2. Browse categories and products\n3. Add items to cart\n4. Share your location\n5. Choose payment method\n6. Confirm your order!\n\nCommands:\n• "cart" - View your cart\n• "hi" - Start new order\n• "help" - Show this message`;
    await whatsappService.sendTextMessage(store, customerPhone, helpText);
  }

  async handleCatalogOrder(
    store: Store,
    session: ConversationSession,
    customer: { id: string; phone: string | null; latitude: number | null; longitude: number | null },
    orderData: CatalogOrderData
  ): Promise<void> {
    try {
      logger.info(`Catalog order received from ${customer.phone}`);

      const cartItems: CartItem[] = orderData.product_items.map((item) => ({
        productId: item.product_retailer_id,
        name: item.item_name || item.product_retailer_id,
        price: parseFloat(item.item_price) / 100,
        quantity: parseInt(item.quantity),
        catalogProductId: item.product_retailer_id,
      }));

      const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      await prisma.conversationSession.update({
        where: { id: session.id },
        data: { cartData: cartItems as unknown as Prisma.InputJsonValue, state: STATES.CHECKOUT_LOCATION },
      });

      let summary = `✅ Order Summary:\n\n`;
      cartItems.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        summary += `${index + 1}. ${item.name}\n   ₹${item.price} × ${item.quantity} = ₹${subtotal}\n\n`;
      });
      summary += `Total: ₹${totalAmount.toFixed(2)}`;

      await whatsappService.sendTextMessage(store, customer.phone!, summary);

      if (customer.latitude && customer.longitude) {
        await prisma.conversationSession.update({
          where: { id: session.id },
          data: { state: STATES.CHECKOUT_PAYMENT },
        });
        await whatsappService.sendTextMessage(store, customer.phone!, 'Great! Please choose your payment method:');
        await whatsappService.sendInteractiveButtons(store, customer.phone!, 'How would you like to pay?', [
          { id: 'payment_cod', title: 'Cash on Delivery' },
          { id: 'payment_online', title: 'Pay Online' },
        ]);
      } else {
        await whatsappService.sendTextMessage(store, customer.phone!, 'To complete your order, please share your delivery location:');
        await whatsappService.sendLocationRequest(store, customer.phone!);
      }
    } catch (error) {
      logger.error('Error handling catalog order:', error);
      await whatsappService.sendTextMessage(store, customer.phone!, 'Sorry, there was an error processing your order. Please try again or contact support.');
    }
  }

  formatCartSummary(cart: CartItem[]): string {
    let total = 0;
    let summary = '';

    cart.forEach((item, index) => {
      const subtotal = item.price * item.quantity;
      total += subtotal;
      summary += `${index + 1}. ${item.name}${item.unit ? ` (${item.unit})` : ''}\n`;
      summary += `   ₹${item.price} × ${item.quantity} = ₹${subtotal}\n\n`;
    });

    summary += `Total: ₹${total.toFixed(2)}`;
    return summary;
  }
}

export default new ConversationService();
