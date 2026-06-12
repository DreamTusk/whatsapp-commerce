import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const productMediaInclude = {
  ProductMedia: {
    orderBy: { sortOrder: 'asc' as const },
    include: { Media: { select: { url: true } } },
  },
};

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  private formatItem(item: any) {
    const media = item.Product.ProductMedia ?? [];
    const primary = media.find((pm: any) => pm.isPrimary) ?? media[0] ?? null;
    return {
      id: item.id,
      quantity: item.quantity,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      product: {
        id: item.Product.id,
        name: item.Product.name,
        image_url: primary?.Media?.url ?? null,
        selling_price: item.Product.sellingPrice,
        original_price: item.Product.originalPrice,
        unit: item.Product.unit,
        in_stock: item.Product.inStock,
      },
    };
  }

  async getCart(customerId: string, storeId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { customerId, storeId },
      include: { Product: { include: productMediaInclude } },
      orderBy: { createdAt: 'asc' },
    });

    const total = items.reduce((sum, i) => sum + i.Product.sellingPrice * i.quantity, 0);
    return { items: items.map((i) => this.formatItem(i)), total };
  }

  async addToCart(customerId: string, storeId: string, product_id: string, quantity = 1) {
    if (!product_id) throw new BadRequestException('product_id is required');
    if (quantity < 1) throw new BadRequestException('quantity must be at least 1');

    const product = await this.prisma.product.findFirst({
      where: { id: product_id, storeId, isActive: true },
      select: { inStock: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (!product.inStock) throw new BadRequestException('Product is out of stock');

    const existing = await this.prisma.cartItem.findUnique({
      where: { customerId_productId: { customerId, productId: product_id } },
    });

    const item = existing
      ? await this.prisma.cartItem.update({
          where: { customerId_productId: { customerId, productId: product_id } },
          data: { quantity: existing.quantity + quantity },
          include: { Product: { include: productMediaInclude } },
        })
      : await this.prisma.cartItem.create({
          data: { customerId, productId: product_id, storeId, quantity },
          include: { Product: { include: productMediaInclude } },
        });

    return { item: this.formatItem(item) };
  }

  async updateQuantity(customerId: string, storeId: string, productId: string, quantity: number) {
    if (!quantity || quantity < 1) throw new BadRequestException('quantity must be at least 1');

    const existing = await this.prisma.cartItem.findUnique({
      where: { customerId_productId: { customerId, productId } },
    });
    if (!existing || existing.storeId !== storeId) throw new NotFoundException('Cart item not found');

    const item = await this.prisma.cartItem.update({
      where: { customerId_productId: { customerId, productId } },
      data: { quantity },
      include: { Product: { include: productMediaInclude } },
    });

    return { item: this.formatItem(item) };
  }

  async removeItem(customerId: string, storeId: string, productId: string) {
    const existing = await this.prisma.cartItem.findUnique({
      where: { customerId_productId: { customerId, productId } },
    });
    if (!existing || existing.storeId !== storeId) throw new NotFoundException('Cart item not found');

    await this.prisma.cartItem.delete({
      where: { customerId_productId: { customerId, productId } },
    });

    return { message: 'Item removed from cart' };
  }

  async clearCart(customerId: string, storeId: string) {
    await this.prisma.cartItem.deleteMany({ where: { customerId, storeId } });
    return { message: 'Cart cleared' };
  }
}
