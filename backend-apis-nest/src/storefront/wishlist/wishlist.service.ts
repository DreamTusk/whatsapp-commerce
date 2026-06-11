import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';

const productInclude = {
  productMedia: {
    orderBy: { sortOrder: 'asc' as const },
    include: { media: { select: { url: true } } },
  },
};

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  private formatItem(item: any) {
    const media = item.product.productMedia ?? [];
    const primary = media.find((pm: any) => pm.isPrimary) ?? media[0] ?? null;
    return {
      id: item.id,
      created_at: item.createdAt,
      product: {
        id: item.product.id,
        name: item.product.name,
        image_url: primary?.media?.url ?? null,
        selling_price: item.product.sellingPrice,
        original_price: item.product.originalPrice,
        unit: item.product.unit,
        in_stock: item.product.inStock,
      },
    };
  }

  async getWishlist(customerId: string, storeId: string) {
    const items = await this.prisma.wishlistItem.findMany({
      where: { customerId, storeId },
      include: { product: { include: productInclude } },
      orderBy: { createdAt: 'desc' },
    });

    return { items: items.map((i) => this.formatItem(i)) };
  }

  async addToWishlist(customerId: string, storeId: string, product_id: string) {
    if (!product_id) throw new BadRequestException('product_id is required');

    const product = await this.prisma.product.findFirst({ where: { id: product_id, storeId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.wishlistItem.findUnique({
      where: { customerId_productId: { customerId, productId: product_id } },
    });
    if (existing) throw new ConflictException('Product already in wishlist');

    try {
      const item = await this.prisma.wishlistItem.create({
        data: { customerId, productId: product_id, storeId },
        include: { product: { include: productInclude } },
      });
      return { item: this.formatItem(item) };
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Product already in wishlist');
      }
      throw e;
    }
  }

  async removeFromWishlist(customerId: string, storeId: string, productId: string) {
    const existing = await this.prisma.wishlistItem.findUnique({
      where: { customerId_productId: { customerId, productId } },
    });
    if (!existing || existing.storeId !== storeId) throw new NotFoundException('Wishlist item not found');

    await this.prisma.wishlistItem.delete({
      where: { customerId_productId: { customerId, productId } },
    });

    return { message: 'Item removed from wishlist' };
  }
}
