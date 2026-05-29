import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const productInclude = {
  brand: { select: { id: true, name: true } },
  category: {
    select: {
      id: true, name: true,
      parent: { select: { id: true, name: true } },
    },
  },
};

@Injectable()
export class StorefrontProductsService {
  constructor(private prisma: PrismaService) {}

  private formatProduct(p: any) {
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      image_url: p.imageUrl,
      category_id: p.categoryId,
      category: {
        id: p.category.id,
        name: p.category.name,
        parent: p.category.parent,
      },
      brand: p.brand,
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
