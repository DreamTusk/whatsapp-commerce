import axios from 'axios';
import logger from '../utils/logger.js';
import prisma from '../utils/db.js';

const WHATSAPP_API_VERSION = 'v21.0';
const WHATSAPP_API_URL = 'https://graph.facebook.com';

class WhatsAppService {
  /**
   * Send a text message
   */
  async sendTextMessage(store, to, text) {
    try {
      const url = `${WHATSAPP_API_URL}/${WHATSAPP_API_VERSION}/${store.whatsappPhoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text },
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${store.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Log outbound message
      await prisma.messageLog.create({
        data: {
          storeId: store.id,
          customerPhone: to,
          direction: 'OUTBOUND',
          messageType: 'text',
          content: payload,
          whatsappMsgId: response.data.messages?.[0]?.id,
        },
      });

      logger.debug(`Text message sent to ${to}:`, text);
      return response.data;
    } catch (error) {
      logger.error('Error sending text message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send an interactive list message
   */
  async sendInteractiveList(store, to, header, body, buttonText, sections) {
    try {
      const url = `${WHATSAPP_API_URL}/${WHATSAPP_API_VERSION}/${store.whatsappPhoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: header ? { type: 'text', text: header } : undefined,
          body: { text: body },
          action: {
            button: buttonText,
            sections,
          },
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${store.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Log outbound message
      await prisma.messageLog.create({
        data: {
          storeId: store.id,
          customerPhone: to,
          direction: 'OUTBOUND',
          messageType: 'interactive',
          content: payload,
          whatsappMsgId: response.data.messages?.[0]?.id,
        },
      });

      logger.debug(`Interactive list sent to ${to}`);
      return response.data;
    } catch (error) {
      logger.error('Error sending interactive list:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send interactive reply buttons
   */
  async sendInteractiveButtons(store, to, body, buttons) {
    try {
      const url = `${WHATSAPP_API_URL}/${WHATSAPP_API_VERSION}/${store.whatsappPhoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: body },
          action: {
            buttons: buttons.map((btn, idx) => ({
              type: 'reply',
              reply: {
                id: btn.id,
                title: btn.title,
              },
            })),
          },
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${store.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Log outbound message
      await prisma.messageLog.create({
        data: {
          storeId: store.id,
          customerPhone: to,
          direction: 'OUTBOUND',
          messageType: 'interactive',
          content: payload,
          whatsappMsgId: response.data.messages?.[0]?.id,
        },
      });

      logger.debug(`Interactive buttons sent to ${to}`);
      return response.data;
    } catch (error) {
      logger.error('Error sending interactive buttons:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send location request
   */
  async sendLocationRequest(store, to, bodyText) {
    try {
      const url = `${WHATSAPP_API_URL}/${WHATSAPP_API_VERSION}/${store.whatsappPhoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'location_request_message',
          body: {
            text: bodyText || 'Please share your delivery location',
          },
          action: {
            name: 'send_location',
          },
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${store.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Log outbound message
      await prisma.messageLog.create({
        data: {
          storeId: store.id,
          customerPhone: to,
          direction: 'OUTBOUND',
          messageType: 'interactive',
          content: payload,
          whatsappMsgId: response.data.messages?.[0]?.id,
        },
      });

      logger.debug(`Location request sent to ${to}`);
      return response.data;
    } catch (error) {
      logger.error('Error sending location request:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send template message
   */
  async sendTemplate(store, to, templateName, languageCode = 'en', components = []) {
    try {
      const url = `${WHATSAPP_API_URL}/${WHATSAPP_API_VERSION}/${store.whatsappPhoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${store.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Log outbound message
      await prisma.messageLog.create({
        data: {
          storeId: store.id,
          customerPhone: to,
          direction: 'OUTBOUND',
          messageType: 'template',
          content: payload,
          whatsappMsgId: response.data.messages?.[0]?.id,
        },
      });

      logger.debug(`Template message sent to ${to}: ${templateName}`);
      return response.data;
    } catch (error) {
      logger.error('Error sending template message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send catalog message (entire catalog)
   */
  async sendCatalogMessage(store, to, bodyText) {
    try {
      if (!store.catalogId) {
        throw new Error('Store does not have a catalog ID configured');
      }

      const url = `${WHATSAPP_API_URL}/${WHATSAPP_API_VERSION}/${store.whatsappPhoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'catalog_message',
          body: {
            text: bodyText || 'Browse our products and add items to cart',
          },
          action: {
            name: 'catalog_message',
            parameters: {
              thumbnail_product_retailer_id: '', // Can specify a featured product
            },
          },
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${store.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Log outbound message
      await prisma.messageLog.create({
        data: {
          storeId: store.id,
          customerPhone: to,
          direction: 'OUTBOUND',
          messageType: 'catalog',
          content: payload,
          whatsappMsgId: response.data.messages?.[0]?.id,
        },
      });

      logger.debug(`Catalog message sent to ${to}`);
      return response.data;
    } catch (error) {
      logger.error('Error sending catalog message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send product list message (multi-product from catalog)
   */
  async sendProductListMessage(store, to, headerText, bodyText, sections) {
    try {
      if (!store.catalogId) {
        throw new Error('Store does not have a catalog ID configured');
      }

      const url = `${WHATSAPP_API_URL}/${WHATSAPP_API_VERSION}/${store.whatsappPhoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'product_list',
          header: {
            type: 'text',
            text: headerText,
          },
          body: {
            text: bodyText,
          },
          action: {
            catalog_id: store.catalogId,
            sections,
          },
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${store.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Log outbound message
      await prisma.messageLog.create({
        data: {
          storeId: store.id,
          customerPhone: to,
          direction: 'OUTBOUND',
          messageType: 'catalog',
          content: payload,
          whatsappMsgId: response.data.messages?.[0]?.id,
        },
      });

      logger.debug(`Product list message sent to ${to}`);
      return response.data;
    } catch (error) {
      logger.error('Error sending product list message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send single product message
   */
  async sendSingleProductMessage(store, to, bodyText, productRetailerId) {
    try {
      if (!store.catalogId) {
        throw new Error('Store does not have a catalog ID configured');
      }

      const url = `${WHATSAPP_API_URL}/${WHATSAPP_API_VERSION}/${store.whatsappPhoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'product',
          body: {
            text: bodyText,
          },
          action: {
            catalog_id: store.catalogId,
            product_retailer_id: productRetailerId,
          },
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${store.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Log outbound message
      await prisma.messageLog.create({
        data: {
          storeId: store.id,
          customerPhone: to,
          direction: 'OUTBOUND',
          messageType: 'catalog',
          content: payload,
          whatsappMsgId: response.data.messages?.[0]?.id,
        },
      });

      logger.debug(`Single product message sent to ${to}`);
      return response.data;
    } catch (error) {
      logger.error('Error sending single product message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(store, messageId) {
    try {
      const url = `${WHATSAPP_API_URL}/${WHATSAPP_API_VERSION}/${store.whatsappPhoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      };

      await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${store.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

      logger.debug(`Message marked as read: ${messageId}`);
    } catch (error) {
      logger.error('Error marking message as read:', error.response?.data || error.message);
    }
  }
}

export default new WhatsAppService();
