import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateCatalogId() {
  const catalogId = process.argv[2];

  if (!catalogId) {
    console.error('❌ Error: Catalog ID is required');
    console.log('\nUsage: node update-catalog-id.js YOUR_CATALOG_ID');
    console.log('\nExample: node update-catalog-id.js 1234567890123456');
    process.exit(1);
  }

  try {
    // Update the store with the catalog ID
    const updated = await prisma.store.updateMany({
      where: {
        whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      },
      data: {
        catalogId,
      },
    });

    if (updated.count === 0) {
      console.error('❌ No store found with that phone number ID');
      console.log('Run "npm run seed" first to create test store');
      process.exit(1);
    }

    console.log(`✅ Updated catalog ID to: ${catalogId}`);
    console.log(`   Stores updated: ${updated.count}`);
    console.log('\nNext steps:');
    console.log('1. Upload products to Meta Commerce Manager catalog');
    console.log('2. Restart your server: npm run dev');
    console.log('3. Send "hi" to your WhatsApp number to test');
  } catch (error) {
    console.error('❌ Error updating catalog ID:', error.message);
    process.exit(1);
  }
}

updateCatalogId()
  .finally(async () => {
    await prisma.$disconnect();
  });
