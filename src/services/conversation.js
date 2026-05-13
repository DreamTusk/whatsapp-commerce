import prisma from '../utils/db.js';
import logger from '../utils/logger.js';
import whatsappService from './whatsapp.js';
import orderService from './order.js';

// Conversation states
const STATES = {
  WELCOME: 'WELCOME',
  BROWSING_CATEGORIES: 'BROWSING_CATEGORIES',
  BROWSING_PRODUCTS: 'BROWSING_PRODUCTS',
  CART: 'CART',
  CHECKOUT_LOCATION: 'CHECKOUT_LOCATION',
  CHECKOUT_PAYMENT: 'CHECKOUT_PAYMENT',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
};

class ConversationService {
  /**
   * Main handler for incoming messages
   */
  async handleIncomingMessage(store, message) {
    try {
      const customerPhone = message.from;

      // Mark message as read
      await whatsappService.markAsRead(store, message.id);

      // Get or create customer
      let customer = await prisma.customer.findUnique({
        where: {
          phone_storeId: {
            phone: customerPhone,
            storeId: store.id,
          },
        },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            phone: customerPhone,
            storeId: store.id,
          },
        });
        logger.info(`New customer created: ${customerPhone}`);
      }

      // Get or create conversation session
      const session = await this.getOrCreateSession(customer.id, store.id);

      // Extract message content based on type
      let messageText = '';
      let selectedId = null;
      let location = null;
      let orderData = null;

      if (message.type === 'text') {
        messageText = message.text.body.toLowerCase().trim();
      } else if (message.type === 'interactive') {
        if (message.interactive.type === 'list_reply') {
          selectedId = message.interactive.list_reply.id;
          messageText = message.interactive.list_reply.title.toLowerCase();
        } else if (message.interactive.type === 'button_reply') {
          selectedId = message.interactive.button_reply.id;
          messageText = message.interactive.button_reply.title.toLowerCase();
        } else if (message.interactive.type === 'nfm_reply') {
          // Native Flow Message reply (catalog order)
          orderData = message.interactive.nfm_reply;
        }
      } else if (message.type === 'order') {
        // WhatsApp Catalog order
        orderData = message.order;
      } else if (message.type === 'location') {
        location = {
          latitude: message.location.latitude,
          longitude: message.location.longitude,
          address: message.location.address || '',
        };
      }

      // Handle catalog order
      if (orderData) {
        await this.handleCatalogOrder(store, session, customer, orderData);
        return;
      }

