import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../shared/storage.service';

const productInclude = {
  brand: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
};

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  private formatProduct(p: any) {
    const discount =
      p.originalPrice && p.originalPrice > p.sellingPrice
        ? Math.round((1 - p.sellingPrice / p.originalPrice) * 100)
        : null;

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      image_url: p.imageUrl,
      is_active: p.isActive,
      selling_price: p.sellingPrice,
      original_price: p.originalPrice,
      unit: p.unit,
      in_stock: p.inStock,
      discount_percent: discount,
      brand: p.brand ? { id: p.brand.id, name: p.brand.name } : null,
      category: { id: p.category.id, name: p.category.name },
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
      name: string; description?: string; category_id: string; brand_id?: string;
      selling_price: string; original_price?: string; unit?: string;
      is_active?: string; in_stock?: string; image_url?: string;
    },
    file?: Express.Multer.File,
  ) {
    const storeId = await this.getStoreId(userId);

    if (!body.name?.trim() || !body.category_id) {
      throw new BadRequestException('name and category_id are required');
    }
    if (body.selling_price === undefined || body.selling_price === '') {
      throw new BadRequestException('selling_price is required');
    }

    const category = await this.prisma.category.findFirst({ where: { id: body.category_id, storeId } });
    if (!category) throw new NotFoundException('Category not found');

    if (body.brand_id) {
      const brand = await this.prisma.brand.findFirst({ where: { id: body.brand_id, storeId } });
      if (!brand) throw new NotFoundException('Brand not found');
    }

    let imageUrl: string | null = null;
    if (file) {
      imageUrl = await this.storageService.uploadImage(file.buffer, 'products') || null;
    } else if (body.image_url?.trim()) {
      imageUrl = body.image_url.trim();
    }

    const product = await this.prisma.product.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        imageUrl,
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

    return { product: this.formatProduct(product) };
  }

  async updateProduct(
    userId: string,
    productId: string,
    body: {
      name?: string; description?: string; category_id?: string; brand_id?: string;
      selling_price?: string; original_price?: string; unit?: string;
      is_active?: string; in_stock?: string;
    },
    file?: Express.Multer.File,
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

    let imageUrl: string | undefined = undefined;
    if (file) {
      imageUrl = await this.storageService.uploadImage(file.buffer, 'products') || undefined;
    }

    const product = await this.prisma.product.update({
      where: { id: productId },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(body.is_active !== undefined && { isActive: body.is_active === 'true' }),
        ...(body.selling_price !== undefined && { sellingPrice: parseFloat(body.selling_price) }),
        ...(body.original_price !== undefined && { originalPrice: body.original_price ? parseFloat(body.original_price) : null }),
        ...(body.unit !== undefined && { unit: body.unit?.trim() || null }),
        ...(body.in_stock !== undefined && { inStock: body.in_stock === 'true' }),
        ...(body.brand_id !== undefined && { brandId: body.brand_id || null }),
        ...(body.category_id && { categoryId: body.category_id }),
      },
      include: productInclude,
    });

    return { product: this.formatProduct(product) };
  }

  async deleteProduct(userId: string, productId: string) {
    const storeId = await this.getStoreId(userId);

    const existing = await this.prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!existing) throw new NotFoundException('Product not found');

    await this.prisma.product.delete({ where: { id: productId } });
    return { message: 'Product deleted' };
  }
}
