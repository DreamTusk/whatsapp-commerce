import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.messageLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.conversationSession.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();

  // Create test store
  console.log('Creating test store...');
  const store = await prisma.store.create({
    data: {
      name: 'Fresh Mart',
      phone: '+919876543210',
      whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'test_phone_number_id',
      whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || 'test_business_account_id',
      whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || 'test_access_token',
      address: '123 Main Street, Chennai, Tamil Nadu 600001',
      minOrderAmount: 50,
      deliveryRadius: 5,
      isActive: true,
    },
  });

  // Create admin user
  console.log('Creating admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@freshmart.com',
      password: hashedPassword,
      role: 'admin',
      storeId: store.id,
    },
  });

  // Create categories
  console.log('Creating categories...');
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Fruits & Vegetables',
        nameLocal: 'பழங்கள் & காய்கறிகள்',
        sortOrder: 1,
        storeId: store.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Dairy & Eggs',
        nameLocal: 'பால் & முட்டை',
        sortOrder: 2,
        storeId: store.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Beverages',
        nameLocal: 'பானங்கள்',
        sortOrder: 3,
        storeId: store.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Snacks',
        nameLocal: 'தின்பண்டங்கள்',
        sortOrder: 4,
        storeId: store.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Personal Care',
        nameLocal: 'தனிப்பட்ட பராமரிப்பு',
        sortOrder: 5,
        storeId: store.id,
      },
    }),
  ]);

  // Create products
  console.log('Creating products...');

  // Fruits & Vegetables (4 products)
  await Promise.all([
    prisma.product.create({
      data: {
        name: 'Fresh Tomatoes',
        nameLocal: 'தக்காளி',
        description: 'Fresh red tomatoes',
        price: 40,
        unit: '1kg',
        categoryId: categories[0].id,
        storeId: store.id,
        sortOrder: 1,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Onions',
        nameLocal: 'வெங்காயம்',
        description: 'Fresh onions',
        price: 30,
        unit: '1kg',
        categoryId: categories[0].id,
        storeId: store.id,
        sortOrder: 2,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Bananas',
        nameLocal: 'வாழைப்பழம்',
        description: 'Fresh bananas',
        price: 50,
        unit: '1 dozen',
        categoryId: categories[0].id,
        storeId: store.id,
        sortOrder: 3,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Potatoes',
        nameLocal: 'உருளைக்கிழங்கு',
        description: 'Fresh potatoes',
        price: 35,
        unit: '1kg',
        categoryId: categories[0].id,
        storeId: store.id,
        sortOrder: 4,
      },
    }),
  ]);

  // Dairy & Eggs (4 products)
  await Promise.all([
    prisma.product.create({
      data: {
        name: 'Fresh Milk',
        nameLocal: 'பால்',
        description: 'Farm fresh milk',
        price: 60,
        unit: '1L',
        categoryId: categories[1].id,
        storeId: store.id,
        sortOrder: 1,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Eggs',
        nameLocal: 'முட்டை',
        description: 'Farm fresh eggs',
        price: 70,
        unit: '12 pieces',
        categoryId: categories[1].id,
        storeId: store.id,
        sortOrder: 2,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Curd',
        nameLocal: 'தயிர்',
        description: 'Fresh curd',
        price: 40,
        unit: '500g',
        categoryId: categories[1].id,
        storeId: store.id,
        sortOrder: 3,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Butter',
        nameLocal: 'வெண்ணெய்',
        description: 'Fresh butter',
        price: 55,
        unit: '100g',
        categoryId: categories[1].id,
        storeId: store.id,
        sortOrder: 4,
      },
    }),
  ]);

  // Beverages (4 products)
  await Promise.all([
    prisma.product.create({
      data: {
        name: 'Coca Cola',
        description: 'Soft drink',
        price: 40,
        unit: '750ml',
        categoryId: categories[2].id,
        storeId: store.id,
        sortOrder: 1,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Pepsi',
        description: 'Soft drink',
        price: 40,
        unit: '750ml',
        categoryId: categories[2].id,
        storeId: store.id,
        sortOrder: 2,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Mineral Water',
        description: 'Packaged drinking water',
        price: 20,
        unit: '1L',
        categoryId: categories[2].id,
        storeId: store.id,
        sortOrder: 3,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Mango Juice',
        description: 'Fresh mango juice',
        price: 50,
        unit: '500ml',
        categoryId: categories[2].id,
        storeId: store.id,
        sortOrder: 4,
      },
    }),
  ]);

  // Snacks (4 products)
  await Promise.all([
    prisma.product.create({
      data: {
        name: 'Lays Chips',
        description: 'Potato chips',
        price: 20,
        unit: '52g',
        categoryId: categories[3].id,
        storeId: store.id,
        sortOrder: 1,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Kurkure',
        description: 'Masala munch',
        price: 20,
        unit: '60g',
        categoryId: categories[3].id,
        storeId: store.id,
        sortOrder: 2,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Biscuits',
        description: 'Parle-G biscuits',
        price: 10,
        unit: '100g',
        categoryId: categories[3].id,
        storeId: store.id,
        sortOrder: 3,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Namkeen',
        description: 'Mixed namkeen',
        price: 30,
        unit: '200g',
        categoryId: categories[3].id,
        storeId: store.id,
        sortOrder: 4,
      },
    }),
  ]);

  // Personal Care (4 products)
  await Promise.all([
    prisma.product.create({
      data: {
        name: 'Soap',
        description: 'Bathing soap',
        price: 30,
        unit: '125g',
        categoryId: categories[4].id,
        storeId: store.id,
        sortOrder: 1,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Shampoo',
        description: 'Hair shampoo',
        price: 5,
        unit: '7ml sachet',
        categoryId: categories[4].id,
        storeId: store.id,
        sortOrder: 2,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Toothpaste',
        description: 'Dental care',
        price: 50,
        unit: '100g',
        categoryId: categories[4].id,
        storeId: store.id,
        sortOrder: 3,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Hand Wash',
        description: 'Liquid hand wash',
        price: 80,
        unit: '200ml',
        categoryId: categories[4].id,
        storeId: store.id,
        sortOrder: 4,
      },
    }),
  ]);

  console.log('✅ Seeding completed!');
  console.log('\nTest Store Details:');
  console.log('-------------------');
  console.log(`Store Name: ${store.name}`);
  console.log(`Store Phone: ${store.phone}`);
  console.log(`Categories: 5`);
  console.log(`Products: 20`);
  console.log('\nAdmin Login:');
  console.log('-------------------');
  console.log('Email: admin@freshmart.com');
  console.log('Password: admin123');
  console.log('\nTo test WhatsApp integration:');
  console.log('----------------------------');
  console.log('1. Set up your .env file with WhatsApp credentials');
  console.log('2. Run: npm run dev');
  console.log('3. Send "hi" to your WhatsApp business number');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
