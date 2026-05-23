import express, { Request, Response } from 'express';
import prisma from '../../utils/db.js';
import { authMiddleware } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';
import sendEmail from '../../workers/email.js';
import upload from '../../middleware/upload.js';
import storageService from '../../external-services/storage.js';

const router = express.Router();

const formatStore = (store: {
  id: string; name: string; phone: string; domain: string | null;
  catalogId: string | null; address: string | null; logo: string | null;
  minOrderAmount: number; deliveryRadius: number | null; isActive: boolean;
  whatsappPhoneNumberId: string | null; whatsappBusinessAccountId: string | null;
  whatsappAccessToken: string | null; createdAt: Date; updatedAt: Date;
}) => ({
  id: store.id,
  name: store.name,
  phone: store.phone,
  domain: store.domain,
  catalog_id: store.catalogId,
  address: store.address,
  logo: store.logo,
  min_order_amount: store.minOrderAmount,
  delivery_radius: store.deliveryRadius,
  is_active: store.isActive,
  whatsapp_phone_number_id: store.whatsappPhoneNumberId,
  whatsapp_business_account_id: store.whatsappBusinessAccountId,
  whatsapp_access_token: store.whatsappAccessToken,
  created_at: store.createdAt,
  updated_at: store.updatedAt,
});

// GET /api/store/info — public, no auth, resolves store by x-store-domain header
router.get('/info', async (req: Request, res: Response) => {
  const domain = req.headers['x-store-domain'] as string;
  if (!domain) {
    res.status(400).json({ error: 'Missing x-store-domain header' });
    return;
  }
  try {
    const store = await prisma.store.findUnique({ where: { domain } });
    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }
    res.json({
      store: {
        id: store.id,
        name: store.name,
        phone: store.phone,
        domain: store.domain,
        logo: store.logo,
        address: store.address,
        min_order_amount: store.minOrderAmount,
        delivery_radius: store.deliveryRadius,
        is_active: store.isActive,
      },
    });
  } catch (err) {
    logger.error('GET /api/store/info error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.use(authMiddleware);

// POST /api/store
router.post('/', upload.single('logo'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const existingUserStore = await prisma.userStore.findFirst({ where: { userId } });
    if (existingUserStore) {
      res.status(409).json({ error: 'You already have a store' });
      return;
    }

    const {
      name,
      phone,
      domain,
      address,
      logo,
      min_order_amount,
      delivery_radius,
      whatsapp_phone_number_id,
      whatsapp_business_account_id,
      whatsapp_access_token,
    } = req.body;

    if (!name || !phone || !domain) {
      res.status(400).json({ error: 'name, phone and domain are required' });
      return;
    }

    const phoneExists = await prisma.store.findUnique({ where: { phone } });
    if (phoneExists) {
      res.status(409).json({ error: 'Phone number already in use' });
      return;
    }

    const domainExists = await prisma.store.findUnique({ where: { domain } });
    if (domainExists) {
      res.status(409).json({ error: 'Domain already in use' });
      return;
    }

    let logoUrl: string | null = null;
    if (req.file) {
      logoUrl = await storageService.uploadImage(req.file.buffer, 'store-logos');
    }

    const store = await prisma.store.create({
      data: {
        name,
        phone,
        domain: domain || null,
        address: address || null,
        logo: logoUrl,
        minOrderAmount: min_order_amount ? parseFloat(min_order_amount) : 0,
        deliveryRadius: delivery_radius ? parseFloat(delivery_radius) : null,
        whatsappPhoneNumberId: whatsapp_phone_number_id || null,
        whatsappBusinessAccountId: whatsapp_business_account_id || null,
        whatsappAccessToken: whatsapp_access_token || null,
      },
    });

    await prisma.userStore.create({
      data: { userId, storeId: store.id, role: 'OWNER' },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });

    await sendEmail.sendSimpleEmail(
      user!.email,
      'Store Created Successfully',
      `Hi ${user!.name},\n\nYour store "${store.name}" has been created successfully.\n\nYou can now start adding products and categories.`
    );

    logger.info(`Store created: ${store.name} by user: ${userId}`);

    res.status(201).json({ store: formatStore(store) });
  } catch (error) {
    logger.error('Create store error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/store
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const userStore = await prisma.userStore.findFirst({
      where: { userId },
      include: { store: true },
    });

    if (!userStore) {
      res.status(404).json({ error: 'No store found' });
      return;
    }

    res.json({ store: formatStore(userStore.store) });
  } catch (error) {
    logger.error('Get store error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/store
router.put('/', upload.single('logo'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const userStore = await prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) {
      res.status(404).json({ error: 'No store found' });
      return;
    }

    const {
      name,
      phone,
      domain,
      address,
      min_order_amount,
      delivery_radius,
      whatsapp_phone_number_id,
      whatsapp_business_account_id,
      whatsapp_access_token,
    } = req.body;

    let logoUrl: string | undefined = undefined;
    if (req.file) {
      logoUrl = await storageService.uploadImage(req.file.buffer, 'store-logos');
    }

    const store = await prisma.store.update({
      where: { id: userStore.storeId },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(domain !== undefined && { domain }),
        ...(address !== undefined && { address }),
        ...(logoUrl !== undefined && { logo: logoUrl }),
        ...(min_order_amount !== undefined && { minOrderAmount: parseFloat(min_order_amount) }),
        ...(delivery_radius !== undefined && { deliveryRadius: parseFloat(delivery_radius) }),
        ...(whatsapp_phone_number_id !== undefined && { whatsappPhoneNumberId: whatsapp_phone_number_id }),
        ...(whatsapp_business_account_id !== undefined && { whatsappBusinessAccountId: whatsapp_business_account_id }),
        ...(whatsapp_access_token !== undefined && { whatsappAccessToken: whatsapp_access_token }),
      },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });

    await sendEmail.sendSimpleEmail(
      user!.email,
      'Store Updated',
      `Hi ${user!.name},\n\nYour store "${store.name}" details have been updated successfully.`
    );

    logger.info(`Store updated: ${store.name}`);

    res.json({ store: formatStore(store) });
  } catch (error) {
    logger.error('Update store error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/store
router.delete('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const userStore = await prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) {
      res.status(404).json({ error: 'No store found' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const store = await prisma.store.findUnique({ where: { id: userStore.storeId } });

    await prisma.userStore.deleteMany({ where: { storeId: userStore.storeId } });
    await prisma.store.delete({ where: { id: userStore.storeId } });

    await sendEmail.sendSimpleEmail(
      user!.email,
      'Store Deleted',
      `Hi ${user!.name},\n\nYour store "${store!.name}" has been deleted successfully.`
    );

    logger.info(`Store deleted: ${store!.name} by user: ${userId}`);

    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    logger.error('Delete store error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
