import { execSync } from 'child_process';
import { beforeAll, beforeEach, afterAll } from 'vitest';
import prisma from '../utils/db.js';

beforeAll(() => {
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
});

beforeEach(async () => {
  await prisma.messageLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.conversationSession.deleteMany();
  await prisma.otpVerification.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.storeInvite.deleteMany();
  await prisma.userStore.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
