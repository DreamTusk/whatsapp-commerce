import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../shared/storage.service';
import { BannerType } from '@prisma/client';

@Injectable()
export class BannersService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  private async getStoreId(userId: string): Promise<string> {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');
    return userStore.storeId;
  }

  private computeStatus(banner: { isActive: boolean; expiresAt: Date | null }) {
    if (banner.expiresAt && banner.expiresAt < new Date()) return 'expired';
    if (!banner.isActive) return 'inactive';
    return 'active';
  }

  private formatBanner(b: any) {
    return {
      id: b.id,
      name: b.name,
      type: b.type.toLowerCase(),
      image_url: b.imageUrl,
      display_order: b.displayOrder,
      status: this.computeStatus(b),
      product_id: b.productId,
      collection_id: b.collectionId,
      url: b.url,
      starts_at: b.startsAt,
      expires_at: b.expiresAt,
      created_at: b.createdAt,
      updated_at: b.updatedAt,
    };
  }

  async listBanners(userId: string) {
    const storeId = await this.getStoreId(userId);
    const banners = await this.prisma.banner.findMany({
      where: { storeId },
      orderBy: { displayOrder: 'asc' },
    });
    return { banners: banners.map((b) => this.formatBanner(b)) };
  }

  async createBanner(
    userId: string,
    body: {
      name: string; type: string; display_order?: string;
      product_id?: string; collection_id?: string; url?: string;
      is_active?: string; starts_at?: string; expires_at?: string;
      image_url?: string;
    },
    file?: Express.Multer.File,
  ) {
    const storeId = await this.getStoreId(userId);

    if (!body.name?.trim()) throw new BadRequestException('name is required');
    if (!body.type) throw new BadRequestException('type is required');

    const type = body.type.toUpperCase() as BannerType;
    if (!['PRODUCT', 'COLLECTION', 'URL'].includes(type)) {
      throw new BadRequestException('type must be PRODUCT, COLLECTION or URL');
    }
    if (type === 'PRODUCT' && !body.product_id) throw new BadRequestException('product_id is required for PRODUCT type');
    if (type === 'COLLECTION' && !body.collection_id) throw new BadRequestException('collection_id is required for COLLECTION type');
    if (type === 'URL' && !body.url) throw new BadRequestException('url is required for URL type');

    let imageUrl: string | null = null;
    if (file) {
      imageUrl = await this.storageService.uploadImage(file.buffer, 'banners') || null;
    } else if (body.image_url?.trim()) {
      imageUrl = body.image_url.trim();
    }

    const count = await this.prisma.banner.count({ where: { storeId } });

    const banner = await this.prisma.banner.create({
      data: {
        storeId,
        name: body.name.trim(),
        type,
        imageUrl,
        isActive: body.is_active !== undefined ? body.is_active === 'true' : true,
        displayOrder: body.display_order !== undefined ? parseInt(body.display_order) : count,
        productId: body.product_id || null,
        collectionId: body.collection_id || null,
        url: body.url || null,
        startsAt: body.starts_at ? new Date(body.starts_at) : null,
        expiresAt: body.expires_at ? new Date(body.expires_at) : null,
      },
    });

    return { banner: this.formatBanner(banner) };
  }

  async updateBanner(
    userId: string,
    bannerId: string,
    body: {
      name?: string; display_order?: string;
      product_id?: string; collection_id?: string; url?: string;
      is_active?: string; starts_at?: string; expires_at?: string;
      image_url?: string;
    },
    file?: Express.Multer.File,
  ) {
    const storeId = await this.getStoreId(userId);

    const existing = await this.prisma.banner.findFirst({ where: { id: bannerId, storeId } });
    if (!existing) throw new NotFoundException('Banner not found');

    let imageUrl: string | undefined = undefined;
    if (file) {
      imageUrl = await this.storageService.uploadImage(file.buffer, 'banners') || undefined;
    } else if (body.image_url !== undefined) {
      imageUrl = body.image_url.trim() || undefined;
    }

    const banner = await this.prisma.banner.update({
      where: { id: bannerId },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(body.is_active !== undefined && { isActive: body.is_active === 'true' }),
        ...(body.display_order !== undefined && { displayOrder: parseInt(body.display_order) }),
        ...(body.product_id !== undefined && { productId: body.product_id || null }),
        ...(body.collection_id !== undefined && { collectionId: body.collection_id || null }),
        ...(body.url !== undefined && { url: body.url || null }),
        ...(body.starts_at !== undefined && { startsAt: body.starts_at ? new Date(body.starts_at) : null }),
        ...(body.expires_at !== undefined && { expiresAt: body.expires_at ? new Date(body.expires_at) : null }),
      },
    });

    return { banner: this.formatBanner(banner) };
  }

  async deleteBanner(userId: string, bannerId: string) {
    const storeId = await this.getStoreId(userId);
    const existing = await this.prisma.banner.findFirst({ where: { id: bannerId, storeId } });
    if (!existing) throw new NotFoundException('Banner not found');
    await this.prisma.banner.delete({ where: { id: bannerId } });
    return { message: 'Banner deleted' };
  }

  async reorderBanners(userId: string, banner_ids: string[]) {
    if (!Array.isArray(banner_ids)) throw new BadRequestException('banner_ids array is required');
    const storeId = await this.getStoreId(userId);
    await Promise.all(
      banner_ids.map((id, idx) =>
        this.prisma.banner.updateMany({ where: { id, storeId }, data: { displayOrder: idx } }),
      ),
    );
    return { message: 'Banners reordered' };
  }
}
