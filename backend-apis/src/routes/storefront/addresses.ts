import express, { Request, Response } from 'express';
import prisma from '../../utils/db.js';
import { customerAuthMiddleware } from '../../middleware/customerAuth.js';

const router = express.Router();
router.use(customerAuthMiddleware);

const formatAddress = (a: {
  id: string; label: string | null; address: string | null;
  doorNo: string | null; street: string | null; city: string | null;
  state: string | null; country: string | null; pincode: string | null;
  latitude: number | null; longitude: number | null; isDefault: boolean;
  createdAt: Date; updatedAt: Date;
}) => ({
  id: a.id,
  label: a.label,
  address: a.address,
  door_no: a.doorNo,
  street: a.street,
  city: a.city,
  state: a.state,
  country: a.country,
  pincode: a.pincode,
  latitude: a.latitude,
  longitude: a.longitude,
  is_default: a.isDefault,
  created_at: a.createdAt,
  updated_at: a.updatedAt,
});

// GET /api/storefront/addresses
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, storeId } = req.customer!;
    const addresses = await prisma.customerAddress.findMany({
      where: { customerId, storeId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    res.json({ addresses: addresses.map(formatAddress) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// POST /api/storefront/addresses
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, storeId } = req.customer!;
    const { label, address, door_no, street, city, state, country, pincode, latitude, longitude, is_default = false } = req.body;

    if (!address && !street && !city) {
      res.status(400).json({ error: 'At least one of address, street, or city is required' }); return;
    }

    // If setting as default, clear existing default first
    if (is_default) {
      await prisma.customerAddress.updateMany({
        where: { customerId, storeId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const newAddress = await prisma.customerAddress.create({
      data: {
        customerId,
        storeId,
        label: label?.trim() || null,
        address: address?.trim() || null,
        doorNo: door_no?.trim() || null,
        street: street?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        country: country?.trim() || null,
        pincode: pincode?.trim() || null,
        latitude: typeof latitude === 'number' ? latitude : null,
        longitude: typeof longitude === 'number' ? longitude : null,
        isDefault: !!is_default,
      },
    });

    res.status(201).json({ address: formatAddress(newAddress) });
  } catch {
    res.status(500).json({ error: 'Failed to create address' });
  }
});

// PUT /api/storefront/addresses/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, storeId } = req.customer!;
    const { label, address, door_no, street, city, state, country, pincode, latitude, longitude, is_default } = req.body;

    const existing = await prisma.customerAddress.findFirst({
      where: { id: req.params.id as string, customerId, storeId },
    });
    if (!existing) { res.status(404).json({ error: 'Address not found' }); return; }

    if (is_default && !existing.isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId, storeId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.customerAddress.update({
      where: { id: existing.id },
      data: {
        label: label?.trim() || null,
        address: address?.trim() || null,
        doorNo: door_no?.trim() || null,
        street: street?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        country: country?.trim() || null,
        pincode: pincode?.trim() || null,
        latitude: typeof latitude === 'number' ? latitude : null,
        longitude: typeof longitude === 'number' ? longitude : null,
        ...(is_default !== undefined ? { isDefault: !!is_default } : {}),
      },
    });

    res.json({ address: formatAddress(updated) });
  } catch {
    res.status(500).json({ error: 'Failed to update address' });
  }
});

// PATCH /api/storefront/addresses/:id/default
router.patch('/:id/default', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, storeId } = req.customer!;

    const existing = await prisma.customerAddress.findFirst({
      where: { id: req.params.id as string, customerId, storeId },
    });
    if (!existing) { res.status(404).json({ error: 'Address not found' }); return; }

    await prisma.customerAddress.updateMany({
      where: { customerId, storeId, isDefault: true },
      data: { isDefault: false },
    });

    const updated = await prisma.customerAddress.update({
      where: { id: existing.id },
      data: { isDefault: true },
    });

    res.json({ address: formatAddress(updated) });
  } catch {
    res.status(500).json({ error: 'Failed to set default address' });
  }
});

// DELETE /api/storefront/addresses/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, storeId } = req.customer!;

    const existing = await prisma.customerAddress.findFirst({
      where: { id: req.params.id as string, customerId, storeId },
    });
    if (!existing) { res.status(404).json({ error: 'Address not found' }); return; }

    await prisma.customerAddress.delete({ where: { id: existing.id } });
    res.json({ message: 'Address deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

export default router;
