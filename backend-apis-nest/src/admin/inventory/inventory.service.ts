import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  private async getStoreId(userId: string): Promise<string> {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');
    return userStore.storeId;
  }

  async listInventory(userId: string) {
    const storeId = await this.getStoreId(userId);

    const products = await this.prisma.product.findMany({
      where: { storeId },
      include: { category: { select: { id: true, name: true } } },
    });

    return {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        image_url: p.imageUrl,
        selling_price: p.sellingPrice,
        unit: p.unit,
        in_stock: p.inStock,
        is_active: p.isActive,
        category: p.category,
      })),
    };
  }

  async updateStock(userId: string, productId: string, in_stock: any) {
    if (in_stock === undefined) throw new BadRequestException('in_stock is required');

    const storeId = await this.getStoreId(userId);

    const product = await this.prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!product) throw new NotFoundException('Product not found');

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { inStock: in_stock === true || in_stock === 'true' },
    });

    return { product: { id: updated.id, in_stock: updated.inStock } };
  }
}
