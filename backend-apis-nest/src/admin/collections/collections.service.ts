import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildCriteriaWhere } from '../../utils/collection-criteria';

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService) {}

  private async getStoreId(userId: string): Promise<string> {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('Store not found');
    return userStore.storeId;
  }

  private formatProduct(p: any) {
    return {
      id: p.id,
      name: p.name,
      image_url: p.imageUrl,
      selling_price: p.sellingPrice,
      original_price: p.originalPrice,
      unit: p.unit,
      in_stock: p.inStock,
      category_id: p.categoryId,
      brand_id: p.brandId,
    };
  }

  private formatCollection(c: any) {
    return {
      id: c.id,
      name: c.name,
      type: c.type.toLowerCase(),
      criteria: c.criteria ?? null,
      is_active: c.isActive,
      display_order: c.displayOrder,
      image_url: c.imageUrl,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    };
  }

  async listCollections(userId: string) {
    const storeId = await this.getStoreId(userId);

    const collections = await this.prisma.collection.findMany({
      where: { storeId },
      orderBy: { displayOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    });

    return {
      collections: collections.map((c) => ({
        ...this.formatCollection(c),
        product_count: c._count.products,
      })),
    };
  }

  async createCollection(
    userId: string,
    body: {
      name: string; type: string; criteria?: any;
      display_order?: number; image_url?: string; product_ids?: string[];
    },
  ) {
    const storeId = await this.getStoreId(userId);

    if (!body.name || !body.type) throw new BadRequestException('name and type are required');
    if (!['manual', 'auto'].includes(body.type)) {
      throw new BadRequestException('type must be manual or auto');
    }
    if (body.type === 'auto' && (!body.criteria || !Array.isArray(body.criteria.filters) || body.criteria.filters.length === 0)) {
      throw new BadRequestException('criteria with at least one filter is required for auto collections');
    }

    let resolvedOrder = body.display_order !== undefined ? Number(body.display_order) : null;
    if (resolvedOrder === null) {
      const count = await this.prisma.collection.count({ where: { storeId } });
      resolvedOrder = count;
    }

    const collection = await this.prisma.collection.create({
      data: {
        storeId,
        name: body.name,
        type: body.type.toUpperCase() as 'MANUAL' | 'AUTO',
        criteria: body.type === 'auto' ? body.criteria : undefined,
        displayOrder: resolvedOrder,
        imageUrl: body.image_url || null,
      },
    });

    if (body.type === 'manual' && Array.isArray(body.product_ids) && body.product_ids.length > 0) {
      await this.prisma.collectionProduct.createMany({
        data: body.product_ids.map((productId: string, idx: number) => ({
          collectionId: collection.id,
          productId,
          position: idx,
        })),
        skipDuplicates: true,
      });
    }

    return { collection: this.formatCollection(collection) };
  }

  async getCollection(userId: string, collectionId: string) {
    const storeId = await this.getStoreId(userId);

    const collection = await this.prisma.collection.findFirst({ where: { id: collectionId, storeId } });
    if (!collection) throw new NotFoundException('Collection not found');

    let products: any[] = [];
    if (collection.type === 'MANUAL') {
      const cp = await this.prisma.collectionProduct.findMany({
        where: { collectionId: collection.id },
        orderBy: { position: 'asc' },
        include: { product: true },
      });
      products = cp.map(({ product }) => this.formatProduct(product));
    } else {
      const ps = await this.prisma.product.findMany({
        where: buildCriteriaWhere(collection.criteria, storeId),
        orderBy: { createdAt: 'desc' },
      });
      products = ps.map((p) => this.formatProduct(p));
    }

    return { collection: { ...this.formatCollection(collection), products } };
  }

  async updateCollection(
    userId: string,
    collectionId: string,
    body: { name?: string; criteria?: any; is_active?: any; display_order?: any; image_url?: string },
  ) {
    const storeId = await this.getStoreId(userId);

    const existing = await this.prisma.collection.findFirst({ where: { id: collectionId, storeId } });
    if (!existing) throw new NotFoundException('Collection not found');

    const collection = await this.prisma.collection.update({
      where: { id: collectionId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.criteria !== undefined && { criteria: body.criteria }),
        ...(body.is_active !== undefined && { isActive: body.is_active === true || body.is_active === 'true' }),
        ...(body.display_order !== undefined && { displayOrder: Number(body.display_order) }),
        ...(body.image_url !== undefined && { imageUrl: body.image_url || null }),
      },
    });

    return { collection: this.formatCollection(collection) };
  }

  async deleteCollection(userId: string, collectionId: string) {
    const storeId = await this.getStoreId(userId);

    const existing = await this.prisma.collection.findFirst({ where: { id: collectionId, storeId } });
    if (!existing) throw new NotFoundException('Collection not found');

    await this.prisma.collection.delete({ where: { id: collectionId } });
    return { message: 'Collection deleted' };
  }

  async reorderCollections(userId: string, collection_ids: string[]) {
    if (!Array.isArray(collection_ids)) throw new BadRequestException('collection_ids array is required');

    const storeId = await this.getStoreId(userId);

    await Promise.all(
      collection_ids.map((id: string, idx: number) =>
        this.prisma.collection.updateMany({
          where: { id, storeId },
          data: { displayOrder: idx },
        }),
      ),
    );

    return { message: 'Collections reordered' };
  }

  async addProducts(userId: string, collectionId: string, product_ids: string[]) {
    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      throw new BadRequestException('product_ids array is required');
    }

    const storeId = await this.getStoreId(userId);

    const collection = await this.prisma.collection.findFirst({ where: { id: collectionId, storeId } });
    if (!collection) throw new NotFoundException('Collection not found');
    if (collection.type !== 'MANUAL') {
      throw new BadRequestException('Only manual collections support product management');
    }

    const maxPos = await this.prisma.collectionProduct.aggregate({
      where: { collectionId: collection.id },
      _max: { position: true },
    });
    const startPos = (maxPos._max.position ?? -1) + 1;

    await this.prisma.collectionProduct.createMany({
      data: product_ids.map((productId: string, idx: number) => ({
        collectionId: collection.id,
        productId,
        position: startPos + idx,
      })),
      skipDuplicates: true,
    });

    return { message: 'Products added to collection' };
  }

  async removeProduct(userId: string, collectionId: string, productId: string) {
    const storeId = await this.getStoreId(userId);

    const collection = await this.prisma.collection.findFirst({ where: { id: collectionId, storeId } });
    if (!collection) throw new NotFoundException('Collection not found');

    await this.prisma.collectionProduct.deleteMany({
      where: { collectionId: collection.id, productId },
    });

    return { message: 'Product removed from collection' };
  }

  async reorderProducts(userId: string, collectionId: string, product_ids: string[]) {
    if (!Array.isArray(product_ids)) throw new BadRequestException('product_ids array is required');

    const storeId = await this.getStoreId(userId);

    const collection = await this.prisma.collection.findFirst({ where: { id: collectionId, storeId } });
    if (!collection) throw new NotFoundException('Collection not found');

    await Promise.all(
      product_ids.map((productId: string, idx: number) =>
        this.prisma.collectionProduct.update({
          where: { collectionId_productId: { collectionId: collection.id, productId } },
          data: { position: idx },
        }),
      ),
    );

    return { message: 'Products reordered' };
  }
}
