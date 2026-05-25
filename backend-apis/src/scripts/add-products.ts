import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const STORE_ID = 'cmpl4ih050005vwgynrztujll';

async function main(): Promise<void> {
  console.log('Adding categories, brands and products to store:', STORE_ID);

  // Brands
  const brands = await Promise.all([
    prisma.brand.upsert({ where: { name_storeId: { name: 'Amul', storeId: STORE_ID } }, update: {}, create: { name: 'Amul', storeId: STORE_ID } }),
    prisma.brand.upsert({ where: { name_storeId: { name: 'Nestlé', storeId: STORE_ID } }, update: {}, create: { name: 'Nestlé', storeId: STORE_ID } }),
    prisma.brand.upsert({ where: { name_storeId: { name: 'Britannia', storeId: STORE_ID } }, update: {}, create: { name: 'Britannia', storeId: STORE_ID } }),
    prisma.brand.upsert({ where: { name_storeId: { name: 'Tata', storeId: STORE_ID } }, update: {}, create: { name: 'Tata', storeId: STORE_ID } }),
    prisma.brand.upsert({ where: { name_storeId: { name: "Haldiram's", storeId: STORE_ID } }, update: {}, create: { name: "Haldiram's", storeId: STORE_ID } }),
    prisma.brand.upsert({ where: { name_storeId: { name: 'MTR', storeId: STORE_ID } }, update: {}, create: { name: 'MTR', storeId: STORE_ID } }),
    prisma.brand.upsert({ where: { name_storeId: { name: 'Dettol', storeId: STORE_ID } }, update: {}, create: { name: 'Dettol', storeId: STORE_ID } }),
    prisma.brand.upsert({ where: { name_storeId: { name: 'Colgate', storeId: STORE_ID } }, update: {}, create: { name: 'Colgate', storeId: STORE_ID } }),
    prisma.brand.upsert({ where: { name_storeId: { name: 'Surf Excel', storeId: STORE_ID } }, update: {}, create: { name: 'Surf Excel', storeId: STORE_ID } }),
    prisma.brand.upsert({ where: { name_storeId: { name: 'Parle', storeId: STORE_ID } }, update: {}, create: { name: 'Parle', storeId: STORE_ID } }),
  ]);

  const [amul, nestle, britannia, tata, haldirams, mtr, dettol, colgate, surfExcel, parle] = brands;
  console.log('Brands done:', brands.length);

  // Categories
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Grains & Staples', storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Bakery', storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Cooking Essentials', storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Cleaning Supplies', storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Frozen & Ready to Eat', storeId: STORE_ID } }),
  ]);

  const [grains, bakery, cooking, cleaning, frozen] = categories;
  console.log('Categories done:', categories.length);

  // Products
  await Promise.all([
    // Grains & Staples
    prisma.product.create({ data: { name: 'Basmati Rice', description: 'Premium long grain basmati rice', sellingPrice: 120, originalPrice: 140, unit: '1kg', brandId: tata.id, categoryId: grains.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Toor Dal', description: 'Split pigeon peas', sellingPrice: 90, unit: '500g', categoryId: grains.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Wheat Flour (Atta)', description: 'Whole wheat flour', sellingPrice: 55, originalPrice: 65, unit: '1kg', brandId: tata.id, categoryId: grains.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Moong Dal', description: 'Split green gram', sellingPrice: 85, unit: '500g', categoryId: grains.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Chana Dal', description: 'Split chickpeas', sellingPrice: 75, unit: '500g', categoryId: grains.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Poha', description: 'Flattened rice', sellingPrice: 45, unit: '500g', categoryId: grains.id, storeId: STORE_ID } }),

    // Bakery
    prisma.product.create({ data: { name: 'White Bread', description: 'Soft sandwich bread', sellingPrice: 35, originalPrice: 40, unit: '400g', brandId: britannia.id, categoryId: bakery.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Brown Bread', description: 'Whole wheat bread', sellingPrice: 45, unit: '400g', brandId: britannia.id, categoryId: bakery.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Marie Biscuits', description: 'Light crispy biscuits', sellingPrice: 25, unit: '200g', brandId: britannia.id, categoryId: bakery.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Good Day Biscuits', description: 'Butter cookies', sellingPrice: 30, originalPrice: 35, unit: '200g', brandId: britannia.id, categoryId: bakery.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Glucose Biscuits', description: 'Energy biscuits', sellingPrice: 10, unit: '100g', brandId: parle.id, categoryId: bakery.id, storeId: STORE_ID } }),

    // Cooking Essentials
    prisma.product.create({ data: { name: 'Sunflower Oil', description: 'Refined sunflower oil', sellingPrice: 130, originalPrice: 150, unit: '1L', categoryId: cooking.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Mustard Seeds', description: 'Black mustard seeds', sellingPrice: 30, unit: '100g', categoryId: cooking.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Turmeric Powder', description: 'Pure turmeric powder', sellingPrice: 40, unit: '100g', brandId: mtr.id, categoryId: cooking.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Red Chilli Powder', description: 'Hot red chilli powder', sellingPrice: 45, originalPrice: 55, unit: '100g', brandId: mtr.id, categoryId: cooking.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Garam Masala', description: 'Aromatic spice blend', sellingPrice: 55, unit: '50g', brandId: mtr.id, categoryId: cooking.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Salt', description: 'Iodised table salt', sellingPrice: 20, unit: '1kg', brandId: tata.id, categoryId: cooking.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Sugar', description: 'Refined white sugar', sellingPrice: 45, unit: '1kg', categoryId: cooking.id, storeId: STORE_ID } }),

    // Cleaning Supplies
    prisma.product.create({ data: { name: 'Washing Powder', description: 'Laundry detergent powder', sellingPrice: 120, originalPrice: 140, unit: '1kg', brandId: surfExcel.id, categoryId: cleaning.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Dish Wash Bar', description: 'Grease cutting dish bar', sellingPrice: 20, unit: '200g', categoryId: cleaning.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Floor Cleaner', description: 'Pine fragrance floor cleaner', sellingPrice: 90, originalPrice: 110, unit: '500ml', categoryId: cleaning.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Hand Sanitizer', description: '70% alcohol sanitizer', sellingPrice: 60, unit: '200ml', brandId: dettol.id, categoryId: cleaning.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Toilet Cleaner', description: 'Harpic toilet cleaner', sellingPrice: 70, originalPrice: 85, unit: '500ml', categoryId: cleaning.id, storeId: STORE_ID } }),

    // Frozen & Ready to Eat
    prisma.product.create({ data: { name: 'Instant Noodles', description: 'Masala flavour instant noodles', sellingPrice: 14, unit: '70g', brandId: nestle.id, categoryId: frozen.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Upma Mix', description: 'Ready to cook upma', sellingPrice: 50, unit: '200g', brandId: mtr.id, categoryId: frozen.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Poha Mix', description: 'Ready to cook poha', sellingPrice: 45, unit: '200g', brandId: mtr.id, categoryId: frozen.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Bhujia', description: 'Crispy bikaneri bhujia', sellingPrice: 60, originalPrice: 70, unit: '200g', brandId: haldirams.id, categoryId: frozen.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Mixed Namkeen', description: 'Assorted snack mix', sellingPrice: 50, unit: '200g', brandId: haldirams.id, categoryId: frozen.id, storeId: STORE_ID } }),
  ]);

  console.log('Products done: 29');
  console.log('\nDone! Run the admin app to see the new data.');
}

main()
  .catch((e) => { console.error('Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
