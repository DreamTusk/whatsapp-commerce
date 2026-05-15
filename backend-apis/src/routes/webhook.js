import express from 'express';
import logger from '../utils/logger.js';
import conversationService from '../services/conversation.js';
import prisma from '../utils/db.js';

const router = express.Router();

// WhatsApp webhook verification (GET)
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  logger.info('Webhook verification request received', { mode, token });

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    logger.error('Webhook verification failed');
    res.sendStatus(403);
  }
});

// WhatsApp webhook messages (POST)
router.post('/', async (req, res) => {
  try {
    // Always respond 200 immediately to Meta
    res.sendStatus(200);

    const body = req.body;
    logger.debug('Webhook received:', JSON.stringify(body, null, 2));

    // Check if this is a WhatsApp message event
    if (body.object !== 'whatsapp_business_account') {
      logger.warn('Not a WhatsApp business account event');
      return;
    }

    // Process each entry
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;

        // Skip statuses (delivery receipts, read receipts, etc.)
        if (value.statuses) {
          logger.debug('Received status update, skipping');
          continue;
        }

        // Process incoming messages
        if (value.messages && value.messages.length > 0) {
          const message = value.messages[0];
          const from = message.from; // Customer phone number
          const phoneNumberId = value.metadata.phone_number_id;

          // Find which store this phone number belongs to
          const store = await prisma.store.findUnique({
            where: { whatsappPhoneNumberId: phoneNumberId },
          });

          if (!store) {
            logger.error(`No store found for phone number ID: ${phoneNumberId}`);
            continue;
          }

          // Log incoming message
          await prisma.messageLog.create({
            data: {
              storeId: store.id,
              customerPhone: from,
              direction: 'INBOUND',
              messageType: message.type,
              content: message,
              whatsappMsgId: message.id,
            },
          });

          // Handle the message
          await conversationService.handleIncomingMessage(store, message);
        }
      }
    }
  } catch (error) {
    logger.error('Error processing webhook:', error);
  }
});

export default router;
