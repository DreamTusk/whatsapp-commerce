import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import prisma from '../utils/db.js';

vi.mock('../workers/email.js', () => ({
  default: { sendSimpleEmail: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../external-services/cloudinary.js', () => ({
  default: { uploadImage: vi.fn().mockResolvedValue('http://cloudinary.com/test.jpg') },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function generateToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET!);
}

async function createUserWithStore() {
  const user = await createVerifiedUser();
  const store = await prisma.store.create({
    data: { name: 'Test Store', phone: '+919876543210' },
  });
  await prisma.userStore.create({
    data: { userId: user.id, storeId: store.id, role: 'OWNER' },
  });
  return { user, store, token: generateToken(user.id) };
}

// ─── Create Store ─────────────────────────────────────────────────────────────

describe('POST /api/admin/store', () => {
  it('creates store successfully', async () => {
    const user = await createVerifiedUser();
    const token = generateToken(user.id);

    const res = await request(app)
      .post('/api/admin/store')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fresh Mart', phone: '+919876543210' });

    expect(res.status).toBe(201);
    expect(res.body.store.name).toBe('Fresh Mart');
    expect(res.body.store.phone).toBe('+919876543210');
  });

  it('returns 400 if name or phone is missing', async () => {
    const user = await createVerifiedUser();
    const token = generateToken(user.id);

    const res = await request(app)
      .post('/api/admin/store')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fresh Mart' });

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .post('/api/admin/store')
      .send({ name: 'Fresh Mart', phone: '+919876543210' });

    expect(res.status).toBe(401);
  });

  it('returns 409 if user already has a store', async () => {
    const { token } = await createUserWithStore();

    const res = await request(app)
      .post('/api/admin/store')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Another Store', phone: '+911234567890' });

    expect(res.status).toBe(409);
  });

  it('returns 409 if phone number already in use', async () => {
    await prisma.store.create({ data: { name: 'Existing Store', phone: '+919999999999' } });

    const user = await createVerifiedUser({ email: 'another@example.com' });
    const token = generateToken(user.id);

    const res = await request(app)
      .post('/api/admin/store')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Store', phone: '+919999999999' });

    expect(res.status).toBe(409);
  });
});

// ─── Get Store ────────────────────────────────────────────────────────────────

describe('GET /api/admin/store', () => {
  it('returns the store for the logged-in user', async () => {
    const { token } = await createUserWithStore();

    const res = await request(app)
      .get('/api/admin/store')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.store.name).toBe('Test Store');
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/admin/store');
    expect(res.status).toBe(401);
  });

  it('returns 404 if user has no store', async () => {
    const user = await createVerifiedUser();
    const token = generateToken(user.id);

    const res = await request(app)
      .get('/api/admin/store')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─── Update Store ─────────────────────────────────────────────────────────────

describe('PUT /api/admin/store', () => {
  it('updates store fields', async () => {
    const { token } = await createUserWithStore();

    const res = await request(app)
      .put('/api/admin/store')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Store Name' });

    expect(res.status).toBe(200);
    expect(res.body.store.name).toBe('Updated Store Name');
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .put('/api/admin/store')
      .send({ name: 'Updated' });

    expect(res.status).toBe(401);
  });

  it('returns 404 if user has no store', async () => {
    const user = await createVerifiedUser();
    const token = generateToken(user.id);

    const res = await request(app)
      .put('/api/admin/store')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(404);
  });
});

// ─── Delete Store ─────────────────────────────────────────────────────────────

describe('DELETE /api/admin/store', () => {
  it('deletes the store', async () => {
    const { token, store } = await createUserWithStore();

    const res = await request(app)
      .delete('/api/admin/store')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Store deleted successfully');

    const deleted = await prisma.store.findUnique({ where: { id: store.id } });
    expect(deleted).toBeNull();
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).delete('/api/admin/store');
    expect(res.status).toBe(401);
  });

  it('returns 404 if user has no store', async () => {
    const user = await createVerifiedUser();
    const token = generateToken(user.id);

    const res = await request(app)
      .delete('/api/admin/store')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
