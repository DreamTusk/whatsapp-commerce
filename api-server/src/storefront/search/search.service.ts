import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StorefrontSearchService {
  constructor(private prisma: PrismaService) {}

  async search(domain: string, q: string) {
    if (!domain) throw new BadRequestException('Missing x-store-domain header');
    if (!q || q.trim().length < 2) return { products: [], categories: [] };

    const store = await this.prisma.store.findUnique({ where: { domain } });
    if (!store) throw new NotFoundException('Store not found');
    if (!store.isActive) throw new BadRequestException('Store is not active');

    const term = q.trim();

    const [products, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          storeId: store.id,
          isActive: true,
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { Brand: { name: { contains: term, mode: 'insensitive' } } },
          ],
        },
        include: {
          Category: { select: { id: true, name: true } },
          Brand: { select: { id: true, name: true } },
          ProductMedia: {
            orderBy: { sortOrder: 'asc' as const },
            include: { Media: { select: { url: true } } },
          },
        },
        take: 6,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.category.findMany({
        where: {
          storeId: store.id,
          isActive: true,
          parentId: null,
          name: { contains: term, mode: 'insensitive' },
        },
        select: { id: true, name: true, imageUrl: true },
        take: 4,
      }),
    ]);

    return {
      products: products.map((p) => {
        const media = p.ProductMedia ?? [];
        const primary = media.find((pm: any) => pm.isPrimary) ?? media[0] ?? null;
        return {
          id: p.id,
          name: p.name,
          image_url: primary?.Media?.url ?? null,
          selling_price: p.sellingPrice,
          original_price: p.originalPrice,
          in_stock: p.inStock,
          category: p.Category ? { id: p.Category.id, name: p.Category.name } : null,
          brand: p.Brand ? { id: p.Brand.id, name: p.Brand.name } : null,
        };
      }),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        image_url: c.imageUrl,
      })),
    };
  }
}
