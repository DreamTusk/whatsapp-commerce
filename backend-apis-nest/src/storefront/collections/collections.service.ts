import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildCriteriaWhere } from '../../utils/collection-criteria';

const productMediaInclude = {
  productMedia: {
    orderBy: { sortOrder: 'asc' as const },
    include: { media: { select: { url: true } } },
  },
};

@Injectable()
export class StorefrontCollectionsService {
  constructor(private prisma: PrismaService) {}

  private formatProduct(p: any) {
    const media = (p.productMedia ?? []);
    const primary = media.find((pm: any) => pm.isPrimary) ?? media[0] ?? null;
    return {
      id: p.id,
      name: p.name,
      image_url: primary?.media?.url ?? null,
      selling_price: p.sellingPrice,
      original_price: p.originalPrice,
      unit: p.unit,
      in_stock: p.inStock,
      category_id: p.categoryId,
      brand_id: p.brandId,
      description: p.description,
    };
  }

  async getCollection(domain: string, collectionId: string) {
    if (!domain) throw new BadRequestException('Missing x-store-domain header');

    const store = await this.prisma.store.findUnique({ where: { domain } });
    if (!store) throw new NotFoundException('Store not found');

    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, storeId: store.id, isActive: true },
    });
    if (!collection) throw new NotFoundException('Collection not found');

    let products: any[] = [];
    if (collection.type === 'MANUAL') {
      const cp = await this.prisma.collectionProduct.findMany({
        where: { collectionId: collection.id },
        orderBy: { position: 'asc' },
        include: { product: { include: productMediaInclude } },
      });
      products = cp.map(({ product }) => this.formatProduct(product));
    } else {
      const ps = await this.prisma.product.findMany({
        where: buildCriteriaWhere(collection.criteria, store.id),
        orderBy: { createdAt: 'desc' },
        include: productMediaInclude,
      });
      products = ps.map((p) => this.formatProduct(p));
    }

    return {
      collection: {
        id: collection.id,
        name: collection.name,
        type: collection.type.toLowerCase(),
        image_url: collection.imageUrl,
      },
      products,
    };
  }
}
