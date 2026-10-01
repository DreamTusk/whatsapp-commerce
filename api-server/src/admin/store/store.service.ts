import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../shared/email.service';
import { CloudflareClient, CloudflareCustomHostname } from '../../shared/cloudflare.client';
import { buildCriteriaWhere } from '../../utils/collection-criteria';
import { Plan, BillingCycle } from '@prisma/client';
import { planAmount, billingPeriod, getPlanUsage } from '../../utils/plan';

// Keep in sync with RESERVED_SUBDOMAINS in store-admin/app/create-store/page.tsx
const RESERVED_SUBDOMAINS = new Set([
  // environments
  'test', 'testing', 'tests', 'qa', 'uat', 'sit',
  'dev', 'develop', 'development', 'devel',
  'stage', 'staging', 'stg', 'preprod', 'pre-prod', 'prod', 'production', 'live',
  'demo', 'sandbox', 'beta', 'alpha', 'preview', 'canary', 'local', 'localhost',
  // infra
  'api', 'app', 'apps', 'admin', 'administrator', 'dashboard', 'console', 'panel', 'portal',
  'cdn', 'static', 'assets', 'media', 'img', 'images', 'files', 'upload', 'uploads', 'storage',
  'db', 'redis', 'cache', 'internal', 'intranet', 'vpn', 'proxy', 'gateway',
  'git', 'ci', 'jenkins', 'status', 'monitor', 'metrics', 'logs',
  // mail / dns
  'mail', 'email', 'smtp', 'imap', 'pop', 'pop3', 'mx', 'webmail',
  'ns', 'ns1', 'ns2', 'dns', 'ftp', 'sftp', 'autodiscover', 'autoconfig',
  // auth
  'auth', 'login', 'logout', 'signin', 'signup', 'register', 'sso', 'oauth',
  'account', 'accounts', 'user', 'users', 'password', 'reset', 'verify',
  // brand / business
  'www', 'help', 'support', 'docs', 'blog', 'about', 'contact', 'careers',
  'billing', 'pay', 'payment', 'payments', 'checkout', 'invoice', 'shop', 'store',
  'legal', 'terms', 'privacy', 'security', 'abuse', 'root', 'system', 'official',
]);

