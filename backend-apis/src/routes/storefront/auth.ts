import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../../utils/db.js';
import smsService from '../../workers/sms.js';
import { customerAuthMiddleware } from '../../middleware/customerAuth.js';

const router = Router();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function getStore(domain: string) {
  return prisma.store.findUnique({ where: { domain } });
}

function formatCustomer(c: { id: string; name: string | null; phone: string | null; email: string | null }) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
  };
}

// GET /api/storefront/auth/methods
router.get('/methods', async (req: Request, res: Response): Promise<void> => {
  const domain = req.headers['x-store-domain'] as string;
  if (!domain) { res.status(400).json({ error: 'x-store-domain header required' }); return; }

  const store = await getStore(domain);
  if (!store) { res.status(404).json({ error: 'Store not found' }); return; }

  res.json({ methods: store.customerAuthMethods });
});

// POST /api/storefront/auth/send-otp
router.post('/send-otp', async (req: Request, res: Response): Promise<void> => {
  const domain = req.headers['x-store-domain'] as string;
  if (!domain) { res.status(400).json({ error: 'x-store-domain header required' }); return; }

  const { phone } = req.body;
  if (!phone) { res.status(400).json({ error: 'phone is required' }); return; }

  const store = await getStore(domain);
  if (!store) { res.status(404).json({ error: 'Store not found' }); return; }

  // Invalidate any existing unused OTPs for this phone + store
  await prisma.customerOtp.updateMany({
    where: { phone, storeId: store.id, isUsed: false },
    data: { isUsed: true },
  });

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.customerOtp.create({
    data: { phone, storeId: store.id, otp, expiresAt },
  });

  await smsService.sendOtp(phone, otp);

  res.json({ message: 'OTP sent successfully' });
});

// POST /api/storefront/auth/verify-otp
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  const domain = req.headers['x-store-domain'] as string;
  if (!domain) { res.status(400).json({ error: 'x-store-domain header required' }); return; }

  const { phone, otp } = req.body;
  if (!phone || !otp) { res.status(400).json({ error: 'phone and otp are required' }); return; }

  const store = await getStore(domain);
  if (!store) { res.status(404).json({ error: 'Store not found' }); return; }

  const devBypass = process.env.NODE_ENV !== 'production' && otp === '123456'

  if (!devBypass) {
    const otpRecord = await prisma.customerOtp.findFirst({
      where: {
        phone,
        storeId: store.id,
        otp,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otpRecord) { res.status(400).json({ error: 'Invalid or expired OTP' }); return; }

    await prisma.customerOtp.update({ where: { id: otpRecord.id }, data: { isUsed: true } });
  }

  const existingCustomer = await prisma.customer.findUnique({
    where: { phone_storeId: { phone, storeId: store.id } },
  });

  const is_new = !existingCustomer;

  const customer = await prisma.customer.upsert({
    where: { phone_storeId: { phone, storeId: store.id } },
    create: { phone, storeId: store.id },
    update: {},
  });

  const access_token = jwt.sign(
    { customerId: customer.id, storeId: store.id, phone },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  );

  res.json({ customer: formatCustomer(customer), is_new, access_token });
});

// GET /api/storefront/auth/me
router.get('/me', customerAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.customer!.customerId },
  });

  if (!customer) { res.status(404).json({ error: 'Customer not found' }); return; }

  res.json({ customer: formatCustomer(customer) });
});

// PUT /api/storefront/auth/profile
router.put('/profile', customerAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body;

  const customer = await prisma.customer.update({
    where: { id: req.customer!.customerId },
    data: { name: name?.trim() || null },
  });

  res.json({ customer: formatCustomer(customer) });
});

// POST /api/storefront/auth/logout
router.post('/logout', customerAuthMiddleware, async (_req: Request, res: Response): Promise<void> => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
