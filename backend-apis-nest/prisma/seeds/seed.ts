import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  await prisma.messageLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.conversationSession.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.userStore.deleteMany();
  await prisma.storeInvite.deleteMany();
  await prisma.otpVerification.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();

  console.log('Creating test store...');
  const store = await prisma.store.create({
    data: {
      name: 'Fresh Mart',
      phone: '+919876543210',
      domain: 'freshmart.localhost',
      whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'test_phone_number_id',
      whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || 'test_business_account_id',
      whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || 'test_access_token',
      address: '123 Main Street, Chennai, Tamil Nadu 600001',
      minOrderAmount: 50,
      deliveryRadius: 5,
      isActive: true,
    },
  });

  console.log('Creating admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@freshmart.com',
      password: hashedPassword,
      isVerified: true,
    },
  });

  await prisma.userStore.create({
    data: {
      userId: user.id,
      storeId: store.id,
      role: 'OWNER',
    },
  });

  console.log('Creating categories...');
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Fruits & Vegetables', storeId: store.id } }),
    prisma.category.create({ data: { name: 'Dairy & Eggs', storeId: store.id } }),
    prisma.category.create({ data: { name: 'Beverages', storeId: store.id } }),
    prisma.category.create({ data: { name: 'Snacks', storeId: store.id } }),
    prisma.category.create({ data: { name: 'Personal Care', storeId: store.id } }),
  ]);

  console.log('Creating products...');

  await Promise.all([
    prisma.product.create({ data: { name: 'Fresh Tomatoes', description: 'Fresh red tomatoes', sellingPrice: 40, unit: '1kg', categoryId: categories[0].id, storeId: store.id } }),
    prisma.product.create({ data: { name: 'Onions', description: 'Fresh onions', sellingPrice: 30, unit: '1kg', categoryId: categories[0].id, storeId: store.id } }),
    prisma.product.create({ data: { name: 'Bananas', description: 'Fresh bananas', sellingPrice: 50, unit: '1 dozen', categoryId: categories[0].id, storeId: store.id } }),
    prisma.product.create({ data: { name: 'Potatoes', description: 'Fresh potatoes', sellingPrice: 35, unit: '1kg', categoryId: categories[0].id, storeId: store.id } }),
    prisma.product.create({ data: { name: 'Fresh Milk', description: 'Farm fresh milk', sellingPrice: 60, unit: '1L', categoryId: categories[1].id, storeId: store.id } }),
    prisma.product.create({ data: { name: 'Eggs', description: 'Farm fresh eggs', sellingPrice: 70, unit: '12 pieces', categoryId: categories[1].id, storeId: store.id } }),
    prisma.product.create({ data: { name: 'Curd', description: 'Fresh curd', sellingPrice: 40, unit: '500g', categoryId: categories[1].id, storeId: store.id } }),
    prisma.product.create({ data: { name: 'Butter', description: 'Fresh butter', sellingPrice: 55, unit: '100g', categoryId: categories[1].id, storeId: store.id } }),
    prisma.product.create({ data: { name: 'Coca Cola', description: 'Soft drink', sellingPrice: 40, unit: '750ml', categoryId: categories[2].id, storeId: store.id } }),
    prisma.product.create({ data: { name: 'Pepsi', description: 'Soft drink', sellingPrice: 40, unit: '750ml', categoryId: categories[2].id, storeId: store.id } }),
    prisma.product.create({ data: { name: 'Mineral Water', description: 'Packaged drinking water', sellingPrice: 20, unit: '1L', categoryId: categories[2].id, storeId: store.id } }),
    prisma.product.create({ data: { name: 'Mango Juice', description: 'Fresh mango juice', sellingPrice: 50, unit: '500ml', categoryId: categories[2].id, storeId: store.id } }),
    prisma.product.create({ data: { name: 'Lays Chips', description: 'Potato chips', sellingPrice: 20, unit: '52g', categoryId: categories[3].id, storeId: store.id } }),
    prisma.product.create({ data: { name: 'Kurkure', description: 'Masala munch', sellingPrice: 20, unit: '60g', categoryId: categories[3].id, storeId: store.id } }),
    prisma.product.create({ data: { name: 'Biscuits', description: 'Parle-G biscuits', sellingPrice: 10, unit: '100g', categoryId: categories[3].id, storeId: store.id } }),
    prisma.product.create({ data: { name: 'Namkeen', description: 'Mixed namkeen', sellingPrice: 30, unit: '200g', categoryId: categories[3].id, storeId: store.id } }),
    prisma.product.create({ data: { name: 'Soap', description: 'Bathing soap', sellingPrice: 30, unit: '125g', categoryId: categories[4].id, storeId: store.id } }),
    prisma.product.create({ data: { name: 'Shampoo', description: 'Hair shampoo', sellingPrice: 5, unit: '7ml sachet', categoryId: categories[4].id, storeId: store.id } }),
    prisma.product.create({ data: { name: 'Toothpaste', description: 'Dental care', sellingPrice: 50, unit: '100g', categoryId: categories[4].id, storeId: store.id } }),
    prisma.product.create({ data: { name: 'Hand Wash', description: 'Liquid hand wash', sellingPrice: 80, unit: '200ml', categoryId: categories[4].id, storeId: store.id } }),
  ]);

  console.log('Creating Dream Cafe store...');
  const cafe = await prisma.store.create({
    data: {
      name: 'Dream Cafe',
      phone: '+919876543211',
      domain: 'dreamcafe.localhost',
      address: '45 Anna Nagar, Chennai, Tamil Nadu 600040',
      minOrderAmount: 100,
      deliveryRadius: 3,
      isActive: true,
    },
  });

  const cafeUser = await prisma.user.create({
    data: {
      name: 'Cafe Admin',
      email: 'admin@dreamcafe.com',
      password: hashedPassword,
      isVerified: true,
    },
  });

  await prisma.userStore.create({
    data: { userId: cafeUser.id, storeId: cafe.id, role: 'OWNER' },
  });

  const cafeCategories = await Promise.all([
    prisma.category.create({ data: { name: 'Hot Drinks', storeId: cafe.id } }),
    prisma.category.create({ data: { name: 'Cold Drinks', storeId: cafe.id } }),
    prisma.category.create({ data: { name: 'Bakery', storeId: cafe.id } }),
    prisma.category.create({ data: { name: 'Snacks', storeId: cafe.id } }),
  ]);

  await Promise.all([
    prisma.product.create({ data: { name: 'Espresso', description: 'Strong shot of coffee', sellingPrice: 80, unit: '1 cup', categoryId: cafeCategories[0].id, storeId: cafe.id } }),
    prisma.product.create({ data: { name: 'Cappuccino', description: 'Espresso with steamed milk foam', sellingPrice: 120, unit: '1 cup', categoryId: cafeCategories[0].id, storeId: cafe.id } }),
    prisma.product.create({ data: { name: 'Latte', description: 'Espresso with steamed milk', sellingPrice: 130, unit: '1 cup', categoryId: cafeCategories[0].id, storeId: cafe.id } }),
    prisma.product.create({ data: { name: 'Masala Chai', description: 'Spiced Indian tea', sellingPrice: 60, unit: '1 cup', categoryId: cafeCategories[0].id, storeId: cafe.id } }),
    prisma.product.create({ data: { name: 'Cold Coffee', description: 'Chilled blended coffee', sellingPrice: 150, unit: '1 glass', categoryId: cafeCategories[1].id, storeId: cafe.id } }),
    prisma.product.create({ data: { name: 'Iced Latte', description: 'Espresso over ice with milk', sellingPrice: 160, unit: '1 glass', categoryId: cafeCategories[1].id, storeId: cafe.id } }),
    prisma.product.create({ data: { name: 'Mango Smoothie', description: 'Fresh mango blended smooth', sellingPrice: 140, unit: '1 glass', categoryId: cafeCategories[1].id, storeId: cafe.id } }),
    prisma.product.create({ data: { name: 'Lemonade', description: 'Fresh squeezed lemonade', sellingPrice: 80, unit: '1 glass', categoryId: cafeCategories[1].id, storeId: cafe.id } }),
    prisma.product.create({ data: { name: 'Croissant', description: 'Buttery flaky croissant', sellingPrice: 90, unit: '1 piece', categoryId: cafeCategories[2].id, storeId: cafe.id } }),
    prisma.product.create({ data: { name: 'Blueberry Muffin', description: 'Fresh baked muffin', sellingPrice: 80, unit: '1 piece', categoryId: cafeCategories[2].id, storeId: cafe.id } }),
    prisma.product.create({ data: { name: 'Chocolate Cake', description: 'Rich chocolate slice', sellingPrice: 120, unit: '1 slice', categoryId: cafeCategories[2].id, storeId: cafe.id } }),
    prisma.product.create({ data: { name: 'Banana Bread', description: 'Homestyle banana bread', sellingPrice: 70, unit: '1 slice', categoryId: cafeCategories[2].id, storeId: cafe.id } }),
    prisma.product.create({ data: { name: 'Veg Sandwich', description: 'Grilled veggie sandwich', sellingPrice: 110, unit: '1 piece', categoryId: cafeCategories[3].id, storeId: cafe.id } }),
    prisma.product.create({ data: { name: 'Cheese Toast', description: 'Toasted bread with melted cheese', sellingPrice: 90, unit: '2 slices', categoryId: cafeCategories[3].id, storeId: cafe.id } }),
    prisma.product.create({ data: { name: 'French Fries', description: 'Crispy golden fries', sellingPrice: 100, unit: '1 plate', categoryId: cafeCategories[3].id, storeId: cafe.id } }),
    prisma.product.create({ data: { name: 'Nachos', description: 'Tortilla chips with dips', sellingPrice: 120, unit: '1 plate', categoryId: cafeCategories[3].id, storeId: cafe.id } }),
  ]);

  console.log('Creating sample customers...');
  await Promise.all([
    prisma.customer.create({
      data: {
        name: 'Ravi Kumar',
        phone: '+919876543210',
        storeId: store.id,
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Priya Sharma',
        phone: '+919876543211',
        storeId: store.id,
      },
    }),
  ]);

  console.log('Creating demo user...');
  const demoHashedPassword = await bcrypt.hash('demo1234', 10);
  const demoUser = await prisma.user.create({
    data: {
      name: 'Demo User',
      email: 'demo@freshmart.com',
      password: demoHashedPassword,
      isVerified: true,
    },
  });

  await prisma.userStore.create({
    data: { userId: demoUser.id, storeId: store.id, role: 'STAFF' },
  });

  console.log('Seeding completed!');
  console.log(`\nStore: ${store.name} | Domain: ${store.domain}`);
  console.log(`Store: ${cafe.name} | Domain: ${cafe.domain}`);
  console.log('Fresh Mart login — Email: admin@freshmart.com | Password: admin123');
  console.log('Dream Cafe login  — Email: admin@dreamcafe.com | Password: admin123');
  console.log('Demo user login   — Email: demo@freshmart.com  | Password: demo1234');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
