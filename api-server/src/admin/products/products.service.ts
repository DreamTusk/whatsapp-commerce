import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FileService } from '../../shared/file.service';
import { MediaEntity, BucketType } from '@prisma/client';

const productInclude = {
  Brand: { select: { id: true, name: true } },
  Category: { select: { id: true, name: true } },
  ProductMedia: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      Media: {
        select: { id: true, url: true, thumbnailUrl: true, originalName: true },
      },
    },
  },
};

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private fileService: FileService,
  ) {}

  private formatProduct(p: any) {
    const discount =
      p.originalPrice && p.originalPrice > p.sellingPrice
        ? Math.round((1 - p.sellingPrice / p.originalPrice) * 100)
        : null;

    const images = (p.ProductMedia ?? []).map((pm: any) => ({
      id: pm.id,
      media_id: pm.mediaId,
      url: pm.Media.url,
      thumbnail_url: pm.Media.thumbnailUrl,
      is_primary: pm.isPrimary,
      sort_order: pm.sortOrder,
    }));

    const primaryImage = images.find((i: any) => i.is_primary) ?? images[0] ?? null;

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      image_url: primaryImage?.url ?? null,
      images,
      is_active: p.isActive,
      selling_price: p.sellingPrice,
      original_price: p.originalPrice,
      unit: p.unit,
      in_stock: p.inStock,
      discount_percent: discount,
      brand: p.Brand ? { id: p.Brand.id, name: p.Brand.name } : null,
      category: { id: p.Category.id, name: p.Category.name },
      store_id: p.storeId,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    };
  }

  private async getStoreId(userId: string): Promise<string> {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');
    return userStore.storeId;
  }

  async listProducts(userId: string, category_id?: string, brand_id?: string) {
    const storeId = await this.getStoreId(userId);

    const products = await this.prisma.product.findMany({
      where: {
        storeId,
        ...(category_id ? { categoryId: category_id } : {}),
        ...(brand_id ? { brandId: brand_id } : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: productInclude,
    });

    return { products: products.map((p) => this.formatProduct(p)) };
  }

  async getProduct(userId: string, productId: string) {
    const storeId = await this.getStoreId(userId);

    const product = await this.prisma.product.findFirst({
      where: { id: productId, storeId },
      include: productInclude,
    });
    if (!product) throw new NotFoundException('Product not found');

    return { product: this.formatProduct(product) };
  }

  async createProduct(
    userId: string,
    body: {
      name: string;
      description?: string;
      category_id: string;
      brand_id?: string;
      selling_price: string;
      original_price?: string;
      unit?: string;
      is_active?: string;
      in_stock?: string;
      media_id?: string;
      media_ids?: string[];
    },
  ) {
    const storeId = await this.getStoreId(userId);

    if (!body.name?.trim() || !body.category_id) {
      throw new BadRequestException('name and category_id are required');
    }
    if (!body.selling_price) {
      throw new BadRequestException('selling_price is required');
    }

    const category = await this.prisma.category.findFirst({ where: { id: body.category_id, storeId } });
    if (!category) throw new NotFoundException('Category not found');

    if (body.brand_id) {
      const brand = await this.prisma.brand.findFirst({ where: { id: body.brand_id, storeId } });
      if (!brand) throw new NotFoundException('Brand not found');
    }

    if (body.media_id) {
      const media = await this.prisma.media.findFirst({ where: { id: body.media_id, storeId } });
      if (!media) throw new NotFoundException('Media not found');
    }

    const product = await this.prisma.product.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        isActive: body.is_active !== undefined ? body.is_active === 'true' : true,
        sellingPrice: parseFloat(body.selling_price),
        originalPrice: body.original_price ? parseFloat(body.original_price) : null,
        unit: body.unit?.trim() || null,
        inStock: body.in_stock !== undefined ? body.in_stock === 'true' : true,
        brandId: body.brand_id || null,
        categoryId: body.category_id,
        storeId,
      },
      include: productInclude,
    });

    const createMediaIds: string[] = Array.isArray(body.media_ids)
      ? body.media_ids
      : body.media_id ? [body.media_id] : [];

    if (createMediaIds.length > 0) {
      await this.prisma.$transaction([
        ...createMediaIds.map(mid =>
          this.prisma.media.update({ where: { id: mid }, data: { entityId: product.id } }),
        ),
        ...createMediaIds.map((mid, i) =>
          this.prisma.productMedia.create({
            data: { productId: product.id, mediaId: mid, isPrimary: i === 0, sortOrder: i },
          }),
        ),
      ]);
    }

    const updated = await this.prisma.product.findFirst({
      where: { id: product.id },
      include: productInclude,
    });

    return { product: this.formatProduct(updated) };
  }

  async updateProduct(
    userId: string,
    productId: string,
    body: {
      name?: string;
      description?: string;
      category_id?: string;
      brand_id?: string;
      selling_price?: string;
      original_price?: string;
      unit?: string;
      is_active?: string;
      in_stock?: string;
      media_id?: string;
      media_ids?: string[];
    },
  ) {
    const storeId = await this.getStoreId(userId);

    const existing = await this.prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!existing) throw new NotFoundException('Product not found');

    if (body.category_id) {
      const category = await this.prisma.category.findFirst({ where: { id: body.category_id, storeId } });
      if (!category) throw new NotFoundException('Category not found');
    }

    if (body.brand_id) {
      const brand = await this.prisma.brand.findFirst({ where: { id: body.brand_id, storeId } });
      if (!brand) throw new NotFoundException('Brand not found');
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.is_active !== undefined && { isActive: body.is_active === 'true' }),
        ...(body.selling_price !== undefined && { sellingPrice: parseFloat(body.selling_price) }),
        ...(body.original_price !== undefined && { originalPrice: body.original_price ? parseFloat(body.original_price) : null }),
        ...(body.unit !== undefined && { unit: body.unit?.trim() || null }),
        ...(body.in_stock !== undefined && { inStock: body.in_stock === 'true' }),
        ...(body.brand_id !== undefined && { brandId: body.brand_id || null }),
        ...(body.category_id && { categoryId: body.category_id }),
      },
    });

    const updateMediaIds: string[] = Array.isArray(body.media_ids)
      ? body.media_ids
      : body.media_id ? [body.media_id] : [];

    if (updateMediaIds.length > 0) {
      let hasPrimary = !!(await this.prisma.productMedia.findFirst({ where: { productId, isPrimary: true } }));
      let count = await this.prisma.productMedia.count({ where: { productId } });

      for (const mid of updateMediaIds) {
        const alreadyLinked = await this.prisma.productMedia.findFirst({ where: { productId, mediaId: mid } });
        if (alreadyLinked) continue;

        await this.prisma.$transaction([
          this.prisma.media.update({ where: { id: mid }, data: { entityId: productId } }),
          this.prisma.productMedia.create({
            data: { productId, mediaId: mid, isPrimary: !hasPrimary, sortOrder: count },
          }),
        ]);
        hasPrimary = true;
        count++;
      }
    }

    const updated = await this.prisma.product.findFirst({
      where: { id: productId },
      include: productInclude,
    });

    return { product: this.formatProduct(updated) };
  }

  async removeProductMedia(userId: string, productId: string, productMediaId: string) {
    const storeId = await this.getStoreId(userId);

    const pm = await this.prisma.productMedia.findFirst({
      where: { id: productMediaId, productId },
      include: { Media: true },
    });
    if (!pm) throw new NotFoundException('Product media not found');
    if (pm.Media.storeId !== storeId) throw new NotFoundException('Product media not found');

    await this.prisma.productMedia.delete({ where: { id: productMediaId } });
    await this.fileService.deleteMedia(pm.mediaId, storeId);

    if (pm.isPrimary) {
      const next = await this.prisma.productMedia.findFirst({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      });
      if (next) {
        await this.prisma.productMedia.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
      }
    }

    return { message: 'Image removed' };
  }

  async setPrimaryMedia(userId: string, productId: string, productMediaId: string) {
    const storeId = await this.getStoreId(userId);
    const existing = await this.prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!existing) throw new NotFoundException('Product not found');

    await this.prisma.productMedia.updateMany({
      where: { productId },
      data: { isPrimary: false },
    });
    await this.prisma.productMedia.update({
      where: { id: productMediaId },
      data: { isPrimary: true },
    });

    return { message: 'Primary image updated' };
  }

  async deleteProduct(userId: string, productId: string) {
    const storeId = await this.getStoreId(userId);

    const existing = await this.prisma.product.findFirst({
      where: { id: productId, storeId },
      include: { ProductMedia: true },
    });
    if (!existing) throw new NotFoundException('Product not found');

    if (existing.ProductMedia.length > 0) {
      const mediaIds = existing.ProductMedia.map((pm) => pm.mediaId);
      await this.fileService.deleteMany(mediaIds, storeId);
    }

    await this.prisma.product.delete({ where: { id: productId } });
    return { message: 'Product deleted' };
  }
}
