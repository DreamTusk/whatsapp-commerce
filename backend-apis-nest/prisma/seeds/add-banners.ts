import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const STORE_ID = 'cmpqsvajf0005etuohdixtgli';

const p = (seed: string) => `https://picsum.photos/seed/${seed}/800/400`;

async function main(): Promise<void> {
  console.log('Adding banners to store:', STORE_ID);

  // Fetch existing collections and products for linking
  const collections = await prisma.collection.findMany({
    where: { storeId: STORE_ID },
    take: 3,
  });

  const products = await prisma.product.findMany({
    where: { storeId: STORE_ID },
    take: 2,
  });

  await prisma.banner.deleteMany({ where: { storeId: STORE_ID } });

  const banners = [
    {
      name: 'Summer Sale',
      type: 'COLLECTION' as const,
      imageUrl: p('summer-sale-banner'),
      displayOrder: 0,
      collectionId: collections[0]?.id ?? null,
    },
    {
      name: 'Fresh Arrivals',
      type: 'COLLECTION' as const,
      imageUrl: p('fresh-arrivals-banner'),
      displayOrder: 1,
      collectionId: collections[1]?.id ?? null,
    },
    {
      name: 'Deal of the Day',
      type: 'PRODUCT' as const,
      imageUrl: p('deal-of-day-banner'),
      displayOrder: 2,
      productId: products[0]?.id ?? null,
    },
    {
      name: 'Free Delivery Offer',
      type: 'URL' as const,
      imageUrl: p('free-delivery-banner'),
      displayOrder: 3,
      url: 'https://freshmart.localhost',
    },
    {
      name: 'Weekend Special',
      type: 'COLLECTION' as const,
      imageUrl: p('weekend-special-banner'),
      displayOrder: 4,
      collectionId: collections[2]?.id ?? null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // expires in 7 days
    },
  ];

  for (const banner of banners) {
    await prisma.banner.create({
      data: {
        storeId: STORE_ID,
        name: banner.name,
        type: banner.type,
        imageUrl: banner.imageUrl,
        isActive: true,
        displayOrder: banner.displayOrder,
        collectionId: (banner as any).collectionId ?? null,
        productId: (banner as any).productId ?? null,
        url: (banner as any).url ?? null,
        expiresAt: (banner as any).expiresAt ?? null,
      },
    });
  }

  console.log(`Banners done: ${banners.length}`);
  console.log('Visit GET /api/storefront/banners with x-store-domain: freshmart.localhost to verify.');
}

main()
  .catch((e) => { console.error('Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
