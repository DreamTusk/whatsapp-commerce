import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import prisma from '../utils/db.js';

// Prevent real emails from being sent during tests
vi.mock('../workers/email.js', () => ({
  default: { sendSimpleEmail: vi.fn().mockResolvedValue(undefined) },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

async function createVerifiedUser(overrides: Record<string, unknown> = {}) {
  const hashedPassword = await bcrypt.hash('password123', 10);
  return prisma.user.create({
    data: {
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      isVerified: true,
      ...overrides,
    },
  });
}

async function createUnverifiedUser() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  return prisma.user.create({
    data: {
      name: 'Unverified User',
      email: 'unverified@example.com',
      password: hashedPassword,
      isVerified: false,
    },
  });
}

function generateToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET!);
}

// ─── Signup ──────────────────────────────────────────────────────────────────

describe('POST /api/auth/signup', () => {
  it('creates user and returns tokens', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'John',
      email: 'john@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).toBeDefined();
    expect(res.body.user.email).toBe('john@example.com');
  });

  it('returns 400 if fields are missing', async () => {
    const res = await request(app).post('/api/auth/signup').send({ email: 'john@example.com' });
    expect(res.status).toBe(400);
  });

  it('returns 400 if password is less than 6 characters', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'John',
      email: 'john@example.com',
      password: '123',
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 if email already in use', async () => {
    await createVerifiedUser({ email: 'john@example.com' });

    const res = await request(app).post('/api/auth/signup').send({
      name: 'John',
      email: 'john@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(409);
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns tokens and user on valid credentials', async () => {
    await createVerifiedUser();

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).toBeDefined();
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('returns 400 if fields are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
  });

  it('returns 401 on wrong password', async () => {
    await createVerifiedUser();

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 with user_id if user is not verified', async () => {
    await createUnverifiedUser();

    const res = await request(app).post('/api/auth/login').send({
      email: 'unverified@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(403);
    expect(res.body.is_verified).toBe(false);
    expect(res.body.user_id).toBeDefined();
  });
});

// ─── Verify User ─────────────────────────────────────────────────────────────

describe('POST /api/auth/verify-user', () => {
  it('verifies user with valid OTP', async () => {
    const user = await createUnverifiedUser();

    // Create a valid OTP directly in DB
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.otpVerification.create({
      data: { userId: user.id, otp: '123456', expiresAt },
    });

    const res = await request(app).post('/api/auth/verify-user').send({
      user_id: user.id,
      otp: '123456',
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Email verified successfully');

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.isVerified).toBe(true);
  });

  it('returns 400 for invalid OTP', async () => {
    const user = await createUnverifiedUser();

    const res = await request(app).post('/api/auth/verify-user').send({
      user_id: user.id,
      otp: '000000',
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 if user is already verified', async () => {
    const user = await createVerifiedUser();

    const res = await request(app).post('/api/auth/verify-user').send({
      user_id: user.id,
      otp: '123456',
    });
    expect(res.status).toBe(409);
  });
});

// ─── Resend OTP ───────────────────────────────────────────────────────────────

describe('POST /api/auth/resend-otp', () => {
  it('sends new OTP successfully', async () => {
    await createUnverifiedUser();

    const res = await request(app).post('/api/auth/resend-otp').send({
      email: 'unverified@example.com',
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('OTP sent successfully');
  });

  it('returns 404 if user not found', async () => {
    const res = await request(app).post('/api/auth/resend-otp').send({
      email: 'nobody@example.com',
    });
    expect(res.status).toBe(404);
  });

  it('returns 409 if user is already verified', async () => {
    await createVerifiedUser();

    const res = await request(app).post('/api/auth/resend-otp').send({
      email: 'test@example.com',
    });
    expect(res.status).toBe(409);
  });
});

// ─── Refresh Token ────────────────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  it('returns new access token with valid refresh token', async () => {
    const user = await createVerifiedUser();
    const expiresAt = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: { token: 'valid_refresh_token', userId: user.id, expiresAt },
    });

    const res = await request(app).post('/api/auth/refresh').send({
      refresh_token: 'valid_refresh_token',
    });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
  });

  it('returns 401 for invalid refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({
      refresh_token: 'invalid_token',
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 for revoked refresh token', async () => {
    const user = await createVerifiedUser();
    const expiresAt = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: { token: 'revoked_token', userId: user.id, expiresAt, isRevoked: true },
    });

    const res = await request(app).post('/api/auth/refresh').send({
      refresh_token: 'revoked_token',
    });
    expect(res.status).toBe(401);
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('revokes refresh token', async () => {
    const user = await createVerifiedUser();
    const expiresAt = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: { token: 'logout_token', userId: user.id, expiresAt },
    });

    const res = await request(app).post('/api/auth/logout').send({
      refresh_token: 'logout_token',
    });

    expect(res.status).toBe(200);

    const token = await prisma.refreshToken.findUnique({ where: { token: 'logout_token' } });
    expect(token!.isRevoked).toBe(true);
  });
});

// ─── Me ───────────────────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  it('returns current user', async () => {
    const user = await createVerifiedUser();
    const token = generateToken(user.id);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

// ─── Forgot Password ──────────────────────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
  it('sends OTP to email', async () => {
    await createVerifiedUser();

    const res = await request(app).post('/api/auth/forgot-password').send({
      email: 'test@example.com',
    });
    expect(res.status).toBe(200);
  });

  it('returns 404 if email not found', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({
      email: 'nobody@example.com',
    });
    expect(res.status).toBe(404);
  });
});

// ─── Reset Password ───────────────────────────────────────────────────────────

describe('POST /api/auth/reset-password', () => {
  it('resets password with valid OTP', async () => {
    const user = await createVerifiedUser();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.otpVerification.create({
      data: { userId: user.id, otp: '654321', expiresAt },
    });

    const res = await request(app).post('/api/auth/reset-password').send({
      email: 'test@example.com',
      otp: '654321',
      new_password: 'newpassword123',
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Password reset successfully');
  });

  it('returns 400 for invalid OTP', async () => {
    await createVerifiedUser();

    const res = await request(app).post('/api/auth/reset-password').send({
      email: 'test@example.com',
      otp: '000000',
      new_password: 'newpassword123',
    });
    expect(res.status).toBe(400);
  });
});
