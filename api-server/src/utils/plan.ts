import { ForbiddenException } from '@nestjs/common';
import { Plan, BillingCycle } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const PLAN_LIMITS: Record<'BASIC' | 'PRO', { maxProducts: number; maxStaff: number; priceMonthly: number }> = {
  BASIC: { maxProducts: 350, maxStaff: 3, priceMonthly: 999 },
  PRO: { maxProducts: 2000, maxStaff: 10, priceMonthly: 2999 },
};

export const YEARLY_MULTIPLIER = 12; // yearly price = monthly price x 12, no discount
export const BILLING_DURATION_DAYS: Record<BillingCycle, number> = { MONTHLY: 30, YEARLY: 365 };

export function planAmount(plan: 'BASIC' | 'PRO', billingCycle: BillingCycle): number {
  const monthly = PLAN_LIMITS[plan].priceMonthly;
  return billingCycle === 'YEARLY' ? monthly * YEARLY_MULTIPLIER : monthly;
}

export function billingPeriod(billingCycle: BillingCycle, startDate = new Date()) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + BILLING_DURATION_DAYS[billingCycle]);
  return { startDate, endDate };
}

export async function assertProductLimit(prisma: PrismaService, storeId: string, plan: Plan) {
  if (plan === 'CUSTOM') return;
  const count = await prisma.product.count({ where: { storeId } });
  const { maxProducts } = PLAN_LIMITS[plan];
  if (count >= maxProducts) {
    throw new ForbiddenException(`Product limit reached for your plan (${maxProducts}). Contact support to upgrade.`);
  }
}

export async function assertStaffLimit(prisma: PrismaService, storeId: string, plan: Plan) {
  if (plan === 'CUSTOM') return;
  const [activeStaff, pendingInvites] = await Promise.all([
    prisma.userStore.count({ where: { storeId, role: 'STAFF', isActive: true } }),
    prisma.storeInvite.count({ where: { storeId, isUsed: false, expiresAt: { gt: new Date() } } }),
  ]);
  const { maxStaff } = PLAN_LIMITS[plan];
  if (activeStaff + pendingInvites >= maxStaff) {
    throw new ForbiddenException(`Staff limit reached for your plan (${maxStaff}). Contact support to upgrade.`);
  }
}

export async function getPlanUsage(prisma: PrismaService, storeId: string, plan: Plan) {
  const [productsUsed, staffUsed] = await Promise.all([
    prisma.product.count({ where: { storeId } }),
    prisma.userStore.count({ where: { storeId, role: 'STAFF', isActive: true } }),
  ]);
  const limits = plan === 'CUSTOM' ? null : PLAN_LIMITS[plan];
  return {
    products: { used: productsUsed, limit: limits?.maxProducts ?? null },
    staff: { used: staffUsed, limit: limits?.maxStaff ?? null },
  };
}
