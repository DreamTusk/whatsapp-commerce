import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateToken() {
  const newToken = 'EAAMS88jfbKUBREr39ZAFYuICrJrnYUr9mvmwC6xBHepTZBO7jlO7LL4knJKX1WLxgifp0D3P6hQiOVgtOMu8ccohwu542gDg5DO6Aink7iFhFvNT2QOi1TIjy83HlCag1a5sTIyJI8GoHo2Y13oNzFfIjrSavP3VrFDZAZAFi0GQwBxmRi2sifQ122P4x475QLUSZC4Tb93h5HGaZAN9QNtZBC3q2Y5VpEsI1NgPCzxuzW7tzs9IXClhg1fcX7vZBlZAZCTuff3FUHLuYQ42F3uj4nYSXc';

  const updated = await prisma.store.updateMany({
    data: {
      whatsappAccessToken: newToken,
    },
  });

  console.log(`✅ Updated ${updated.count} store(s) with new access token`);
  console.log('New token:', newToken);
}

updateToken()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
