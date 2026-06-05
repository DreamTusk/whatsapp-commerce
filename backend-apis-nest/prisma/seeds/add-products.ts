import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const STORE_DOMAIN = 'freshmart.localhost';

async function main(): Promise<void> {
  // Resolve store by domain
  const store = await prisma.store.findUnique({ where: { domain: STORE_DOMAIN } });
  if (!store) {
    console.error(`Store with domain "${STORE_DOMAIN}" not found. Run seed.ts first.`);
    process.exit(1);
  }

  console.log(`Found store: ${store.name} (${store.id})`);
  const STORE_ID = store.id;

  // ── Clean existing data for this store ─────────────────────────────────────
  console.log('Removing existing products, categories and brands...');
  await prisma.collectionProduct.deleteMany({ where: { collection: { storeId: STORE_ID } } });
  await prisma.cartItem.deleteMany({ where: { storeId: STORE_ID } });
  await prisma.wishlistItem.deleteMany({ where: { storeId: STORE_ID } });
  await prisma.orderItem.deleteMany({ where: { order: { storeId: STORE_ID } } });
  await prisma.product.deleteMany({ where: { storeId: STORE_ID } });
  await prisma.category.deleteMany({ where: { storeId: STORE_ID } });
  await prisma.brand.deleteMany({ where: { storeId: STORE_ID } });
  console.log('Cleanup done.');

  // ── Brands ─────────────────────────────────────────────────────────────────
  console.log('Creating brands...');
  const brands = await Promise.all([
    prisma.brand.create({ data: { name: 'Amul',            storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Nestlé',          storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Britannia',       storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Tata',            storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: "Haldiram's",      storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'MTR',             storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Dettol',          storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Colgate',         storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Surf Excel',      storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Parle',           storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Mother Dairy',    storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Tropicana',       storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Dove',            storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Head & Shoulders',storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: "Kellogg's",       storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: "Lay's",           storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Dabur',           storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Real',            storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Sunfeast',        storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Lifebuoy',        storeId: STORE_ID } }),
  ]);

  const [amul, nestle, britannia, tata, haldirams, mtr, dettol, colgate, surfExcel, parle, motherDairy, tropicana, dove, headShoulders, kelloggs, lays, dabur, real, sunfeast, lifebuoy] = brands;
  console.log(`Brands done: ${brands.length}`);

  // ── Picsum helper ──────────────────────────────────────────────────────────
  const p = (seed: string) => `https://picsum.photos/seed/${seed}/400/400`;

  // ── Categories ─────────────────────────────────────────────────────────────
  console.log('Creating categories...');
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Fruits & Vegetables',   imageUrl: p('fresh-vegetables'),  storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Dairy & Eggs',          imageUrl: p('dairy-milk'),        storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Grains & Staples',      imageUrl: p('grains-staples'),    storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Bakery',                imageUrl: p('bakery-bread'),      storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Cooking Essentials',    imageUrl: p('cooking-spices'),    storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Beverages',             imageUrl: p('beverages-juice'),   storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Snacks & Munchies',     imageUrl: p('snacks-chips'),      storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Breakfast & Cereals',   imageUrl: p('breakfast-cereal'),  storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Personal Care',         imageUrl: p('personal-care'),     storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Cleaning Supplies',     imageUrl: p('cleaning-supplies'), storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Frozen & Ready to Eat', imageUrl: p('frozen-food'),       storeId: STORE_ID } }),
  ]);

  const [fruits, dairy, grains, bakery, cooking, beverages, snacks, breakfast, personalCare, cleaning, frozen] = categories;
  console.log(`Categories done: ${categories.length}`);

  // ── Product image map ──────────────────────────────────────────────────────
  const IMG = {
    tomato: p('fresh-tomatoes'), potato: p('potatoes'), onion: p('onions'),
    spinach: p('spinach-leaves'), banana: p('bananas'), apple: p('red-apples'),
    lemon: p('lemons'), carrot: p('carrots'),
    milk: p('milk-packet'), curd: p('curd-container'), paneer: p('paneer-block'),
    butter: p('butter-pack'), cheese: p('cheese-slice'), eggs: p('egg-tray'),
    iceCream: p('ice-cream-cup'),
    rice: p('basmati-rice'), lentils: p('toor-dal'), flour: p('wheat-flour'),
    poha: p('poha-rice'), quinoa: p('quinoa-grain'), oats: p('rolled-oats'),
    bread: p('white-bread'), brownBread: p('brown-bread'), biscuits: p('marie-biscuits'),
    cookies: p('good-day-cookies'), rusk: p('toast-rusk'), pav: p('dinner-rolls'),
    oil: p('sunflower-oil'), seeds: p('mustard-seeds'), turmeric: p('turmeric-powder'),
    chilli: p('red-chilli'), spices: p('garam-masala'), salt: p('table-salt'),
    sugar: p('white-sugar'), ghee: p('ghee-jar'), vinegar: p('vinegar-bottle'),
    juice: p('orange-juice'), tea: p('tea-packet'), coffee: p('coffee-jar'),
    water: p('mineral-water'), energy: p('energy-drink'), coconut: p('coconut-water'),
    chips: p('potato-chips'), namkeen: p('namkeen-mix'), chocolate: p('chocolate-bar'),
    popcorn: p('popcorn-packet'), granola: p('granola-bar'),
    cornflakes: p('corn-flakes'), muesli: p('muesli-bowl'), pancakeMix: p('pancake-mix'),
    porridge: p('oats-porridge'),
    shampoo: p('shampoo-bottle'), soap: p('soap-bar'), toothpaste: p('toothpaste-tube'),
    lotion: p('body-lotion'), facewash: p('face-wash'), deodorant: p('deodorant-spray'),
    laundry: p('washing-powder'), dishwash: p('dish-wash-bar'), cleaning: p('floor-cleaner'),
    sanitizer: p('hand-sanitizer'), liquidSoap: p('liquid-soap'),
    noodles: p('instant-noodles'), indianFood: p('upma-mix'), snacksMix: p('bhujia-snacks'),
    pasta: p('instant-pasta'),
  };

  // ── Products ───────────────────────────────────────────────────────────────
  console.log('Creating products...');

  await Promise.all([
    // Fruits & Vegetables
    prisma.product.create({ data: { name: 'Tomatoes',     description: 'Fresh local tomatoes, firm & juicy',           imageUrl: IMG.tomato,     sellingPrice: 30,  unit: '500g',    categoryId: fruits.id,      storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Potatoes',     description: 'Farm fresh white potatoes',                    imageUrl: IMG.potato,     sellingPrice: 25,  unit: '1kg',     categoryId: fruits.id,      storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Onions',       description: 'Red onions, dried & pungent',                  imageUrl: IMG.onion,      sellingPrice: 35,  originalPrice: 45, unit: '1kg', categoryId: fruits.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Spinach',      description: 'Fresh baby spinach leaves, washed',            imageUrl: IMG.spinach,    sellingPrice: 20,  unit: '250g',    categoryId: fruits.id,      storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Bananas',      description: 'Robusta bananas, sweet & ripe',                imageUrl: IMG.banana,     sellingPrice: 40,  unit: '6 pcs',   categoryId: fruits.id,      storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Red Apples',   description: 'Washington red apples, crisp & sweet',         imageUrl: IMG.apple,      sellingPrice: 120, originalPrice: 140, unit: '4 pcs', categoryId: fruits.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Lemons',       description: 'Fresh juicy lemons, tangy',                    imageUrl: IMG.lemon,      sellingPrice: 25,  unit: '6 pcs',   categoryId: fruits.id,      storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Carrots',      description: 'Tender orange carrots, crunchy',               imageUrl: IMG.carrot,     sellingPrice: 30,  unit: '500g',    categoryId: fruits.id,      storeId: STORE_ID } }),

    // Dairy & Eggs
    prisma.product.create({ data: { name: 'Full Cream Milk',  description: 'Fresh toned cow milk, daily delivery',     imageUrl: IMG.milk,       sellingPrice: 28,  unit: '500ml',   brandId: amul.id,       categoryId: dairy.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Curd',             description: 'Thick set dahi, probiotic rich',           imageUrl: IMG.curd,       sellingPrice: 45,  originalPrice: 52, unit: '400g', brandId: motherDairy.id, categoryId: dairy.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Paneer',           description: 'Fresh cottage cheese, soft texture',        imageUrl: IMG.paneer,     sellingPrice: 85,  originalPrice: 100, unit: '200g', brandId: amul.id, categoryId: dairy.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Butter',           description: 'Salted table butter',                      imageUrl: IMG.butter,     sellingPrice: 55,  unit: '100g',    brandId: amul.id,       categoryId: dairy.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Cheese Slices',    description: 'Processed cheddar slices, 10 pack',        imageUrl: IMG.cheese,     sellingPrice: 110, originalPrice: 130, unit: '200g', brandId: amul.id, categoryId: dairy.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Farm Eggs',        description: 'Free range brown eggs',                    imageUrl: IMG.eggs,       sellingPrice: 84,  originalPrice: 96, unit: '12 pcs', categoryId: dairy.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Vanilla Ice Cream',description: 'Creamy real vanilla ice cream',            imageUrl: IMG.iceCream,   sellingPrice: 120, unit: '500ml',   brandId: amul.id,       categoryId: dairy.id, storeId: STORE_ID } }),

    // Grains & Staples
    prisma.product.create({ data: { name: 'Basmati Rice',     description: 'Premium long grain basmati, aged 2 years', imageUrl: IMG.rice,       sellingPrice: 120, originalPrice: 140, unit: '1kg', brandId: tata.id, categoryId: grains.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Toor Dal',         description: 'Split pigeon peas, protein rich',          imageUrl: IMG.lentils,    sellingPrice: 90,  unit: '500g',    categoryId: grains.id,      storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Wheat Flour',      description: 'Whole wheat flour, stone ground',          imageUrl: IMG.flour,      sellingPrice: 55,  originalPrice: 65, unit: '1kg', brandId: tata.id, categoryId: grains.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Moong Dal',        description: 'Split green gram, easy to cook',           imageUrl: IMG.lentils,    sellingPrice: 85,  unit: '500g',    categoryId: grains.id,      storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Poha',             description: 'Flattened rice, medium thick',             imageUrl: IMG.poha,       sellingPrice: 45,  unit: '500g',    categoryId: grains.id,      storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Quinoa',           description: 'Organic white quinoa, gluten free',        imageUrl: IMG.quinoa,     sellingPrice: 220, originalPrice: 260, unit: '500g', categoryId: grains.id, storeId: STORE_ID } }),

    // Bakery
    prisma.product.create({ data: { name: 'White Bread',      description: 'Soft sandwich bread, fresh daily',         imageUrl: IMG.bread,      sellingPrice: 35,  originalPrice: 40, unit: '400g', brandId: britannia.id, categoryId: bakery.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Brown Bread',      description: 'Whole wheat bread, fiber rich',            imageUrl: IMG.brownBread, sellingPrice: 45,  unit: '400g',    brandId: britannia.id,  categoryId: bakery.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Marie Biscuits',   description: 'Light crispy biscuits for tea time',       imageUrl: IMG.biscuits,   sellingPrice: 25,  unit: '200g',    brandId: britannia.id,  categoryId: bakery.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Good Day Biscuits',description: 'Butter cookies with cashew',               imageUrl: IMG.cookies,    sellingPrice: 30,  originalPrice: 35, unit: '200g', brandId: britannia.id, categoryId: bakery.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Glucose Biscuits', description: 'Energy biscuits, great with milk',         imageUrl: IMG.biscuits,   sellingPrice: 10,  unit: '100g',    brandId: parle.id,      categoryId: bakery.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Rusk Toast',       description: 'Crunchy toasted bread slices',             imageUrl: IMG.rusk,       sellingPrice: 40,  unit: '300g',    brandId: britannia.id,  categoryId: bakery.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Pav Bread',        description: 'Soft dinner rolls, 6 pack',                imageUrl: IMG.pav,        sellingPrice: 30,  originalPrice: 35, unit: '6 pcs', brandId: britannia.id, categoryId: bakery.id, storeId: STORE_ID } }),

    // Cooking Essentials
    prisma.product.create({ data: { name: 'Sunflower Oil',    description: 'Refined sunflower oil, light & healthy',   imageUrl: IMG.oil,        sellingPrice: 130, originalPrice: 150, unit: '1L', categoryId: cooking.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Turmeric Powder',  description: 'Pure turmeric, anti-inflammatory',         imageUrl: IMG.turmeric,   sellingPrice: 40,  unit: '100g',    brandId: mtr.id,        categoryId: cooking.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Red Chilli Powder',description: 'Hot Kashmiri chilli blend',                imageUrl: IMG.chilli,     sellingPrice: 45,  originalPrice: 55, unit: '100g', brandId: mtr.id, categoryId: cooking.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Garam Masala',     description: 'Aromatic whole spice blend',               imageUrl: IMG.spices,     sellingPrice: 55,  unit: '50g',     brandId: mtr.id,        categoryId: cooking.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Iodised Salt',     description: 'Free flow iodised table salt',             imageUrl: IMG.salt,       sellingPrice: 20,  unit: '1kg',     brandId: tata.id,       categoryId: cooking.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Sugar',            description: 'Refined white sugar, fine grain',          imageUrl: IMG.sugar,      sellingPrice: 45,  unit: '1kg',     categoryId: cooking.id,     storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Pure Ghee',        description: 'Cow milk clarified butter',                imageUrl: IMG.ghee,       sellingPrice: 320, originalPrice: 360, unit: '500ml', brandId: amul.id, categoryId: cooking.id, storeId: STORE_ID } }),

    // Beverages
    prisma.product.create({ data: { name: 'Orange Juice',     description: '100% real fruit, no sugar added',          imageUrl: IMG.juice,      sellingPrice: 90,  originalPrice: 110, unit: '1L', brandId: tropicana.id, categoryId: beverages.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Mixed Fruit Juice',description: 'Blend of 6 fruits, vitamin rich',          imageUrl: IMG.juice,      sellingPrice: 85,  unit: '1L',      brandId: real.id,       categoryId: beverages.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Tata Tea Premium', description: 'Strong CTC leaf tea, Assam blend',         imageUrl: IMG.tea,        sellingPrice: 70,  originalPrice: 80, unit: '250g', brandId: tata.id, categoryId: beverages.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Nescafé Classic',  description: 'Instant coffee, rich aroma',               imageUrl: IMG.coffee,     sellingPrice: 130, originalPrice: 150, unit: '50g', brandId: nestle.id, categoryId: beverages.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Mineral Water',    description: 'Packaged natural mineral water',            imageUrl: IMG.water,      sellingPrice: 20,  unit: '1L',      brandId: tata.id,       categoryId: beverages.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Coconut Water',    description: 'Natural tender coconut water',              imageUrl: IMG.coconut,    sellingPrice: 45,  unit: '200ml',   brandId: dabur.id,      categoryId: beverages.id, storeId: STORE_ID } }),

    // Snacks & Munchies
    prisma.product.create({ data: { name: "Lay's Classic",    description: 'Thin & crispy potato chips',               imageUrl: IMG.chips,      sellingPrice: 20,  unit: '26g',     brandId: lays.id,       categoryId: snacks.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: "Lay's Magic Masala",description: 'Tangy masala potato chips',               imageUrl: IMG.chips,      sellingPrice: 20,  originalPrice: 22, unit: '26g', brandId: lays.id, categoryId: snacks.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Haldiram Namkeen', description: 'Premium mixed snack assortment',           imageUrl: IMG.namkeen,    sellingPrice: 50,  unit: '150g',    brandId: haldirams.id,  categoryId: snacks.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Dairy Milk',       description: 'Creamy milk chocolate bar',                imageUrl: IMG.chocolate,  sellingPrice: 40,  unit: '36g',     categoryId: snacks.id,      storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Microwave Popcorn',description: 'Butter flavour microwave popcorn',         imageUrl: IMG.popcorn,    sellingPrice: 60,  originalPrice: 75, unit: '85g', categoryId: snacks.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Granola Bar',      description: 'Oats & honey crunchy granola bar',         imageUrl: IMG.granola,    sellingPrice: 35,  unit: '40g',     brandId: kelloggs.id,   categoryId: snacks.id, storeId: STORE_ID } }),

    // Breakfast & Cereals
    prisma.product.create({ data: { name: 'Corn Flakes',      description: 'Classic toasted corn flakes',              imageUrl: IMG.cornflakes, sellingPrice: 120, originalPrice: 145, unit: '250g', brandId: kelloggs.id, categoryId: breakfast.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Muesli',           description: 'Fruit & nut muesli, no added sugar',       imageUrl: IMG.muesli,     sellingPrice: 180, originalPrice: 210, unit: '400g', brandId: kelloggs.id, categoryId: breakfast.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Oats Porridge',    description: 'Quick cook oats, creamy porridge',         imageUrl: IMG.porridge,   sellingPrice: 95,  originalPrice: 110, unit: '500g', brandId: nestle.id, categoryId: breakfast.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Honey',            description: 'Pure natural wildflower honey',            imageUrl: IMG.granola,    sellingPrice: 175, originalPrice: 200, unit: '250g', brandId: dabur.id, categoryId: breakfast.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Peanut Butter',    description: 'Creamy roasted peanut butter',             imageUrl: IMG.granola,    sellingPrice: 200, originalPrice: 240, unit: '400g', categoryId: breakfast.id, storeId: STORE_ID } }),

    // Personal Care
    prisma.product.create({ data: { name: 'Dove Shampoo',     description: 'Moisturizing shampoo for dry hair',        imageUrl: IMG.shampoo,    sellingPrice: 180, originalPrice: 210, unit: '340ml', brandId: dove.id, categoryId: personalCare.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Head & Shoulders', description: 'Anti-dandruff shampoo, cool menthol',      imageUrl: IMG.shampoo,    sellingPrice: 165, originalPrice: 195, unit: '340ml', brandId: headShoulders.id, categoryId: personalCare.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Dove Soap',        description: 'Moisturizing beauty cream bar',            imageUrl: IMG.soap,       sellingPrice: 55,  unit: '100g',    brandId: dove.id,       categoryId: personalCare.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Lifebuoy Soap',    description: 'Antibacterial germ protection soap',       imageUrl: IMG.soap,       sellingPrice: 30,  originalPrice: 38, unit: '100g', brandId: lifebuoy.id, categoryId: personalCare.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Colgate MaxFresh', description: 'Spearmint gel toothpaste',                 imageUrl: IMG.toothpaste, sellingPrice: 85,  originalPrice: 98, unit: '150g', brandId: colgate.id, categoryId: personalCare.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Body Lotion',      description: 'Deep moisturizing daily lotion',           imageUrl: IMG.lotion,     sellingPrice: 140, originalPrice: 165, unit: '250ml', brandId: dove.id, categoryId: personalCare.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Face Wash',        description: 'Daily gentle cleansing face wash',         imageUrl: IMG.facewash,   sellingPrice: 110, unit: '100ml',   brandId: dabur.id,      categoryId: personalCare.id, storeId: STORE_ID } }),

    // Cleaning Supplies
    prisma.product.create({ data: { name: 'Washing Powder',   description: 'Laundry detergent, tough stain remover',   imageUrl: IMG.laundry,    sellingPrice: 120, originalPrice: 140, unit: '1kg', brandId: surfExcel.id, categoryId: cleaning.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Dish Wash Bar',    description: 'Grease cutting lime dish bar',             imageUrl: IMG.dishwash,   sellingPrice: 20,  unit: '200g',    categoryId: cleaning.id,    storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Floor Cleaner',    description: 'Pine fragrance floor cleaner',             imageUrl: IMG.cleaning,   sellingPrice: 90,  originalPrice: 110, unit: '500ml', categoryId: cleaning.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Hand Sanitizer',   description: '70% alcohol instant sanitizer',            imageUrl: IMG.sanitizer,  sellingPrice: 60,  unit: '200ml',   brandId: dettol.id,     categoryId: cleaning.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Liquid Hand Wash', description: 'Moisturizing antibacterial hand wash',      imageUrl: IMG.liquidSoap, sellingPrice: 80,  originalPrice: 95, unit: '250ml', brandId: dettol.id, categoryId: cleaning.id, storeId: STORE_ID } }),

    // Frozen & Ready to Eat
    prisma.product.create({ data: { name: 'Instant Noodles',  description: 'Masala flavour, 2-min cook time',          imageUrl: IMG.noodles,    sellingPrice: 14,  unit: '70g',     brandId: nestle.id,     categoryId: frozen.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Upma Mix',         description: 'Ready to cook upma, no preservatives',     imageUrl: IMG.indianFood, sellingPrice: 50,  unit: '200g',    brandId: mtr.id,        categoryId: frozen.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Bhujia',           description: 'Crispy bikaneri bhujia snack',             imageUrl: IMG.snacksMix,  sellingPrice: 60,  originalPrice: 70, unit: '200g', brandId: haldirams.id, categoryId: frozen.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Mixed Namkeen',    description: 'Assorted crunchy snack mix',               imageUrl: IMG.snacksMix,  sellingPrice: 50,  unit: '200g',    brandId: haldirams.id,  categoryId: frozen.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Instant Pasta',    description: 'Cheesy masala pasta, ready in 6 min',      imageUrl: IMG.pasta,      sellingPrice: 35,  originalPrice: 40, unit: '70g', brandId: nestle.id, categoryId: frozen.id, storeId: STORE_ID } }),
  ]);

  console.log('Products done: 64');
  console.log('\n✅ Seed complete!');
  console.log(`Store: ${store.name} | Domain: ${store.domain}`);
  console.log('Login: admin@freshmart.com / admin123');
}

main()
  .catch(e => { console.error('Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
