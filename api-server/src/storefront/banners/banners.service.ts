import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StorefrontBannersService {
  constructor(private prisma: PrismaService) {}

  async listBanners(storeId: string) {
    const now = new Date();

    const banners = await this.prisma.banner.findMany({
      where: {
        storeId,
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
