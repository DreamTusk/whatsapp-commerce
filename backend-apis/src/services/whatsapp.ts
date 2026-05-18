import axios from 'axios';
import { Store } from '@prisma/client';
import logger from '../utils/logger.js';
import prisma from '../utils/db.js';
import type { WhatsAppButton, WhatsAppSection } from '../types/index.js';

const WHATSAPP_API_VERSION = 'v21.0';
const WHATSAPP_API_URL = 'https://graph.facebook.com';

class WhatsAppService {
  async sendTextMessage(store: Store, to: string, text: string): Promise<void> {
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
          Authorization: `Bearer ${store.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

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
    } catch (error) {
      logger.error('Error sending text message:', (error as Error).message);
      throw error;
    }
  }

  async sendInteractiveList(
    store: Store,
    to: string,
    header: string,
    body: string,
    buttonText: string,
    sections: WhatsAppSection[]
  ): Promise<void> {
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
          action: { button: buttonText, sections },
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${store.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

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
    } catch (error) {
      logger.error('Error sending interactive list:', (error as Error).message);
      throw error;
    }
  }

  async sendInteractiveButtons(
    store: Store,
    to: string,
    body: string,
    buttons: WhatsAppButton[]
  ): Promise<void> {
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
            buttons: buttons.map((btn) => ({
              type: 'reply',
              reply: { id: btn.id, title: btn.title },
            })),
          },
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${store.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

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
    } catch (error) {
      logger.error('Error sending interactive buttons:', (error as Error).message);
      throw error;
    }
  }

  async sendLocationRequest(store: Store, to: string, bodyText?: string): Promise<void> {
    try {
      const url = `${WHATSAPP_API_URL}/${WHATSAPP_API_VERSION}/${store.whatsappPhoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'location_request_message',
          body: { text: bodyText || 'Please share your delivery location' },
          action: { name: 'send_location' },
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${store.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

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
    } catch (error) {
      logger.error('Error sending location request:', (error as Error).message);
      throw error;
    }
  }

  async sendTemplate(
    store: Store,
    to: string,
    templateName: string,
    languageCode = 'en',
    components: unknown[] = []
  ): Promise<void> {
    try {
      const url = `${WHATSAPP_API_URL}/${WHATSAPP_API_VERSION}/${store.whatsappPhoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: { name: templateName, language: { code: languageCode }, components },
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${store.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

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
    } catch (error) {
      logger.error('Error sending template message:', (error as Error).message);
      throw error;
    }
  }

  async sendCatalogMessage(store: Store, to: string, bodyText: string): Promise<void> {
    try {
      if (!store.catalogId) throw new Error('Store does not have a catalog ID configured');

      const url = `${WHATSAPP_API_URL}/${WHATSAPP_API_VERSION}/${store.whatsappPhoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'catalog_message',
          body: { text: bodyText || 'Browse our products and add items to cart' },
          action: {
            name: 'catalog_message',
            parameters: { thumbnail_product_retailer_id: '' },
          },
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${store.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

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
    } catch (error) {
      logger.error('Error sending catalog message:', (error as Error).message);
      throw error;
    }
  }

  async sendProductListMessage(
    store: Store,
    to: string,
    headerText: string,
    bodyText: string,
    sections: WhatsAppSection[]
  ): Promise<void> {
    try {
      if (!store.catalogId) throw new Error('Store does not have a catalog ID configured');

      const url = `${WHATSAPP_API_URL}/${WHATSAPP_API_VERSION}/${store.whatsappPhoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'product_list',
          header: { type: 'text', text: headerText },
          body: { text: bodyText },
          action: { catalog_id: store.catalogId, sections },
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${store.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

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
    } catch (error) {
      logger.error('Error sending product list message:', (error as Error).message);
      throw error;
    }
  }

  async sendSingleProductMessage(
    store: Store,
    to: string,
    bodyText: string,
    productRetailerId: string
  ): Promise<void> {
    try {
      if (!store.catalogId) throw new Error('Store does not have a catalog ID configured');

      const url = `${WHATSAPP_API_URL}/${WHATSAPP_API_VERSION}/${store.whatsappPhoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'product',
          body: { text: bodyText },
          action: { catalog_id: store.catalogId, product_retailer_id: productRetailerId },
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${store.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

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
    } catch (error) {
      logger.error('Error sending single product message:', (error as Error).message);
      throw error;
    }
  }

  async markAsRead(store: Store, messageId: string): Promise<void> {
    try {
      const url = `${WHATSAPP_API_URL}/${WHATSAPP_API_VERSION}/${store.whatsappPhoneNumberId}/messages`;

      await axios.post(
        url,
        { messaging_product: 'whatsapp', status: 'read', message_id: messageId },
        {
          headers: {
            Authorization: `Bearer ${store.whatsappAccessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.debug(`Message marked as read: ${messageId}`);
    } catch (error) {
      logger.error('Error marking message as read:', (error as Error).message);
    }
  }
}

export default new WhatsAppService();
