import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StorefrontBannersService {
  constructor(private prisma: PrismaService) {}

  async listBanners(domain: string) {
    if (!domain) throw new BadRequestException('Missing x-store-domain header');

    const store = await this.prisma.store.findUnique({ where: { domain } });
    if (!store) throw new NotFoundException('Store not found');
    if (!store.isActive) throw new BadRequestException('Store is not active');

    const now = new Date();

    const banners = await this.prisma.banner.findMany({
      where: {
        storeId: store.id,
        isActive: true,
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        ],
      },
      orderBy: { displayOrder: 'asc' },
    });

    return {
      banners: banners.map((b) => ({
        id: b.id,
        name: b.name,
        type: b.type.toLowerCase(),
        image_url: b.imageUrl,
        product_id: b.productId,
        collection_id: b.collectionId,
        category_id: b.categoryId,
        url: b.url,
      })),
    };
  }
}
