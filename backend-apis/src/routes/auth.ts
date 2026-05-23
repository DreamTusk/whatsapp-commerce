import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Role } from '@prisma/client';
import prisma from '../utils/db.js';
import { authMiddleware } from '../middleware/auth.js';
import logger from '../utils/logger.js';
import sendEmail from '../workers/email.js';
import otpService from '../services/otp.js';

const router = express.Router();

function formatStore(store: {
  id: string; name: string; phone: string; domain: string | null;
  catalogId: string | null; address: string | null; logo: string | null;
  minOrderAmount: number; deliveryRadius: number | null; isActive: boolean;
  whatsappPhoneNumberId: string | null; whatsappBusinessAccountId: string | null;
  whatsappAccessToken: string | null; createdAt: Date; updatedAt: Date;
}) {
  return {
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
    created_at: store.createdAt,
    updated_at: store.updatedAt,
  };
}

const ACCESS_TOKEN_EXPIRY = '40m';
const REFRESH_TOKEN_EXPIRY_DAYS = 21;

function generateAccessToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

function refreshTokenExpiryDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return date;
}

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'name, email and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    const access_token = generateAccessToken(user.id);
    const refresh_token = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        token: refresh_token,
        userId: user.id,
        expiresAt: refreshTokenExpiryDate(),
      },
    });

    const otp = await otpService.createOtp(user.id);
    await sendEmail.sendSimpleEmail(email, "OTP for account verification", `Hi ${user.name},\n\nYour OTP to verify your account is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nDo not share this with anyone.`);

    logger.info(`New user signed up: ${email}`);

    res.status(201).json({
      access_token,
      refresh_token,
      user: { id: user.id, name: user.name, email: user.email },
      is_verified: false,
    });


  } catch (error) {
    logger.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'email is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.isVerified) {
      res.status(409).json({ error: 'User is already verified' });
      return;
    }

    // Invalidate all previous OTPs for this user
    await prisma.otpVerification.updateMany({
      where: { userId: user.id, isUsed: false },
      data: { isUsed: true },
    });

    const otp = await otpService.createOtp(user.id);
    await sendEmail.sendSimpleEmail(
      email,
      'OTP for account verification',
      `Hi ${user.name},\n\nYour new OTP to verify your account is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nDo not share this with anyone.`
    );

    logger.info(`OTP resent to: ${email}`);
    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    logger.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/verify-user
