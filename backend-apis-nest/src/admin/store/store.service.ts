import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../shared/email.service';
import { buildCriteriaWhere } from '../../utils/collection-criteria';

@Injectable()
export class StoreService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  private formatStore(store: {
    id: string; name: string; phone: string; domain: string | null;
    catalogId: string | null; address: string | null; logo: string | null;
    minOrderAmount: number; deliveryRadius: number | null; isActive: boolean;
    isPickupEnabled: boolean; isHomeDeliveryEnabled: boolean;
    whatsappPhoneNumberId: string | null; whatsappBusinessAccountId: string | null;
    whatsappAccessToken: string | null; createdAt: Date; updatedAt: Date;
  }) {
    return {
      id: store.id,
      name: store.name,
      phone: store.phone,
      domain: store.domain,
      catalog_id: store.catalogId,
      address: store.address,
      logo: store.logo,
      min_order_amount: store.minOrderAmount,
      delivery_radius: store.deliveryRadius,
      is_active: store.isActive,
      is_pickup_enabled: store.isPickupEnabled,
      is_home_delivery_enabled: store.isHomeDeliveryEnabled,
      whatsapp_phone_number_id: store.whatsappPhoneNumberId,
      whatsapp_business_account_id: store.whatsappBusinessAccountId,
      whatsapp_access_token: store.whatsappAccessToken,
      created_at: store.createdAt,
      updated_at: store.updatedAt,
    };
  }

  private formatProductPublic(p: any) {
    const media = (p.ProductMedia ?? []);
    const primary = media.find((pm: any) => pm.isPrimary) ?? media[0] ?? null;
    return {
      id: p.id,
      name: p.name,
      image_url: primary?.Media?.url ?? null,
      selling_price: p.sellingPrice,
      original_price: p.originalPrice,
      unit: p.unit,
      in_stock: p.inStock,
      category_id: p.categoryId,
    };
  }

  private readonly productMediaInclude = {
    ProductMedia: {
      orderBy: { sortOrder: 'asc' as const },
      include: { Media: { select: { url: true } } },
    },
  };

  async getStoreInfo(domain: string) {
    if (!domain) throw new BadRequestException('Missing x-store-domain header');

    const store = await this.prisma.store.findUnique({ where: { domain } });
    if (!store) throw new NotFoundException('Store not found');

    const now = new Date();

    const [rawCollections, rawBanners] = await Promise.all([
      this.prisma.collection.findMany({
        where: { storeId: store.id, isActive: true },
        orderBy: { displayOrder: 'asc' },
      }),
      this.prisma.banner.findMany({
        where: {
          storeId: store.id,
          isActive: true,
          AND: [
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          ],
        },
        orderBy: { displayOrder: 'asc' },
      }),
    ]);

    const collections = await Promise.all(
      rawCollections.map(async (c) => {
        let products: any[] = [];
        if (c.type === 'MANUAL') {
          const cp = await this.prisma.collectionProduct.findMany({
            where: { collectionId: c.id },
            orderBy: { position: 'asc' },
            include: { Product: { include: this.productMediaInclude } },
          });
          products = cp.map(({ Product }) => this.formatProductPublic(Product));
        } else {
          const ps = await this.prisma.product.findMany({
            where: buildCriteriaWhere(c.criteria, store.id),
            orderBy: { createdAt: 'desc' },
            include: this.productMediaInclude,
          });
          products = ps.map((p) => this.formatProductPublic(p));
        }
        return {
          id: c.id,
          name: c.name,
          type: c.type.toLowerCase(),
          image_url: c.imageUrl,
          products,
        };
      }),
    );

    const banners = rawBanners.map((b) => ({
      id: b.id,
      name: b.name,
      type: b.type.toLowerCase(),
      image_url: b.imageUrl,
      product_id: b.productId,
      collection_id: b.collectionId,
      category_id: b.categoryId,
      url: b.url,
    }));

    return {
      store: {
        id: store.id,
        name: store.name,
        phone: store.phone,
        domain: store.domain,
        logo: store.logo,
        address: store.address,
        min_order_amount: store.minOrderAmount,
        delivery_radius: store.deliveryRadius,
        is_active: store.isActive,
      },
      banners,
      collections,
    };
  }

  async createStore(
    userId: string,
    body: {
      name: string; phone: string; domain: string; address?: string;
      min_order_amount?: string; delivery_radius?: string;
      whatsapp_phone_number_id?: string; whatsapp_business_account_id?: string;
      whatsapp_access_token?: string; logo_media_id?: string;
    },
  ) {
    const existingUserStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (existingUserStore) throw new ConflictException('You already have a store');

    const { name, phone, domain } = body;
    if (!name || !phone || !domain) {
      throw new BadRequestException('name, phone and domain are required');
    }

    const phoneExists = await this.prisma.store.findUnique({ where: { phone } });
    if (phoneExists) throw new ConflictException('Phone number already in use');

    const domainExists = await this.prisma.store.findUnique({ where: { domain } });
    if (domainExists) throw new ConflictException('Domain already in use');

    let logoUrl: string | null = null;
    if (body.logo_media_id) {
      const media = await this.prisma.media.findFirst({ where: { id: body.logo_media_id } });
      if (media?.url) logoUrl = media.url;
    }

    const store = await this.prisma.store.create({
      data: {
        name,
        phone,
        domain,
        address: body.address || null,
        logo: logoUrl,
        minOrderAmount: body.min_order_amount ? parseFloat(body.min_order_amount) : 0,
        deliveryRadius: body.delivery_radius ? parseFloat(body.delivery_radius) : null,
        whatsappPhoneNumberId: body.whatsapp_phone_number_id || null,
        whatsappBusinessAccountId: body.whatsapp_business_account_id || null,
        whatsappAccessToken: body.whatsapp_access_token || null,
      },
    });

    await this.prisma.userStore.create({
      data: { userId, storeId: store.id, role: 'OWNER' },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.emailService.sendSimpleEmail(
      user!.email,
      'Store Created Successfully',
      `Hi ${user!.name},\n\nYour store "${store.name}" has been created successfully.\n\nYou can now start adding products and categories.`,
    );

    return { store: this.formatStore(store) };
  }

  async getStore(userId: string) {
    const userStore = await this.prisma.userStore.findFirst({
      where: { userId },
      include: { Store: true },
    });
    if (!userStore) throw new NotFoundException('No store found');

    return { store: this.formatStore(userStore.Store) };
  }

  async updateStore(
    userId: string,
    body: {
      name?: string; phone?: string; domain?: string; address?: string;
      min_order_amount?: string; delivery_radius?: string; is_active?: string;
      is_pickup_enabled?: string; is_home_delivery_enabled?: string;
      whatsapp_phone_number_id?: string; whatsapp_business_account_id?: string;
      whatsapp_access_token?: string; logo_media_id?: string;
    },
  ) {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');

    let logoUrl: string | undefined = undefined;
    if (body.logo_media_id) {
      const media = await this.prisma.media.findFirst({ where: { id: body.logo_media_id } });
      if (media?.url) logoUrl = media.url;
    }

    const store = await this.prisma.store.update({
      where: { id: userStore.storeId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.phone && { phone: body.phone }),
        ...(body.domain !== undefined && { domain: body.domain }),
        ...(body.address !== undefined && { address: body.address }),
        ...(logoUrl !== undefined && { logo: logoUrl }),
        ...(body.min_order_amount !== undefined && { minOrderAmount: parseFloat(body.min_order_amount) }),
        ...(body.delivery_radius !== undefined && { deliveryRadius: parseFloat(body.delivery_radius) }),
        ...(body.is_active !== undefined && { isActive: body.is_active === 'true' }),
        ...(body.is_pickup_enabled !== undefined && { isPickupEnabled: body.is_pickup_enabled === 'true' }),
        ...(body.is_home_delivery_enabled !== undefined && { isHomeDeliveryEnabled: body.is_home_delivery_enabled === 'true' }),
        ...(body.whatsapp_phone_number_id !== undefined && { whatsappPhoneNumberId: body.whatsapp_phone_number_id }),
        ...(body.whatsapp_business_account_id !== undefined && { whatsappBusinessAccountId: body.whatsapp_business_account_id }),
        ...(body.whatsapp_access_token !== undefined && { whatsappAccessToken: body.whatsapp_access_token }),
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.emailService.sendSimpleEmail(
      user!.email,
      'Store Updated',
      `Hi ${user!.name},\n\nYour store "${store.name}" details have been updated successfully.`,
    );

    return { store: this.formatStore(store) };
  }

  async deleteStore(userId: string) {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const store = await this.prisma.store.findUnique({ where: { id: userStore.storeId } });

    await this.prisma.userStore.deleteMany({ where: { storeId: userStore.storeId } });
    await this.prisma.store.delete({ where: { id: userStore.storeId } });

    await this.emailService.sendSimpleEmail(
      user!.email,
      'Store Deleted',
      `Hi ${user!.name},\n\nYour store "${store!.name}" has been deleted successfully.`,
    );

    return { message: 'Store deleted successfully' };
  }
}