      // Handle special commands at any state
      if (messageText === 'hi' || messageText === 'hello' || messageText === 'start') {
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

      // Route to appropriate state handler
      await this.processState(store, session, customerPhone, {
        messageText,
        selectedId,
        location,
      });
    } catch (error) {
      logger.error('Error handling incoming message:', error);
    }
  }

  /**
   * Get or create conversation session
   */
  async getOrCreateSession(customerId, storeId) {
    // Find active session (not expired)
    let session = await prisma.conversationSession.findFirst({
      where: {
        customerId,
        storeId,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!session) {
      // Create new session (expires in 24 hours)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      session = await prisma.conversationSession.create({
        data: {
          customerId,
          storeId,
          state: STATES.WELCOME,
          expiresAt,
        },
      });
      logger.info(`New session created for customer: ${customerId}`);
    }

    return session;
  }

  /**
   * Process current state
   */
  async processState(store, session, customerPhone, input) {
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
          await whatsappService.sendTextMessage(
            store,
            customerPhone,
            'Please share your location using the button below to proceed with checkout.'
          );
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

  /**
   * Handle WELCOME state - Send catalog
   */
  async handleWelcome(store, session, customerPhone) {
    // Reset session
    await prisma.conversationSession.update({
      where: { id: session.id },
      data: {
        state: STATES.BROWSING_CATEGORIES,
        cartData: [],
      },
    });

    if (!store.catalogId) {
      // Fallback to interactive list flow if no catalog configured
      const categories = await prisma.category.findMany({
        where: {
          storeId: store.id,
          isActive: true,
        },
        orderBy: { sortOrder: 'asc' },
        take: 10,
      });

      if (categories.length === 0) {
        await whatsappService.sendTextMessage(
          store,
          customerPhone,
          'Sorry, no products available at the moment. Please try again later.'
        );
        return;
      }

      // Send welcome message
      const welcomeText = `Welcome to ${store.name}! 🛒\n\n` +
        `Browse our categories and start shopping.\n\n` +
        `Commands:\n` +
        `• Type "cart" to view your cart\n` +
        `• Type "help" for assistance`;

      await whatsappService.sendTextMessage(store, customerPhone, welcomeText);

      // Send category list
      const sections = [
        {
          title: 'Categories',
          rows: categories.map((cat) => ({
            id: `cat_${cat.id}`,
            title: cat.name,
            description: cat.nameLocal || '',
          })),
        },
      ];

      await whatsappService.sendInteractiveList(
        store,
        customerPhone,
        'Browse Categories',
        'Select a category to view products',
        'View Categories',
        sections
      );
      return;
    }

    // Catalog is configured - send catalog message
    const welcomeText = `Welcome to ${store.name}! 🛒\n\n` +
      `Browse our complete catalog below. You can:\n` +
      `• View all products with images\n` +
      `• Add multiple items to cart\n` +
      `• Adjust quantities\n` +
      `• Complete checkout\n\n` +
      `Commands:\n` +
      `• Type "help" for assistance`;

    await whatsappService.sendTextMessage(store, customerPhone, welcomeText);

    // Send catalog message - users can browse natively in WhatsApp
    await whatsappService.sendCatalogMessage(
      store,
      customerPhone,
      'Tap below to browse products and add items to your cart'
    );
  }

  /**
   * Handle category selection
   */
  async handleCategorySelection(store, session, customerPhone, selectedId) {
    if (!selectedId || !selectedId.startsWith('cat_')) {
      await this.handleWelcome(store, session, customerPhone);
      return;
    }

    const categoryId = selectedId.replace('cat_', '');

    // Get products in category
    const products = await prisma.product.findMany({
      where: {
        categoryId,
        storeId: store.id,
        inStock: true,
      },
      orderBy: { sortOrder: 'asc' },
      take: 10, // Max 10 items per section
    });

    if (products.length === 0) {
      await whatsappService.sendTextMessage(
        store,
        customerPhone,
        'No products available in this category. Please select another category.'
      );
      await this.handleWelcome(store, session, customerPhone);
      return;
    }

    // Update session state
    await prisma.conversationSession.update({
      where: { id: session.id },
      data: { state: STATES.BROWSING_PRODUCTS },
    });

    // Send product list
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    const sections = [
      {
        title: category.name,
        rows: products.map((product) => ({
          id: `prod_${product.id}`,
          title: `${product.name} - ₹${product.price}`,
          description: product.unit || product.description || '',
        })),
      },
    ];

    await whatsappService.sendInteractiveList(
      store,
      customerPhone,
      category.name,
      'Select a product to add to cart',
      'View Products',
      sections
    );
  }

  /**
   * Handle product selection
   */
  async handleProductSelection(store, session, customerPhone, input) {
    if (!input.selectedId || !input.selectedId.startsWith('prod_')) {
      await whatsappService.sendTextMessage(
        store,
        customerPhone,
        'Please select a product from the list.'
      );
      return;
    }

    const productId = input.selectedId.replace('prod_', '');

    // Get product
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.inStock) {
      await whatsappService.sendTextMessage(
        store,
        customerPhone,
        'Sorry, this product is not available.'
      );
      return;
    }

    // Add to cart
    let cart = session.cartData || [];
    const existingItem = cart.find((item) => item.productId === productId);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        quantity: 1,
      });
    }

    // Update session
    await prisma.conversationSession.update({
      where: { id: session.id },
      data: { cartData: cart },
    });

    // Show cart summary and options
    const cartSummary = this.formatCartSummary(cart);

    await whatsappService.sendTextMessage(
      store,
      customerPhone,
      `✅ ${product.name} added to cart!\n\n${cartSummary}`
    );

    // Send action buttons
    await whatsappService.sendInteractiveButtons(store, customerPhone, 'What would you like to do next?', [
      { id: 'continue_shopping', title: 'Add More Items' },
      { id: 'checkout', title: 'Checkout' },
    ]);
  }

  /**
   * Handle cart actions
   */
  async handleCartAction(store, session, customerPhone, input) {
    if (input.selectedId === 'continue_shopping') {
      await this.handleWelcome(store, session, customerPhone);
    } else if (input.selectedId === 'checkout') {
      await this.handleCheckout(store, session, customerPhone);
    } else {
      await this.handleCart(store, session, customerPhone);
    }
  }

  /**
   * Show cart
   */
  async handleCart(store, session, customerPhone) {
    const cart = session.cartData || [];

    if (cart.length === 0) {
      await whatsappService.sendTextMessage(
        store,
        customerPhone,
        'Your cart is empty. Type "hi" to start shopping!'
      );
      return;
    }

    const cartSummary = this.formatCartSummary(cart);

    await whatsappService.sendTextMessage(store, customerPhone, `🛒 Your Cart:\n\n${cartSummary}`);

    await whatsappService.sendInteractiveButtons(store, customerPhone, 'Ready to checkout?', [
      { id: 'continue_shopping', title: 'Add More Items' },
      { id: 'checkout', title: 'Checkout' },
    ]);

    // Update state to CART
    await prisma.conversationSession.update({
      where: { id: session.id },
      data: { state: STATES.CART },
    });
  }

  /**
   * Handle checkout
   */
  async handleCheckout(store, session, customerPhone) {
    const cart = session.cartData || [];

    if (cart.length === 0) {
      await whatsappService.sendTextMessage(
        store,
        customerPhone,
        'Your cart is empty. Add some items first!'
      );
      await this.handleWelcome(store, session, customerPhone);
      return;
    }

    // Update state
    await prisma.conversationSession.update({
      where: { id: session.id },
      data: { state: STATES.CHECKOUT_LOCATION },
    });

    // Request location
    await whatsappService.sendTextMessage(
      store,
      customerPhone,
      'Great! To complete your order, please share your delivery location.'
    );

    await whatsappService.sendLocationRequest(store, customerPhone);
  }

  /**
   * Handle location sharing
   */
  async handleLocation(store, session, customerPhone, location) {
    // Update customer location
    await prisma.customer.update({
      where: {
        phone_storeId: {
          phone: customerPhone,
          storeId: store.id,
        },
      },
      data: {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
      },
    });

    // Update state
    await prisma.conversationSession.update({
      where: { id: session.id },
      data: { state: STATES.CHECKOUT_PAYMENT },
    });

    // Ask for payment method
    await whatsappService.sendTextMessage(
      store,
      customerPhone,
      '📍 Location received! Now, please choose your payment method:'
    );

    await whatsappService.sendInteractiveButtons(store, customerPhone, 'How would you like to pay?', [
      { id: 'payment_cod', title: 'Cash on Delivery' },
      { id: 'payment_online', title: 'Pay Online' },
    ]);
  }

  /**
   * Handle payment choice
   */
  async handlePaymentChoice(store, session, customerPhone, input) {
    if (!input.selectedId || !input.selectedId.startsWith('payment_')) {
      await whatsappService.sendTextMessage(
        store,
        customerPhone,
        'Please select a payment method.'
      );
      return;
    }

    const paymentMethod = input.selectedId === 'payment_cod' ? 'COD' : 'ONLINE';

    // Create order
    const order = await orderService.createOrder(session, paymentMethod, store.id);

    if (paymentMethod === 'COD') {
      // COD - order confirmed immediately
      await prisma.conversationSession.update({
        where: { id: session.id },
        data: { state: STATES.ORDER_CONFIRMED },
      });

      const confirmationMsg = `✅ Order Confirmed!\n\n` +
        `Order #: ${order.orderNumber}\n` +
        `Total: ₹${order.totalAmount}\n` +
        `Payment: Cash on Delivery\n\n` +
        `We'll deliver to your location soon. Thank you for your order!\n\n` +
        `Type "hi" to start a new order.`;

      await whatsappService.sendTextMessage(store, customerPhone, confirmationMsg);
    } else {
      // Online payment - send Razorpay link
      await prisma.conversationSession.update({
        where: { id: session.id },
        data: { state: STATES.AWAITING_PAYMENT },
      });

      // TODO: Implement Razorpay payment link
      const paymentMsg = `Please complete your payment to confirm the order.\n\n` +
        `Order #: ${order.orderNumber}\n` +
        `Amount: ₹${order.totalAmount}\n\n` +
        `Payment link: [Will be integrated with Razorpay]\n\n` +
        `For now, we'll mark this as COD. Type "hi" to start a new order.`;

      await whatsappService.sendTextMessage(store, customerPhone, paymentMsg);
    }

    // Clear cart
    await prisma.conversationSession.update({
      where: { id: session.id },
      data: { cartData: [] },
    });
  }

  /**
   * Handle help command
   */
  async handleHelp(store, customerPhone) {
    const helpText = `📱 How to Order:\n\n` +
      `1. Type "hi" to start\n` +
      `2. Browse categories and products\n` +
      `3. Add items to cart\n` +
      `4. Share your location\n` +
      `5. Choose payment method\n` +
      `6. Confirm your order!\n\n` +
      `Commands:\n` +
      `• "cart" - View your cart\n` +
      `• "hi" - Start new order\n` +
      `• "help" - Show this message`;

    await whatsappService.sendTextMessage(store, customerPhone, helpText);
  }

  /**
   * Handle catalog order (when user completes purchase in WhatsApp catalog)
   */
  async handleCatalogOrder(store, session, customer, orderData) {
    try {
      logger.info(`Catalog order received from ${customer.phone}`);
      logger.debug('Order data:', JSON.stringify(orderData, null, 2));

      // Extract product items from order
      const cartItems = orderData.product_items.map((item) => ({
        productId: item.product_retailer_id, // Maps to catalogProductId in our DB
        name: item.item_name || item.product_retailer_id,
        price: parseFloat(item.item_price) / 100, // Price comes in smallest currency unit (paise)
        quantity: parseInt(item.quantity),
        catalogProductId: item.product_retailer_id,
      }));

      // Calculate total
      const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Store cart in session
      await prisma.conversationSession.update({
        where: { id: session.id },
        data: {
          cartData: cartItems,
          state: STATES.CHECKOUT_LOCATION,
        },
      });

      // Send order summary
      let summary = `✅ Order Summary:\n\n`;
      cartItems.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        summary += `${index + 1}. ${item.name}\n`;
        summary += `   ₹${item.price} × ${item.quantity} = ₹${subtotal}\n\n`;
      });
      summary += `Total: ₹${totalAmount.toFixed(2)}`;

      await whatsappService.sendTextMessage(store, customer.phone, summary);

      // Check if customer has location
      if (customer.latitude && customer.longitude) {
        // Customer has location, ask for payment method
        await prisma.conversationSession.update({
          where: { id: session.id },
          data: { state: STATES.CHECKOUT_PAYMENT },
        });

        await whatsappService.sendTextMessage(
          store,
          customer.phone,
          'Great! Please choose your payment method:'
        );

        await whatsappService.sendInteractiveButtons(store, customer.phone, 'How would you like to pay?', [
          { id: 'payment_cod', title: 'Cash on Delivery' },
          { id: 'payment_online', title: 'Pay Online' },
        ]);
      } else {
        // Request location
        await whatsappService.sendTextMessage(
          store,
          customer.phone,
          'To complete your order, please share your delivery location:'
        );

        await whatsappService.sendLocationRequest(store, customer.phone);
      }
    } catch (error) {
      logger.error('Error handling catalog order:', error);
      await whatsappService.sendTextMessage(
        store,
        customer.phone,
        'Sorry, there was an error processing your order. Please try again or contact support.'
      );
    }
  }

  /**
   * Format cart summary
   */
  formatCartSummary(cart) {
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