@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private cloudflareClient: CloudflareClient,
  ) {}

  private formatCustomization(c: {
    primaryColor: string; headerColor: string;
    instagramUrl: string | null; facebookUrl: string | null;
    whatsappNumber: string | null; whatsappMessage: string | null;
    youtubeUrl: string | null; xUrl: string | null;
    refundPolicy: string | null; privacyPolicy: string | null; terms: string | null;
  } | null) {
    if (!c) return { primary_color: '#6366f1', header_color: '#F4F4FE', instagram_url: null, facebook_url: null, whatsapp_number: null, whatsapp_message: null, youtube_url: null, x_url: null, refund_policy: null, privacy_policy: null, terms: null };
    return {
      primary_color: c.primaryColor,
      header_color: c.headerColor,
      instagram_url: c.instagramUrl,
      facebook_url: c.facebookUrl,
      whatsapp_number: c.whatsappNumber,
      whatsapp_message: c.whatsappMessage,
      youtube_url: c.youtubeUrl,
      x_url: c.xUrl,
      refund_policy: c.refundPolicy,
      privacy_policy: c.privacyPolicy,
      terms: c.terms,
    };
  }

  private formatStore(store: {
    id: string; name: string; phone: string; domain: string | null;
    customDomain: string | null; customDomainStatus: string | null;
    catalogId: string | null; address: string | null; supportEmail: string | null;
    logo: string | null;
    favicon: string | null;
    minOrderAmount: number; deliveryRadius: number | null; isActive: boolean;
    isPickupEnabled: boolean; isHomeDeliveryEnabled: boolean; plan: Plan;
    createdAt: Date; updatedAt: Date;
    StoreCustomization?: any;
  }) {
    return {
      id: store.id,
      name: store.name,
      phone: store.phone,
      domain: store.domain,
      custom_domain: store.customDomain,
      custom_domain_status: store.customDomainStatus,
      catalog_id: store.catalogId,
      address: store.address,
      support_email: store.supportEmail,
      logo: store.logo,
      favicon: store.favicon,
      min_order_amount: store.minOrderAmount,
      delivery_radius: store.deliveryRadius,
      is_active: store.isActive,
      is_pickup_enabled: store.isPickupEnabled,
      is_home_delivery_enabled: store.isHomeDeliveryEnabled,
      plan: store.plan,
      created_at: store.createdAt,
      updated_at: store.updatedAt,
      customization: this.formatCustomization(store.StoreCustomization ?? null),
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

  private assertDomainNotReserved(domain: string) {
    const match = /^([a-z0-9-]+)\.dreambizstore\.com$/i.exec(domain.trim());
    if (match && RESERVED_SUBDOMAINS.has(match[1].toLowerCase())) {
      throw new BadRequestException(`"${match[1]}" is a reserved subdomain and cannot be used`);
    }
  }

  async getStoreInfo(domain: string) {
    if (!domain) throw new BadRequestException('Missing x-store-domain header');

    // Matches either the platform subdomain or a connected custom domain —
    // both stay resolvable so bookmarks/links to the old subdomain never
    // break once a store connects its own domain.
    const store = await this.prisma.store.findFirst({
      where: { OR: [{ domain }, { customDomain: domain }] },
      include: { StoreCustomization: true },
    });
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
        favicon: store.favicon,
        address: store.address,
        min_order_amount: store.minOrderAmount,
        delivery_radius: store.deliveryRadius,
        is_active: store.isActive,
        customization: this.formatCustomization((store as any).StoreCustomization ?? null),
      },
      banners,
      collections,
    };
  }

  async createStore(
    userId: string,
    body: {
      name: string; phone: string; domain: string; address?: string;
      min_order_amount?: string; delivery_radius?: string; logo_media_id?: string;
      favicon_media_id?: string; plan?: string; is_paid?: boolean; billing_cycle?: string;
    },
  ) {
    const existingUserStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (existingUserStore) throw new ConflictException('You already have a store');

    const { name, phone, domain } = body;
    if (!name || !phone || !domain) {
      throw new BadRequestException('name, phone and domain are required');
    }

    if (body.plan && !Object.values(Plan).includes(body.plan as Plan)) {
      throw new BadRequestException(`plan must be one of: ${Object.values(Plan).join(', ')}`);
    }

    const plan = (body.plan as Plan) || 'BASIC';
    const isPaid = body.is_paid === true;
    if (isPaid) {
      if (plan === 'CUSTOM') {
        throw new BadRequestException('Custom plan pricing is not supported yet');
      }
      if (!body.billing_cycle || !Object.values(BillingCycle).includes(body.billing_cycle as BillingCycle)) {
        throw new BadRequestException(`billing_cycle must be one of: ${Object.values(BillingCycle).join(', ')}`);
      }
    }

    this.assertDomainNotReserved(domain);

    const phoneExists = await this.prisma.store.findUnique({ where: { phone } });
    if (phoneExists) throw new ConflictException('Phone number already in use');

    const domainExists = await this.prisma.store.findUnique({ where: { domain } });
    if (domainExists) throw new ConflictException('Domain already in use');

    let logoUrl: string | null = null;
    if (body.logo_media_id) {
      const media = await this.prisma.media.findFirst({ where: { id: body.logo_media_id } });
      if (media?.url) logoUrl = media.url;
    }

    let faviconUrl: string | null = null;
    if (body.favicon_media_id) {
      const media = await this.prisma.media.findFirst({ where: { id: body.favicon_media_id } });
      if (media?.url) faviconUrl = media.url;
    }

    const store = await this.prisma.store.create({
      data: {
        name,
        phone,
        domain,
        address: body.address || null,
        logo: logoUrl,
        favicon: faviconUrl,
        minOrderAmount: body.min_order_amount ? parseFloat(body.min_order_amount) : 0,
        deliveryRadius: body.delivery_radius ? parseFloat(body.delivery_radius) : null,
        plan,
        StoreCustomization: { create: {} },
      },
      include: { StoreCustomization: true },
    });

    if (isPaid) {
      const billingCycle = body.billing_cycle as BillingCycle;
      const { startDate, endDate } = billingPeriod(billingCycle);
      await this.prisma.storeSubscription.create({
        data: {
          storeId: store.id,
          plan,
          billingCycle,
          amount: planAmount(plan as 'BASIC' | 'PRO', billingCycle),
          startDate,
          endDate,
        },
      });
    }

    await this.prisma.userStore.create({
      data: { userId, storeId: store.id, role: 'OWNER' },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.emailService.sendStoreCreatedEmail(user!.email, user!.name, store.name);

    return { store: this.formatStore(store) };
  }

  async getStore(userId: string) {
    const userStore = await this.prisma.userStore.findFirst({
      where: { userId },
      include: { Store: { include: { StoreCustomization: true } } },
    });
    if (!userStore) throw new NotFoundException('No store found');

    return { store: this.formatStore(userStore.Store) };
  }

  async getPlanDetails(userId: string) {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');

    const store = await this.prisma.store.findUnique({ where: { id: userStore.storeId }, select: { plan: true } });
    const [usage, subscriptions] = await Promise.all([
      getPlanUsage(this.prisma, userStore.storeId, store!.plan),
      this.prisma.storeSubscription.findMany({
        where: { storeId: userStore.storeId },
        orderBy: { startDate: 'desc' },
      }),
    ]);

    return {
      plan: store!.plan,
      usage,
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        plan: s.plan,
        billing_cycle: s.billingCycle,
        amount: s.amount,
        start_date: s.startDate,
        end_date: s.endDate,
        created_at: s.createdAt,
      })),
    };
  }

  async getCustomization(userId: string) {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');

    const c = await this.prisma.storeCustomization.findUnique({ where: { storeId: userStore.storeId } });
    return { customization: this.formatCustomization(c ?? null) };
  }

  async updateCustomization(
    userId: string,
    body: {
      primary_color?: string; header_color?: string;
      instagram_url?: string; facebook_url?: string;
      whatsapp_number?: string; whatsapp_message?: string;
      youtube_url?: string; x_url?: string;
      refund_policy?: string; privacy_policy?: string; terms?: string;
    },
  ) {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');

    const c = await this.prisma.storeCustomization.upsert({
      where: { storeId: userStore.storeId },
      create: {
        storeId: userStore.storeId,
        ...(body.primary_color && { primaryColor: body.primary_color }),
        ...(body.header_color && { headerColor: body.header_color }),
        ...(body.instagram_url !== undefined && { instagramUrl: body.instagram_url || null }),
        ...(body.facebook_url !== undefined && { facebookUrl: body.facebook_url || null }),
        ...(body.whatsapp_number !== undefined && { whatsappNumber: body.whatsapp_number || null }),
        ...(body.whatsapp_message !== undefined && { whatsappMessage: body.whatsapp_message || null }),
        ...(body.youtube_url !== undefined && { youtubeUrl: body.youtube_url || null }),
        ...(body.x_url !== undefined && { xUrl: body.x_url || null }),
        ...(body.refund_policy !== undefined && { refundPolicy: body.refund_policy || null }),
        ...(body.privacy_policy !== undefined && { privacyPolicy: body.privacy_policy || null }),
        ...(body.terms !== undefined && { terms: body.terms || null }),
      },
      update: {
        ...(body.primary_color && { primaryColor: body.primary_color }),
        ...(body.header_color && { headerColor: body.header_color }),
        ...(body.instagram_url !== undefined && { instagramUrl: body.instagram_url || null }),
        ...(body.facebook_url !== undefined && { facebookUrl: body.facebook_url || null }),
        ...(body.whatsapp_number !== undefined && { whatsappNumber: body.whatsapp_number || null }),
        ...(body.whatsapp_message !== undefined && { whatsappMessage: body.whatsapp_message || null }),
        ...(body.youtube_url !== undefined && { youtubeUrl: body.youtube_url || null }),
        ...(body.x_url !== undefined && { xUrl: body.x_url || null }),
        ...(body.refund_policy !== undefined && { refundPolicy: body.refund_policy || null }),
        ...(body.privacy_policy !== undefined && { privacyPolicy: body.privacy_policy || null }),
        ...(body.terms !== undefined && { terms: body.terms || null }),
      },
    });

    return { customization: this.formatCustomization(c) };
  }

  async updateStore(
    userId: string,
    body: {
      name?: string; phone?: string; domain?: string; address?: string;
      support_email?: string;
      min_order_amount?: string; delivery_radius?: string; is_active?: string;
      is_pickup_enabled?: string; is_home_delivery_enabled?: string;
      logo_media_id?: string; favicon_media_id?: string;
    },
  ) {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');

    const existingStore = await this.prisma.store.findUnique({
      where: { id: userStore.storeId },
      select: { isActive: true },
    });

    if (body.domain !== undefined) this.assertDomainNotReserved(body.domain);

    if (body.support_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.support_email.trim())) {
      throw new BadRequestException('support_email must be a valid email address');
    }

    let logoUrl: string | undefined = undefined;
    if (body.logo_media_id) {
      const media = await this.prisma.media.findFirst({ where: { id: body.logo_media_id } });
      if (media?.url) logoUrl = media.url;
    }

    let faviconUrl: string | undefined = undefined;
    if (body.favicon_media_id) {
      const media = await this.prisma.media.findFirst({ where: { id: body.favicon_media_id } });
      if (media?.url) faviconUrl = media.url;
    }

    const store = await this.prisma.store.update({
      where: { id: userStore.storeId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.phone && { phone: body.phone }),
        ...(body.domain !== undefined && { domain: body.domain }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.support_email !== undefined && { supportEmail: body.support_email.trim() || null }),
        ...(logoUrl !== undefined && { logo: logoUrl }),
        ...(faviconUrl !== undefined && { favicon: faviconUrl }),
        ...(body.min_order_amount !== undefined && { minOrderAmount: parseFloat(body.min_order_amount) }),
        ...(body.delivery_radius !== undefined && { deliveryRadius: parseFloat(body.delivery_radius) }),
        ...(body.is_active !== undefined && { isActive: body.is_active === 'true' }),
        ...(body.is_pickup_enabled !== undefined && { isPickupEnabled: body.is_pickup_enabled === 'true' }),
        ...(body.is_home_delivery_enabled !== undefined && { isHomeDeliveryEnabled: body.is_home_delivery_enabled === 'true' }),
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const activeChanged =
      body.is_active !== undefined && (body.is_active === 'true') !== existingStore!.isActive;

    if (activeChanged && body.is_active === 'true') {
      await this.emailService.sendStoreActivatedEmail(user!.email, user!.name, store.name);
    } else if (activeChanged && body.is_active === 'false') {
      await this.emailService.sendStoreDeactivatedEmail(user!.email, user!.name, store.name);
    } else {
      await this.emailService.sendStoreUpdatedEmail(user!.email, user!.name, store.name);
    }

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

  // Custom domains only touch the real Cloudflare account, which has a
  // shared per-project domain cap (see custom-domain-architecture.md) — every
  // store on staging/dev pointed at that same account would burn through it
  // during testing, so the whole feature is production-only.
  private assertCustomDomainAvailable() {
    if (process.env.NODE_ENV !== 'production') {
      throw new ForbiddenException('Custom domains can only be managed in production');
    }
  }

  // A bare apex (just domain.tld) can't take a CNAME, so default it to www —
  // anything with an existing subdomain (e.g. shop.yourbrand.com) is kept
  // exactly as given.
  private normalizeCustomDomain(domain: string): string {
    const trimmed = domain.trim().toLowerCase();
    if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(trimmed)) {
      throw new BadRequestException('Enter a valid domain, e.g. yourbrand.com or shop.yourbrand.com');
    }
    return trimmed.split('.').length <= 2 ? `www.${trimmed}` : trimmed;
  }

  // Cloudflare tracks hostname verification and SSL issuance as two separate
  // statuses — a hostname can report "active" while its cert is still
  // issuing, which would mean serving broken HTTPS if we called that active.
  private resolveCustomDomainStatus(result: CloudflareCustomHostname): string {
    if (result.status === 'active' && result.ssl?.status === 'active') return 'active';
    if (result.status === 'active') return 'pending_ssl';
    return result.status;
  }

  async addCustomDomain(userId: string, body: { domain?: string }) {
    this.assertCustomDomainAvailable();
    if (!body.domain?.trim()) throw new BadRequestException('domain is required');
    const domain = this.normalizeCustomDomain(body.domain);

    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');

    const store = await this.prisma.store.findUnique({ where: { id: userStore.storeId } });
    if (store?.customDomain) {
      throw new ConflictException('This store already has a custom domain connected — remove it first');
    }

    const conflict = await this.prisma.store.findUnique({ where: { customDomain: domain } });
    if (conflict) throw new ConflictException('This domain is already connected to another store');

    const result = await this.cloudflareClient.addHostname(domain);

    const updated = await this.prisma.store.update({
      where: { id: userStore.storeId },
      data: {
        customDomain: domain,
        customDomainStatus: this.resolveCustomDomainStatus(result),
        cloudflareHostnameId: result.id,
      },
    });

    return {
      custom_domain: updated.customDomain,
      custom_domain_status: updated.customDomainStatus,
      ssl_status: result.ssl?.status ?? null,
      dns_target: process.env.CUSTOM_DOMAIN_CNAME_TARGET ?? '',
      verification: result.ownership_verification ?? null,
    };
  }

  async getCustomDomainStatus(userId: string) {
    this.assertCustomDomainAvailable();
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');

    const store = await this.prisma.store.findUnique({ where: { id: userStore.storeId } });
    if (!store?.customDomain || !store.cloudflareHostnameId) {
      throw new NotFoundException('No custom domain connected');
    }

    const result = await this.cloudflareClient.getHostnameStatus(store.cloudflareHostnameId);

    const updated = await this.prisma.store.update({
      where: { id: userStore.storeId },
      data: { customDomainStatus: this.resolveCustomDomainStatus(result) },
    });

    return {
      custom_domain: updated.customDomain,
      custom_domain_status: updated.customDomainStatus,
      ssl_status: result.ssl?.status ?? null,
      dns_target: process.env.CUSTOM_DOMAIN_CNAME_TARGET ?? '',
      verification: result.ownership_verification ?? null,
    };
  }

  async removeCustomDomain(userId: string) {
    this.assertCustomDomainAvailable();
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found');

    const store = await this.prisma.store.findUnique({ where: { id: userStore.storeId } });
    if (!store?.customDomain || !store.cloudflareHostnameId) {
      throw new NotFoundException('No custom domain connected');
    }

    try {
      await this.cloudflareClient.removeHostname(store.cloudflareHostnameId);
    } catch (err) {
      // Don't let an upstream failure (wrong zone after a domain migration,
      // the hostname already gone on Cloudflare's side, a token/permission
      // issue) permanently block the admin from resetting their own
      // connection state — our DB is the source of truth for "is a custom
      // domain connected" from the product's perspective, so still clear it
      // locally and just log the Cloudflare-side failure for visibility.
      this.logger.warn(
        `Failed to remove Cloudflare hostname ${store.cloudflareHostnameId}: ${err instanceof Error ? err.message : err}`,
      );
    }

    await this.prisma.store.update({
      where: { id: userStore.storeId },
      data: { customDomain: null, customDomainStatus: null, cloudflareHostnameId: null },
    });

    return { message: 'Custom domain removed' };
  }
}
