import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StorefrontStoreService {
  constructor(private prisma: PrismaService) {}

  async getStore(domain: string) {
    if (!domain) throw new BadRequestException('Missing x-store-domain header');

    // Matches either the platform subdomain or a connected custom domain.
    const store = await this.prisma.store.findFirst({
      where: { OR: [{ domain }, { customDomain: domain }] },
      include: {
        StorePaymentProvider: {
          where: { isActive: true },
          select: { provider: true },
        },
      },
    });

    if (!store) throw new NotFoundException('Store not found');

    return {
      store: {
        id: store.id,
        name: store.name,
        phone: store.phone,
        address: store.address,
        logo: store.logo,
        domain: store.domain,
        min_order_amount: store.minOrderAmount,
        is_pickup_enabled: store.isPickupEnabled,
        is_home_delivery_enabled: store.isHomeDeliveryEnabled,
        active_payment_providers: store.StorePaymentProvider.map((p) => p.provider),
      },
    };
  }
}
