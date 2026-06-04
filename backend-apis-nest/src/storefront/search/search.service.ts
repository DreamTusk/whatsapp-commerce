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

    const term = q.trim();

    const [products, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          storeId: store.id,
          isActive: true,
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { brand: { name: { contains: term, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          sellingPrice: true,
          originalPrice: true,
          inStock: true,
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
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
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        image_url: p.imageUrl,
        selling_price: p.sellingPrice,
        original_price: p.originalPrice,
        in_stock: p.inStock,
        category: p.category ? { id: p.category.id, name: p.category.name } : null,
        brand: p.brand ? { id: p.brand.id, name: p.brand.name } : null,
      })),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        image_url: c.imageUrl,
      })),
    };
  }
}
