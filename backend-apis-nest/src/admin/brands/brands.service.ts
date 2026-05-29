import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  private async getStoreId(userId: string): Promise<string> {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');
    return userStore.storeId;
  }

  async listBrands(userId: string) {
    const storeId = await this.getStoreId(userId);

    const brands = await this.prisma.brand.findMany({
      where: { storeId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });

    return {
      brands: brands.map((b) => ({
        id: b.id,
        name: b.name,
        product_count: b._count.products,
        created_at: b.createdAt,
      })),
    };
  }

  async createBrand(userId: string, name: string) {
    if (!name?.trim()) throw new BadRequestException('name is required');

    const storeId = await this.getStoreId(userId);

    try {
      const brand = await this.prisma.brand.create({
        data: { name: name.trim(), storeId },
      });
      return { brand: { id: brand.id, name: brand.name, product_count: 0, created_at: brand.createdAt } };
    } catch (err: any) {
      if (err?.code === 'P2002') throw new ConflictException('A brand with this name already exists');
      throw err;
    }
  }

  async updateBrand(userId: string, brandId: string, name: string) {
    if (!name?.trim()) throw new BadRequestException('name is required');

    const storeId = await this.getStoreId(userId);

    const existing = await this.prisma.brand.findFirst({ where: { id: brandId, storeId } });
    if (!existing) throw new NotFoundException('Brand not found');

    try {
      const brand = await this.prisma.brand.update({
        where: { id: brandId },
        data: { name: name.trim() },
        include: { _count: { select: { products: true } } },
      });
      return { brand: { id: brand.id, name: brand.name, product_count: brand._count.products, created_at: brand.createdAt } };
    } catch (err: any) {
      if (err?.code === 'P2002') throw new ConflictException('A brand with this name already exists');
      throw err;
    }
  }

  async deleteBrand(userId: string, brandId: string) {
    const storeId = await this.getStoreId(userId);

    const existing = await this.prisma.brand.findFirst({ where: { id: brandId, storeId } });
    if (!existing) throw new NotFoundException('Brand not found');

    await this.prisma.brand.delete({ where: { id: brandId } });
    return { message: 'Brand deleted' };
  }
}