router.post('/verify-user', async (req: Request, res: Response) => {
  try {
    const { user_id, otp } = req.body;

    if (!user_id || !otp) {
      res.status(400).json({ error: 'user_id and otp are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: user_id } });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.isVerified) {
      res.status(409).json({ error: 'User is already verified' });
      return;
    }

    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        userId: user_id,
        otp,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otpRecord) {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }

    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    await prisma.user.update({
      where: { id: user_id },
      data: { isVerified: true },
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    logger.error('Verify user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'email is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: 'No account found with this email' });
      return;
    }

    const otp = await otpService.createOtp(user.id);
    await sendEmail.sendSimpleEmail(
      email,
      'Reset your password - OTP',
      `Hi ${user.name},\n\nYour OTP to reset your password is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nIf you did not request this, ignore this email.`
    );

    logger.info(`Forgot password OTP sent to: ${email}`);

    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, otp, new_password } = req.body;

    if (!email || !otp || !new_password) {
      res.status(400).json({ error: 'email, otp and new_password are required' });
      return;
    }

    if (new_password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: 'No account found with this email' });
      return;
    }

    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        userId: user.id,
        otp,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otpRecord) {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await prisma.$transaction([
      prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { isRevoked: true },
      }),
    ]);

    logger.info(`Password reset for: ${email}`);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }


    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({ error: 'Please verify your email before logging in', is_verified: false, user_id: user.id, email:email });
      return;
    }

    const userStore = await prisma.userStore.findFirst({
      where: { userId: user.id },
      include: { store: true },
    });

    const access_token = generateAccessToken(user.id);
    const refresh_token = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        token: refresh_token,
        userId: user.id,
        expiresAt: refreshTokenExpiryDate(),
      },
    });

    logger.info(`User logged in: ${email}`);

    res.json({
      access_token,
      refresh_token,
      user: { id: user.id, name: user.name, email: user.email },
      store: userStore?.store ? formatStore(userStore.store) : null,
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refresh_token: refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'refreshToken is required' });
      return;
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    if (storedToken.isRevoked) {
      res.status(401).json({ error: 'Refresh token has been revoked' });
      return;
    }

    if (storedToken.expiresAt < new Date()) {
      res.status(401).json({ error: 'Refresh token has expired, please login again' });
      return;
    }

    const accessToken = generateAccessToken(storedToken.userId);

    res.json({ access_token: accessToken });
  } catch (error) {
    logger.error('Refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refresh_token: refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'refreshToken is required' });
      return;
    }

    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { isRevoked: true },
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userStore = await prisma.userStore.findFirst({
      where: { userId: user.id },
      include: { store: true },
    });

    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      store: userStore?.store ? formatStore(userStore.store) : null,
    });
  } catch (error) {
    logger.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/invite/:token — get invite details (public, no auth)
router.get('/invite/:token', async (req: Request, res: Response) => {
  try {
    const invite = await prisma.storeInvite.findUnique({
      where: { token: req.params.token as string },
      include: { store: { select: { name: true, logo: true } } },
    });

    if (!invite) {
      res.status(404).json({ error: 'Invite not found' });
      return;
    }

    if (invite.isUsed) {
      res.status(409).json({ error: 'This invite has already been accepted' });
      return;
    }

    if (invite.expiresAt < new Date()) {
      res.status(410).json({ error: 'This invite link has expired' });
      return;
    }

    res.json({
      invite: {
        email: invite.email,
        role: invite.role,
        store_name: invite.store.name,
        store_logo: invite.store.logo,
        expires_at: invite.expiresAt,
      },
    });
  } catch (error) {
    logger.error('Get invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/accept-invite
// New user:      body { token, name, password }         — creates account + joins store
// Existing user: Bearer token + body { token }          — joins store directly
router.post('/accept-invite', async (req: Request, res: Response) => {
  try {
    const { token, name, password } = req.body;

    if (!token) {
      res.status(400).json({ error: 'token is required' });
      return;
    }

    const invite = await prisma.storeInvite.findUnique({
      where: { token },
      include: { store: true },
    });

    if (!invite) {
      res.status(404).json({ error: 'Invite not found' });
      return;
    }

    if (invite.isUsed) {
      res.status(409).json({ error: 'This invite has already been accepted' });
      return;
    }

    if (invite.expiresAt < new Date()) {
      res.status(410).json({ error: 'This invite link has expired' });
      return;
    }

    const authHeader = req.headers.authorization;
    let userId: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Existing logged-in user
      const accessToken = authHeader.split(' ')[1];
      let decoded: { userId: string };
      try {
        decoded = jwt.verify(accessToken, process.env.JWT_SECRET!) as { userId: string };
      } catch {
        res.status(401).json({ error: 'Invalid or expired access token' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (user.email !== invite.email) {
        res.status(403).json({ error: 'This invite was sent to a different email address' });
        return;
      }

      userId = user.id;
    } else {
      // New user — create account
      if (!name || !password) {
        res.status(400).json({ error: 'name and password are required for new users' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters' });
        return;
      }

      const existing = await prisma.user.findUnique({ where: { email: invite.email } });
      if (existing) {
        res.status(409).json({ error: 'An account with this email already exists. Please log in and accept the invite.' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: { name, email: invite.email, password: hashedPassword, isVerified: true },
      });

      userId = newUser.id;
    }

    // Check not already a member
    const alreadyMember = await prisma.userStore.findUnique({
      where: { userId_storeId: { userId, storeId: invite.storeId } },
    });
    if (alreadyMember) {
      res.status(409).json({ error: 'You are already a member of this store' });
      return;
    }

    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken();

    await prisma.$transaction([
      prisma.storeInvite.update({ where: { id: invite.id }, data: { isUsed: true } }),
      prisma.userStore.create({ data: { userId, storeId: invite.storeId, role: invite.role as Role } }),
      prisma.refreshToken.create({ data: { token: refreshToken, userId, expiresAt: refreshTokenExpiryDate() } }),
    ]);

    logger.info(`Invite accepted: ${invite.email} joined store: ${invite.storeId} as ${invite.role}`);

    res.status(201).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      store_name: invite.store.name,
      role: invite.role,
    });
  } catch (error) {
    logger.error('Accept invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
