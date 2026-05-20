import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { Role } from '@prisma/client';
import prisma from '../../utils/db.js';
import { authMiddleware } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';
import sendEmail from '../../workers/email.js';

const router = express.Router();

const INVITE_EXPIRY_DAYS = 3;
const VALID_ROLES: Role[] = [Role.OWNER, Role.MANAGER, Role.SALES_EXECUTIVE, Role.EMPLOYEE];

router.use(authMiddleware);

// POST /api/invite
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const userStore = await prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) {
      res.status(404).json({ error: 'No store found' });
      return;
    }

    const { email, role } = req.body;

    if (!email || !role) {
      res.status(400).json({ error: 'email and role are required' });
      return;
    }

    if (!VALID_ROLES.includes(role as Role)) {
      res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
      return;
    }

    // Check if this email already belongs to a member of this store
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const alreadyMember = await prisma.userStore.findUnique({
        where: { userId_storeId: { userId: existingUser.id, storeId: userStore.storeId } },
      });
      if (alreadyMember) {
        res.status(409).json({ error: 'This user is already a member of your store' });
        return;
      }
    }

    // Replace any existing pending invite for same email+store
    await prisma.storeInvite.deleteMany({
      where: { email, storeId: userStore.storeId, isUsed: false },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const invite = await prisma.storeInvite.create({
      data: {
        storeId: userStore.storeId,
        email,
        role: role as Role,
        token,
        expiresAt,
      },
      include: { store: true },
    });

    const inviteLink = `http://localhost:3001/accept-invite?token=${token}`;

    await sendEmail.sendSimpleEmail(
      email,
      `You've been invited to join ${invite.store.name}`,
      `Hi,\n\nYou've been invited to join "${invite.store.name}" as ${role}.\n\nAccept your invite here:\n${inviteLink}\n\nThis link expires in ${INVITE_EXPIRY_DAYS} days.\n\nIf you did not expect this, you can ignore this email.`
    );

    logger.info(`Invite sent to ${email} for store: ${userStore.storeId} with role: ${role}`);

    res.status(201).json({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expires_at: invite.expiresAt,
        created_at: invite.createdAt,
      },
    });
  } catch (error) {
    logger.error('Create invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invite — list pending invites for the store
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const userStore = await prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) {
      res.status(404).json({ error: 'No store found' });
      return;
    }

    const invites = await prisma.storeInvite.findMany({
      where: { storeId: userStore.storeId, isUsed: false },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      invites: invites.map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expires_at: inv.expiresAt,
        created_at: inv.createdAt,
      })),
    });
  } catch (error) {
    logger.error('List invites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/invite/:id — cancel an invite
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const userStore = await prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) {
      res.status(404).json({ error: 'No store found' });
      return;
    }

    const invite = await prisma.storeInvite.findFirst({
      where: { id: req.params.id as string, storeId: userStore.storeId },
    });

    if (!invite) {
      res.status(404).json({ error: 'Invite not found' });
      return;
    }

    if (invite.isUsed) {
      res.status(409).json({ error: 'Cannot cancel an already accepted invite' });
      return;
    }

    await prisma.storeInvite.delete({ where: { id: invite.id } });

    logger.info(`Invite cancelled: ${invite.id}`);

    res.json({ message: 'Invite cancelled successfully' });
  } catch (error) {
    logger.error('Cancel invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
