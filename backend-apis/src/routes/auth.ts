import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../utils/db.js';
import { authMiddleware } from '../middleware/auth.js';
import logger from '../utils/logger.js';
import sendEmail from '../workers/email.js';
import otpService from '../services/otp.js';

const router = express.Router();

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

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpiryDate(),
      },
    });

    const otp = await otpService.createOtp(user.id);
    await sendEmail.sendSimpleEmail(email, "OTP for account verification", `Hi ${user.name},\n\nYour OTP to verify your account is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nDo not share this with anyone.`);

    logger.info(`New user signed up: ${email}`);

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email },
    });


  } catch (error) {
    logger.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//verify user

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

    const userStore = await prisma.userStore.findFirst({
      where: { userId: user.id },
      include: { store: true },
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpiryDate(),
      },
    });

    logger.info(`User logged in: ${email}`);

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email },
      store: userStore?.store ?? null,
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

    res.json({ accessToken });
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
      store: userStore?.store ?? null,
    });
  } catch (error) {
    logger.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
