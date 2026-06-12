import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const productInclude = {
  Brand: { select: { id: true, name: true } },
  Category: {
    select: {
      id: true, name: true,
      Category: { select: { id: true, name: true } },
    },
  },
  ProductMedia: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      Media: { select: { url: true, thumbnailUrl: true } },
    },
  },
};

@Injectable()
export class StorefrontProductsService {
  constructor(private prisma: PrismaService) {}

  private formatProduct(p: any) {
    const images = (p.ProductMedia ?? []).map((pm: any) => ({
      url: pm.Media.url,
      thumbnail_url: pm.Media.thumbnailUrl,
      is_primary: pm.isPrimary,
    }));
    const primaryImage = images.find((i: any) => i.is_primary) ?? images[0] ?? null;

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      image_url: primaryImage?.url ?? null,
      images,
      category_id: p.categoryId,
      category: {
        id: p.Category.id,
        name: p.Category.name,
        parent: p.Category.Category,
      },
      brand: p.Brand,
      selling_price: p.sellingPrice,
      original_price: p.originalPrice,
      unit: p.unit,
      in_stock: p.inStock,
    };
  }

  private async getStore(domain: string) {
    if (!domain) throw new BadRequestException('Missing x-store-domain header');
    const store = await this.prisma.store.findUnique({ where: { domain } });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async listProducts(domain: string, category_id?: string) {
    const store = await this.getStore(domain);

    let categoryFilter: { categoryId: string | { in: string[] } } | undefined;
    if (category_id) {
      const children = await this.prisma.category.findMany({
        where: { parentId: category_id, storeId: store.id },
        select: { id: true },
      });
      categoryFilter = children.length > 0
        ? { categoryId: { in: children.map((c) => c.id) } }
        : { categoryId: category_id };
    }

    const products = await this.prisma.product.findMany({
      where: { storeId: store.id, isActive: true, ...categoryFilter },
      orderBy: { createdAt: 'asc' },
      include: productInclude,
    });

    return { products: products.map((p) => this.formatProduct(p)) };
  }

  async getProduct(domain: string, productId: string) {
    const store = await this.getStore(domain);

    const product = await this.prisma.product.findFirst({
      where: { id: productId, storeId: store.id, isActive: true },
      include: productInclude,
    });
    if (!product) throw new NotFoundException('Product not found');

    return { product: this.formatProduct(product) };
  }
}
