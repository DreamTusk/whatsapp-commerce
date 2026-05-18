import express, { Request, Response } from 'express';
import logger from '../utils/logger.js';
import conversationService from '../services/conversation.js';
import prisma from '../utils/db.js';

const router = express.Router();

router.get('/', (req: Request, res: Response) => {
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

router.post('/', async (req: Request, res: Response) => {
  try {
    res.sendStatus(200);

    const body = req.body;
    logger.debug('Webhook received:', JSON.stringify(body, null, 2));

    if (body.object !== 'whatsapp_business_account') {
      logger.warn('Not a WhatsApp business account event');
      return;
    }

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;

        if (value.statuses) {
          logger.debug('Received status update, skipping');
          continue;
        }

        if (value.messages && value.messages.length > 0) {
          const message = value.messages[0];
          const from: string = message.from;
          const phoneNumberId: string = value.metadata.phone_number_id;

          const store = await prisma.store.findUnique({
            where: { whatsappPhoneNumberId: phoneNumberId },
          });

          if (!store) {
            logger.error(`No store found for phone number ID: ${phoneNumberId}`);
            continue;
          }

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

          await conversationService.handleIncomingMessage(store, message);
        }
      }
    }
  } catch (error) {
    logger.error('Error processing webhook:', error);
  }
});

export default router;
