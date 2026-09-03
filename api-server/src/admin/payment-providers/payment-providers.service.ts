import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { encrypt, decrypt } from '../../utils/crypto';

const SUPPORTED_PROVIDERS = ['RAZORPAY', 'STRIPE', 'PAYU'];

@Injectable()
export class PaymentProvidersService {
  constructor(private prisma: PrismaService) {}

  private async getStoreId(userId: string): Promise<string> {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');
    return userStore.storeId;
  }

  private format(p: any) {
    return {
      id: p.id,
      provider: p.provider,
      key_id: p.keyId,
      is_active: p.isActive,
      has_webhook_secret: !!p.webhookSecret,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    };
  }

  async list(userId: string) {
    const storeId = await this.getStoreId(userId);
    const providers = await this.prisma.storePaymentProvider.findMany({
      where: { storeId },
      orderBy: { createdAt: 'asc' },
    });
    return { payment_providers: providers.map((p) => this.format(p)) };
  }

  async create(userId: string, body: { provider: string; key_id: string; key_secret: string; webhook_secret?: string }) {
    const { provider, key_id, key_secret, webhook_secret } = body;

    if (!provider?.trim()) throw new BadRequestException('provider is required');
    if (!key_id?.trim()) throw new BadRequestException('key_id is required');
    if (!key_secret?.trim()) throw new BadRequestException('key_secret is required');

    const normalised = provider.toUpperCase();
    if (!SUPPORTED_PROVIDERS.includes(normalised)) {
      throw new BadRequestException(`provider must be one of: ${SUPPORTED_PROVIDERS.join(', ')}`);
    }

    const storeId = await this.getStoreId(userId);

    try {
      const record = await this.prisma.storePaymentProvider.create({
        data: {
          storeId,
          provider: normalised,
          keyId: key_id.trim(),
          keySecret: encrypt(key_secret.trim()),
          webhookSecret: webhook_secret?.trim() ? encrypt(webhook_secret.trim()) : null,
          isActive: false,
        },
      });
      return { payment_provider: this.format(record) };
    } catch (err: any) {
      if (err?.code === 'P2002') throw new ConflictException(`${normalised} is already configured for this store`);
      throw err;
    }
  }

  async update(
    userId: string,
    providerId: string,
    body: { key_id?: string; key_secret?: string; webhook_secret?: string; is_active?: boolean },
  ) {
    const storeId = await this.getStoreId(userId);

    const existing = await this.prisma.storePaymentProvider.findFirst({
      where: { id: providerId, storeId },
    });
    if (!existing) throw new NotFoundException('Payment provider not found');

    const data: any = {};
    if (body.key_id !== undefined) data.keyId = body.key_id.trim();
    if (body.key_secret !== undefined && body.key_secret.trim()) {
      data.keySecret = encrypt(body.key_secret.trim());
    }
    if (body.webhook_secret !== undefined && body.webhook_secret.trim()) {
      data.webhookSecret = encrypt(body.webhook_secret.trim());
    }
    if (body.is_active !== undefined) data.isActive = body.is_active;

    const updated = await this.prisma.storePaymentProvider.update({
      where: { id: providerId },
      data,
    });
    return { payment_provider: this.format(updated) };
  }

  async remove(userId: string, providerId: string) {
    const storeId = await this.getStoreId(userId);

    const existing = await this.prisma.storePaymentProvider.findFirst({
      where: { id: providerId, storeId },
    });
    if (!existing) throw new NotFoundException('Payment provider not found');

    await this.prisma.storePaymentProvider.delete({ where: { id: providerId } });
    return { message: 'Payment provider removed' };
  }

  // Used internally by storefront orders service
  async getActiveProvider(storeId: string, provider: string) {
    const record = await this.prisma.storePaymentProvider.findFirst({
      where: { storeId, provider: provider.toUpperCase(), isActive: true },
    });
    if (!record) return null;
    return {
      keyId: record.keyId,
      keySecret: decrypt(record.keySecret),
    };
  }

  // Used internally by webhook handler
  async getWebhookSecret(storeId: string, provider: string): Promise<string | null> {
    const record = await this.prisma.storePaymentProvider.findFirst({
      where: { storeId, provider: provider.toUpperCase(), isActive: true },
    });
    if (!record?.webhookSecret) return null;
    return decrypt(record.webhookSecret);
  }
}
