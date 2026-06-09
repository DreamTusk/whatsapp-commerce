import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const STORE_DOMAIN = 'freshmart.localhost';

// ── BlockNote helpers ──────────────────────────────────────────────────────
let _bid = 1;
const uid = () => `s${_bid++}`;
const bnPara = (text: string) => ({
  id: uid(), type: 'paragraph',
  props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
  content: [{ type: 'text', text, styles: {} }], children: [],
});
const bnBullet = (text: string) => ({
  id: uid(), type: 'bulletListItem',
  props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
  content: [{ type: 'text', text, styles: {} }], children: [],
});
const desc = (summary: string, ...points: string[]) =>
  JSON.stringify([bnPara(summary), ...points.map(bnBullet)]);

// Picsum helpers — same seed = same image every run
const img  = (seed: string) => `https://picsum.photos/seed/${seed}/400/400`;
const cImg = (seed: string) => `https://picsum.photos/seed/${seed}/600/400`;

async function main(): Promise<void> {
  const store = await prisma.store.findUnique({ where: { domain: STORE_DOMAIN } });
  if (!store) {
    console.error(`Store "${STORE_DOMAIN}" not found. Run seed.ts first.`);
    process.exit(1);
  }
  const STORE_ID = store.id;
  console.log(`Found store: ${store.name} (${STORE_ID})`);

  const userStore = await prisma.userStore.findFirst({ where: { storeId: STORE_ID, role: 'OWNER' } });
  const OWNER_ID = userStore?.userId ?? null;

  // ── Cleanup ───────────────────────────────────────────────────────────────
  console.log('Cleaning up existing data…');
  await prisma.collectionProduct.deleteMany({ where: { collection: { storeId: STORE_ID } } });
  await prisma.cartItem.deleteMany({ where: { storeId: STORE_ID } });
  await prisma.wishlistItem.deleteMany({ where: { storeId: STORE_ID } });
  await prisma.orderItem.deleteMany({ where: { order: { storeId: STORE_ID } } });
  await prisma.product.deleteMany({ where: { storeId: STORE_ID } }); // cascades productMedia
  await prisma.media.deleteMany({ where: { storeId: STORE_ID } });
  await prisma.category.deleteMany({ where: { storeId: STORE_ID } });
  await prisma.brand.deleteMany({ where: { storeId: STORE_ID } });
  console.log('Cleanup done.');

  // ── Helper: create product + picsum Media + ProductMedia ──────────────────
  async function mkProduct(data: any, imgSeed: string) {
    const product = await prisma.product.create({ data });
    const media = await prisma.media.create({
      data: {
        storeId: STORE_ID,
        uploadedBy: OWNER_ID,
        key: `seed/products/${imgSeed}`,
        bucket: 'PUBLIC' as any,
        url: img(imgSeed),
        mimeType: 'image/jpeg',
        size: 60000,
        originalName: `${imgSeed}.jpg`,
        entityType: 'PRODUCT' as any,
        entityId: product.id,
        status: 'ACTIVE' as any,
      },
    });
    await prisma.productMedia.create({
      data: { productId: product.id, mediaId: media.id, isPrimary: true, sortOrder: 0 },
    });
    return product;
  }

  // ── Brands ────────────────────────────────────────────────────────────────
  console.log('Creating brands…');
  const [amul, nestle, britannia, tata, haldirams, mtr, dettol, colgate, surfExcel, parle,
         motherDairy, tropicana, dove, headShoulders, kelloggs, lays, dabur, real, sunfeast, lifebuoy] =
    await Promise.all([
      prisma.brand.create({ data: { name: 'Amul',             storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Nestlé',           storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Britannia',        storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Tata',             storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: "Haldiram's",       storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'MTR',              storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Dettol',           storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Colgate',          storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Surf Excel',       storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Parle',            storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Mother Dairy',     storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Tropicana',        storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Dove',             storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Head & Shoulders', storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: "Kellogg's",        storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: "Lay's",            storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Dabur',            storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Real',             storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Sunfeast',         storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Lifebuoy',         storeId: STORE_ID } }),
    ]);
  console.log('Brands done: 20');

  // ── Categories (with picsum imageUrl) ─────────────────────────────────────
  console.log('Creating categories…');
  const [fruits, dairy, grains, bakery, cooking, beverages, snacks, breakfast, personalCare, cleaning, frozen] =
    await Promise.all([
      prisma.category.create({ data: { name: 'Fruits & Vegetables',   storeId: STORE_ID, imageUrl: cImg('fresh-vegetables-market') } }),
      prisma.category.create({ data: { name: 'Dairy & Eggs',          storeId: STORE_ID, imageUrl: cImg('dairy-milk-eggs') } }),
      prisma.category.create({ data: { name: 'Grains & Staples',      storeId: STORE_ID, imageUrl: cImg('grains-rice-dal') } }),
      prisma.category.create({ data: { name: 'Bakery',                storeId: STORE_ID, imageUrl: cImg('bakery-bread-biscuits') } }),
      prisma.category.create({ data: { name: 'Cooking Essentials',    storeId: STORE_ID, imageUrl: cImg('cooking-spices-oil') } }),
      prisma.category.create({ data: { name: 'Beverages',             storeId: STORE_ID, imageUrl: cImg('beverages-drinks-juice') } }),
      prisma.category.create({ data: { name: 'Snacks & Munchies',     storeId: STORE_ID, imageUrl: cImg('snacks-chips-namkeen') } }),
      prisma.category.create({ data: { name: 'Breakfast & Cereals',   storeId: STORE_ID, imageUrl: cImg('breakfast-cereal-oats') } }),
      prisma.category.create({ data: { name: 'Personal Care',         storeId: STORE_ID, imageUrl: cImg('personal-care-hygiene') } }),
      prisma.category.create({ data: { name: 'Cleaning Supplies',     storeId: STORE_ID, imageUrl: cImg('cleaning-household') } }),
      prisma.category.create({ data: { name: 'Frozen & Ready to Eat', storeId: STORE_ID, imageUrl: cImg('frozen-readymade-food') } }),
    ]);
  console.log('Categories done: 11');

  // ── Products ──────────────────────────────────────────────────────────────
  console.log('Creating products with images…');

  await Promise.all([

    // ── Fruits & Vegetables ────────────────────────────────────────────────
    mkProduct({
      name: 'Tomatoes', unit: '500g', sellingPrice: 30, categoryId: fruits.id, storeId: STORE_ID,
      description: desc(
        'Farm-fresh red tomatoes sourced daily from local farms. Firm, juicy, and naturally ripened.',
        'Rich in lycopene & Vitamin C',
        'Perfect for salads, gravies & curries',
        'No preservatives or artificial ripening',
      ),
    }, 'tomatoes-fresh'),

    mkProduct({
      name: 'Potatoes', unit: '1kg', sellingPrice: 25, categoryId: fruits.id, storeId: STORE_ID,
      description: desc(
        'Fresh white potatoes from hill farms. Starchy and versatile — boil, fry, or bake.',
        'Sourced from Shimla & Ooty farms',
        'Rich in potassium & Vitamin B6',
        'Good for aloo sabzi, chips & biryani',
      ),
    }, 'potatoes-farm'),

    mkProduct({
      name: 'Onions', unit: '1kg', sellingPrice: 35, originalPrice: 45, categoryId: fruits.id, storeId: STORE_ID,
      description: desc(
        'Red onions with strong pungent flavour. Dried & cured for a longer shelf life.',
        'Freshness guaranteed for 7+ days',
        'Essential base for all Indian cooking',
        'High in antioxidants & quercetin',
      ),
    }, 'onions-red'),

    mkProduct({
      name: 'Spinach', unit: '250g', sellingPrice: 20, categoryId: fruits.id, storeId: STORE_ID,
      description: desc(
        'Baby spinach leaves, pre-washed and ready to cook. Tender, dark-green, and nutrient-dense.',
        'Packed with iron, folic acid & Vitamin K',
        'Great for palak paneer & green smoothies',
        'Washed & hygienically packed',
      ),
    }, 'spinach-leaves'),

    mkProduct({
      name: 'Bananas', unit: '6 pcs', sellingPrice: 40, categoryId: fruits.id, storeId: STORE_ID,
      description: desc(
        'Sweet Robusta bananas from the Western Ghats. Naturally ripened and ready to eat.',
        'Natural energy booster — 89 kcal per banana',
        'Rich in potassium & Vitamin B6',
        'Good for smoothies, milkshakes & desserts',
      ),
    }, 'bananas-robusta'),

    mkProduct({
      name: 'Red Apples', unit: '4 pcs', sellingPrice: 120, originalPrice: 140, categoryId: fruits.id, storeId: STORE_ID,
      description: desc(
        'Washington Red Delicious apples — crisp, sweet, and full of dietary fibre.',
        'Imported, hand-sorted for quality',
        'High in fibre & Vitamin C',
        'Refrigerate to maintain freshness',
      ),
    }, 'red-apples'),

    mkProduct({
      name: 'Lemons', unit: '6 pcs', sellingPrice: 25, categoryId: fruits.id, storeId: STORE_ID,
      description: desc(
        'Fresh tangy lemons. Great for nimbu paani, cooking, garnishing, and chutneys.',
        'High Vitamin C content — natural immunity booster',
        'Natural preservative & flavour enhancer',
        'Thin-skinned, high juice yield',
      ),
    }, 'lemons-fresh'),

    mkProduct({
      name: 'Carrots', unit: '500g', sellingPrice: 30, categoryId: fruits.id, storeId: STORE_ID,
      description: desc(
        'Tender orange carrots with natural sweetness. Crunchy, fresh, and full of nutrients.',
        'High in beta-carotene & Vitamin A',
        'Perfect for gajar halwa, salads & juicing',
        'Farm fresh, no wax coating',
      ),
    }, 'carrots-orange'),

    // ── Dairy & Eggs ───────────────────────────────────────────────────────
    mkProduct({
      name: 'Full Cream Milk', unit: '500ml', sellingPrice: 28,
      brandId: amul.id, categoryId: dairy.id, storeId: STORE_ID,
      description: desc(
        'Fresh pasteurized full cream cow milk. Delivered daily for guaranteed freshness.',
        'Pasteurized & homogenized for safety',
        'Rich in calcium, protein & Vitamin D',
        'Ideal for tea, coffee & direct consumption',
      ),
    }, 'milk-amul'),

    mkProduct({
      name: 'Curd', unit: '400g', sellingPrice: 45, originalPrice: 52,
      brandId: motherDairy.id, categoryId: dairy.id, storeId: STORE_ID,
      description: desc(
        'Thick set dahi made from fresh toned milk. Probiotic-rich for better gut health.',
        'Live probiotic cultures for digestive health',
        'Smooth, creamy texture — no sourness',
        'Good for raita, lassi & marinades',
      ),
    }, 'curd-set'),

    mkProduct({
      name: 'Paneer', unit: '200g', sellingPrice: 85, originalPrice: 100,
      brandId: amul.id, categoryId: dairy.id, storeId: STORE_ID,
      description: desc(
        'Fresh cottage cheese made from pure cow milk. Soft, crumbly, and high in protein.',
        '18g protein per 100g serving',
        'Ideal for paneer butter masala, tikka & bhurji',
        'Made fresh daily — no preservatives',
      ),
    }, 'paneer-fresh'),

    mkProduct({
      name: 'Salted Butter', unit: '100g', sellingPrice: 55,
      brandId: amul.id, categoryId: dairy.id, storeId: STORE_ID,
      description: desc(
        'Creamy salted table butter. Perfect on toast, for baking, and for adding richness to gravies.',
        'Made from fresh pasteurized cream',
        'Rich, indulgent butter flavour',
        'Great for baking breads, cakes & cookies',
      ),
    }, 'butter-amul'),

    mkProduct({
      name: 'Cheese Slices', unit: '200g', sellingPrice: 110, originalPrice: 130,
      brandId: amul.id, categoryId: dairy.id, storeId: STORE_ID,
      description: desc(
        'Processed cheddar cheese slices — perfect for burgers, sandwiches, and grilled items.',
        '10 individually wrapped slices',
        'Good source of calcium & protein',
        'Melts evenly on grilling or toasting',
      ),
    }, 'cheese-slices'),

    mkProduct({
      name: 'Farm Eggs', unit: '12 pcs', sellingPrice: 84, originalPrice: 96,
      categoryId: dairy.id, storeId: STORE_ID,
      description: desc(
        'Free-range brown eggs from cage-free farm hens. Fresh, protein-rich, large size.',
        '6g high-quality protein per egg',
        'Brown shell, free-range, cage-free hens',
        'Freshness guaranteed — packed same day',
      ),
    }, 'eggs-farm'),

    mkProduct({
      name: 'Vanilla Ice Cream', unit: '500ml', sellingPrice: 120,
      brandId: amul.id, categoryId: dairy.id, storeId: STORE_ID,
      description: desc(
        'Creamy real vanilla ice cream made with natural flavours and rich milk fat.',
        'Made with real vanilla extract',
        'No artificial colours or flavours',
        'Perfect for sundaes, milkshakes & desserts',
      ),
    }, 'ice-cream-vanilla'),

    // ── Grains & Staples ───────────────────────────────────────────────────
    mkProduct({
      name: 'Basmati Rice', unit: '1kg', sellingPrice: 120, originalPrice: 140,
      brandId: tata.id, categoryId: grains.id, storeId: STORE_ID,
      description: desc(
        'Premium long-grain basmati rice aged for 2 years. Fluffy, fragrant, and perfectly non-sticky.',
        'Aged 2 years for superior aroma & texture',
        'Extra-long grains that elongate on cooking',
        'Perfect for biryani, pulao & fried rice',
      ),
    }, 'basmati-rice'),

    mkProduct({
      name: 'Toor Dal', unit: '500g', sellingPrice: 90,
      categoryId: grains.id, storeId: STORE_ID,
      description: desc(
        'Split pigeon peas — a protein-packed staple of every Indian kitchen.',
        '22g plant protein per 100g',
        'Quick cook variety — tender in 20 mins',
        'Essential for dal tadka, sambar & rasam',
      ),
    }, 'toor-dal'),

    mkProduct({
      name: 'Whole Wheat Flour', unit: '1kg', sellingPrice: 55, originalPrice: 65,
      brandId: tata.id, categoryId: grains.id, storeId: STORE_ID,
      description: desc(
        '100% whole wheat flour stone-ground to retain nutrients and natural bran flavour.',
        'High fibre, whole grain — no maida blending',
        'Ideal for rotis, parathas & chapatis',
        'Good glycemic management vs refined flour',
      ),
    }, 'wheat-flour'),

    mkProduct({
      name: 'Moong Dal', unit: '500g', sellingPrice: 85,
      categoryId: grains.id, storeId: STORE_ID,
      description: desc(
        'Split green gram — easy to digest and light on the stomach. An everyday healthy dal.',
        '24g protein per 100g — highest among dals',
        'Easily digestible & gut-friendly',
        'Great for khichdi, soups, cheela & sprouts',
      ),
    }, 'moong-dal'),

    mkProduct({
      name: 'Poha', unit: '500g', sellingPrice: 45,
      categoryId: grains.id, storeId: STORE_ID,
      description: desc(
        'Medium thick flattened rice. Cooks in minutes — the classic Indian breakfast staple.',
        'Quick cook — ready in 5 minutes',
        'Gluten-free grain option',
        'Perfect for poha breakfast, chivda & chaat',
      ),
    }, 'poha-flattened'),

    mkProduct({
      name: 'Quinoa', unit: '500g', sellingPrice: 220, originalPrice: 260,
      categoryId: grains.id, storeId: STORE_ID,
      description: desc(
        'Organic white quinoa — a complete protein grain loved by fitness enthusiasts.',
        'Complete protein with all 9 essential amino acids',
        'Gluten-free superfood grain',
        'Great for salads, grain bowls & upma',
      ),
    }, 'quinoa-organic'),

    // ── Bakery ─────────────────────────────────────────────────────────────
    mkProduct({
      name: 'White Sandwich Bread', unit: '400g', sellingPrice: 35, originalPrice: 40,
      brandId: britannia.id, categoryId: bakery.id, storeId: STORE_ID,
      description: desc(
        'Soft sandwich bread baked fresh daily. Light, fluffy, with a fine crumb texture.',
        'Made with enriched wheat flour & vitamins',
        'Ideal for sandwiches, French toast & rolls',
        'No artificial preservatives',
      ),
    }, 'white-bread'),

    mkProduct({
      name: 'Brown Bread', unit: '400g', sellingPrice: 45,
      brandId: britannia.id, categoryId: bakery.id, storeId: STORE_ID,
      description: desc(
        'Whole wheat brown bread — healthier, denser, and packed with dietary fibre.',
        'High fibre, whole grain goodness',
        'Lower GI than white bread',
        'No added sugar or artificial flavours',
      ),
    }, 'brown-bread'),

    mkProduct({
      name: 'Marie Biscuits', unit: '200g', sellingPrice: 25,
      brandId: britannia.id, categoryId: bakery.id, storeId: STORE_ID,
      description: desc(
        'Light and crispy biscuits perfect for tea time. A timeless classic for all ages.',
        'Low in fat & sugar compared to cream biscuits',
        'Crunchy texture that dunks perfectly in chai',
        'Great with tea, coffee or warm milk',
      ),
    }, 'marie-biscuits'),

    mkProduct({
      name: 'Good Day Butter Cashew Biscuits', unit: '200g', sellingPrice: 30, originalPrice: 35,
      brandId: britannia.id, categoryId: bakery.id, storeId: STORE_ID,
      description: desc(
        'Melt-in-mouth butter biscuits loaded with real cashew pieces. A rich tea-time treat.',
        'Real cashew pieces in every biscuit',
        'Rich butter flavour, crumbly texture',
        'A perfect gift or everyday indulgence',
      ),
    }, 'goodday-biscuits'),

    mkProduct({
      name: 'Parle-G Glucose Biscuits', unit: '100g', sellingPrice: 10,
      brandId: parle.id, categoryId: bakery.id, storeId: STORE_ID,
      description: desc(
        'Energy biscuits with a mild sweet flavour. India\'s most loved biscuit for 80+ years.',
        'Fortified with vitamins & iron',
        'Quick energy for kids & adults',
        'Dunks perfectly in milk or chai',
      ),
    }, 'parle-g'),

    mkProduct({
      name: 'Rusk Toast', unit: '300g', sellingPrice: 40,
      brandId: britannia.id, categoryId: bakery.id, storeId: STORE_ID,
      description: desc(
        'Twice-baked crunchy bread slices. The perfect companion for morning chai.',
        'Extra crunchy texture, light & crispy',
        'Long shelf life — 3+ months',
        'Classic tea-time staple across India',
      ),
    }, 'rusk-toast'),

    mkProduct({
      name: 'Pav Bread', unit: '6 pcs', sellingPrice: 30, originalPrice: 35,
      brandId: britannia.id, categoryId: bakery.id, storeId: STORE_ID,
      description: desc(
        'Soft fluffy dinner rolls baked fresh. The soul of Mumbai street food.',
        'Soft, pillowy texture stays fresh all day',
        'Essential for pav bhaji, vada pav & misal',
        'Fresh baked daily',
      ),
    }, 'pav-rolls'),

    // ── Cooking Essentials ─────────────────────────────────────────────────
    mkProduct({
      name: 'Sunflower Oil', unit: '1L', sellingPrice: 130, originalPrice: 150,
      categoryId: cooking.id, storeId: STORE_ID,
      description: desc(
        'Refined sunflower oil — light, healthy, and ideal for everyday cooking.',
        'High in Vitamin E & heart-healthy Omega-6',
        'Light texture & neutral flavour',
        'Ideal for frying, sautéing & baking',
      ),
    }, 'sunflower-oil'),

    mkProduct({
      name: 'Turmeric Powder', unit: '100g', sellingPrice: 40,
      brandId: mtr.id, categoryId: cooking.id, storeId: STORE_ID,
      description: desc(
        'Pure ground turmeric with vibrant golden colour and earthy aroma. An essential Indian spice.',
        'High curcumin content — powerful anti-inflammatory',
        'Intense yellow colour for dal, rice & curries',
        'No added artificial colour or fillers',
      ),
    }, 'turmeric-powder'),

    mkProduct({
      name: 'Red Chilli Powder', unit: '100g', sellingPrice: 45, originalPrice: 55,
      brandId: mtr.id, categoryId: cooking.id, storeId: STORE_ID,
      description: desc(
        'Hot Kashmiri red chilli blend — vibrant colour and moderate heat level.',
        'Deep red colour, medium-hot heat',
        'Blend of Kashmiri & Byadgi chilli for colour',
        'No artificial colour or preservatives',
      ),
    }, 'red-chilli-powder'),

    mkProduct({
      name: 'Garam Masala', unit: '50g', sellingPrice: 55,
      brandId: mtr.id, categoryId: cooking.id, storeId: STORE_ID,
      description: desc(
        'Aromatic blend of whole roasted spices — cinnamon, cloves, cardamom, bay leaf, and more.',
        'Hand-selected premium whole spices',
        'Freshly ground for maximum aroma & flavour',
        'Add at the end of cooking for best results',
      ),
    }, 'garam-masala'),

    mkProduct({
      name: 'Iodised Salt', unit: '1kg', sellingPrice: 20,
      brandId: tata.id, categoryId: cooking.id, storeId: STORE_ID,
      description: desc(
        'Free-flow iodised table salt with the perfect grain size. An everyday kitchen essential.',
        'Iodine fortified as per FSSAI standards',
        'Free-flow formula — no clumping in humidity',
        'Prevents iodine deficiency disorders',
      ),
    }, 'iodised-salt'),

    mkProduct({
      name: 'Refined Sugar', unit: '1kg', sellingPrice: 45,
      categoryId: cooking.id, storeId: STORE_ID,
      description: desc(
        'Refined white cane sugar with uniform grain size. Pure and ideal for all uses.',
        'Pure cane sugar, no additives',
        'Uniform fine grain for even sweetness',
        'Dissolves quickly in hot & cold liquids',
      ),
    }, 'white-sugar'),

    mkProduct({
      name: 'Pure Ghee', unit: '500ml', sellingPrice: 320, originalPrice: 360,
      brandId: amul.id, categoryId: cooking.id, storeId: STORE_ID,
      description: desc(
        'Traditionally churned cow milk ghee with a rich aroma and grainy texture. A1 milk quality.',
        'Made from fresh A1 cow cream',
        'Grainy texture — the hallmark of pure ghee',
        'High smoke point — ideal for tadka & rotis',
      ),
    }, 'ghee-pure'),

    // ── Beverages ──────────────────────────────────────────────────────────
    mkProduct({
      name: 'Orange Juice', unit: '1L', sellingPrice: 90, originalPrice: 110,
      brandId: tropicana.id, categoryId: beverages.id, storeId: STORE_ID,
      description: desc(
        '100% real fruit juice — no added sugar, no water, no concentrate. Pure orange goodness.',
        '100% fruit with no water or sugar added',
        'Rich in Vitamin C & natural folate',
        'Cold-pressed for maximum nutrition retention',
      ),
    }, 'orange-juice'),

    mkProduct({
      name: 'Mixed Fruit Juice', unit: '1L', sellingPrice: 85,
      brandId: real.id, categoryId: beverages.id, storeId: STORE_ID,
      description: desc(
        'Refreshing blend of 6 fruits — mango, apple, orange, guava, pineapple, and grape.',
        'Blend of 6 fruits, Vitamin C enriched',
        'No artificial colour or preservatives',
        'Serve chilled for the best experience',
      ),
    }, 'mixed-fruit-juice'),

    mkProduct({
      name: 'Tata Tea Premium', unit: '250g', sellingPrice: 70, originalPrice: 80,
      brandId: tata.id, categoryId: beverages.id, storeId: STORE_ID,
      description: desc(
        'Strong CTC leaf tea sourced from premium Assam gardens. Brews a bold, rich cup every time.',
        'Sourced from premium Assam tea gardens',
        'Strong, full-bodied & aromatic brew',
        'Ideal for cutting chai & masala chai',
      ),
    }, 'tata-tea'),

    mkProduct({
      name: 'Nescafé Classic Instant Coffee', unit: '50g', sellingPrice: 130, originalPrice: 150,
      brandId: nestle.id, categoryId: beverages.id, storeId: STORE_ID,
      description: desc(
        'Smooth instant coffee with a rich aroma. Ready in seconds — no machine needed.',
        'Fine coffee granules for instant dissolving',
        'Rich, balanced flavour — not bitter',
        'Perfect for hot coffee, cold coffee & cappuccino',
      ),
    }, 'nescafe-classic'),

    mkProduct({
      name: 'Mineral Water', unit: '1L', sellingPrice: 20,
      brandId: tata.id, categoryId: beverages.id, storeId: STORE_ID,
      description: desc(
        'Packaged natural mineral water from protected underground sources.',
        'BIS certified & tested for 150+ parameters',
        'Natural minerals retained — not distilled',
        'Tamper-proof seal for safety',
      ),
    }, 'mineral-water'),

    mkProduct({
      name: 'Coconut Water', unit: '200ml', sellingPrice: 45,
      brandId: dabur.id, categoryId: beverages.id, storeId: STORE_ID,
      description: desc(
        'Natural tender coconut water — nature\'s own electrolyte drink. No sugar, no flavours.',
        'Natural electrolytes — potassium, sodium, magnesium',
        'No added sugar or artificial flavours',
        'Hydrates better than most sports drinks',
      ),
    }, 'coconut-water'),

    // ── Snacks & Munchies ──────────────────────────────────────────────────
    mkProduct({
      name: "Lay's Classic Salted Chips", unit: '26g', sellingPrice: 20,
      brandId: lays.id, categoryId: snacks.id, storeId: STORE_ID,
      description: desc(
        'Thin & crispy potato chips with classic salted flavour. Light, crunchy, and addictive.',
        'Thin-cut for extra crispiness',
        'Made with real potatoes & sunflower oil',
        'Perfect snack for movies & parties',
      ),
    }, 'lays-classic'),

    mkProduct({
      name: "Lay's Magic Masala Chips", unit: '26g', sellingPrice: 20, originalPrice: 22,
      brandId: lays.id, categoryId: snacks.id, storeId: STORE_ID,
      description: desc(
        'Tangy masala flavoured potato chips — India\'s favourite chip flavour.',
        'Bold tangy-spicy masala coating',
        'Thin-cut, extra crunchy texture',
        'The #1 selling chip flavour in India',
      ),
    }, 'lays-masala'),

    mkProduct({
      name: "Haldiram's Aloo Bhujia", unit: '150g', sellingPrice: 50,
      brandId: haldirams.id, categoryId: snacks.id, storeId: STORE_ID,
      description: desc(
        'Classic crispy potato bhujia from the house of Haldiram\'s. A timeless Indian snack.',
        'Crispy thin-stranded bhujia',
        'Mildly spiced with ajwain & black pepper',
        'Snack on its own or mix into poha & chaat',
      ),
    }, 'haldirams-bhujia'),

    mkProduct({
      name: 'Dairy Milk Chocolate', unit: '36g', sellingPrice: 40,
      categoryId: snacks.id, storeId: STORE_ID,
      description: desc(
        'Smooth and creamy Cadbury milk chocolate. The iconic taste loved by generations.',
        'Made with real milk & premium cocoa butter',
        'Smooth, melt-in-mouth creamy texture',
        'Perfect gifting chocolate for all occasions',
      ),
    }, 'dairy-milk-choc'),

    mkProduct({
      name: 'Microwave Popcorn', unit: '85g', sellingPrice: 60, originalPrice: 75,
      categoryId: snacks.id, storeId: STORE_ID,
      description: desc(
        'Butter-flavoured microwave popcorn — ready in 3 minutes. Perfect for movie nights.',
        'Ready in under 3 minutes in microwave',
        'Theatre-style rich butter flavour',
        'No trans fat or artificial colours',
      ),
    }, 'microwave-popcorn'),

    mkProduct({
      name: 'Granola Bar', unit: '40g', sellingPrice: 35,
      brandId: kelloggs.id, categoryId: snacks.id, storeId: STORE_ID,
      description: desc(
        'Crunchy oats and honey granola bar — a wholesome on-the-go snack.',
        'Whole grain oats with natural honey',
        'Good source of dietary fibre',
        'No artificial sweeteners or colours',
      ),
    }, 'granola-bar'),

    // ── Breakfast & Cereals ────────────────────────────────────────────────
    mkProduct({
      name: 'Corn Flakes', unit: '250g', sellingPrice: 120, originalPrice: 145,
      brandId: kelloggs.id, categoryId: breakfast.id, storeId: STORE_ID,
      description: desc(
        'Classic toasted corn flakes — crispy, light, and great with cold or warm milk.',
        'Fortified with 8 essential vitamins & iron',
        'Low in fat & a good source of carbohydrates',
        'Quick breakfast — ready in seconds',
      ),
    }, 'corn-flakes'),

    mkProduct({
      name: 'Fruit & Nut Muesli', unit: '400g', sellingPrice: 180, originalPrice: 210,
      brandId: kelloggs.id, categoryId: breakfast.id, storeId: STORE_ID,
      description: desc(
        'Swiss-style muesli with whole grain oats, raisins, almonds, and sunflower seeds.',
        'Whole grain oats with real fruit & nuts',
        'No added sugar or artificial flavours',
        'Soak overnight for a creamy breakfast bowl',
      ),
    }, 'muesli-fruit'),

    mkProduct({
      name: 'Oats Porridge', unit: '500g', sellingPrice: 95, originalPrice: 110,
      brandId: nestle.id, categoryId: breakfast.id, storeId: STORE_ID,
      description: desc(
        'Quick-cook rolled oats for a creamy, filling breakfast porridge in 3 minutes.',
        'Ready in 3 minutes — add hot water or milk',
        'High in soluble fibre — supports heart health',
        'Customise with fruits, honey or dry fruits',
      ),
    }, 'oats-quick'),

    mkProduct({
      name: 'Pure Honey', unit: '250g', sellingPrice: 175, originalPrice: 200,
      brandId: dabur.id, categoryId: breakfast.id, storeId: STORE_ID,
      description: desc(
        'Pure natural wildflower honey — raw, unprocessed, and packed with antioxidants.',
        'Raw & unfiltered — natural enzymes intact',
        'No added sugar, syrup or preservatives',
        'Natural immunity booster & cough soother',
      ),
    }, 'honey-dabur'),

    mkProduct({
      name: 'Peanut Butter', unit: '400g', sellingPrice: 200, originalPrice: 240,
      categoryId: breakfast.id, storeId: STORE_ID,
      description: desc(
        'Creamy roasted peanut butter — rich in protein and healthy unsaturated fats.',
        '25g protein per 100g — great post-workout',
        'No added palm oil or hydrogenated fat',
        'Spread on toast or blend into protein smoothies',
      ),
    }, 'peanut-butter'),

    // ── Personal Care ──────────────────────────────────────────────────────
    mkProduct({
      name: 'Dove Moisturising Shampoo', unit: '340ml', sellingPrice: 180, originalPrice: 210,
      brandId: dove.id, categoryId: personalCare.id, storeId: STORE_ID,
      description: desc(
        'Deeply moisturising shampoo for dry and damaged hair. Leaves hair soft and brilliantly shiny.',
        'With 1/4 moisturising cream formula',
        'Repairs dryness, frizz & split ends',
        'pH-balanced, suitable for daily use',
      ),
    }, 'dove-shampoo'),

    mkProduct({
      name: 'Head & Shoulders Anti-Dandruff Shampoo', unit: '340ml', sellingPrice: 165, originalPrice: 195,
      brandId: headShoulders.id, categoryId: personalCare.id, storeId: STORE_ID,
      description: desc(
        'Clinically proven anti-dandruff shampoo with a refreshing cool menthol sensation.',
        'Clinically proven to control dandruff',
        'Cool menthol formula for scalp freshness',
        'Visible results from the very first wash',
      ),
    }, 'head-shoulders'),

    mkProduct({
      name: 'Dove Beauty Soap', unit: '100g', sellingPrice: 55,
      brandId: dove.id, categoryId: personalCare.id, storeId: STORE_ID,
      description: desc(
        'Moisturising beauty cream bar — gentle enough for daily use, leaves skin soft and smooth.',
        'With 1/4 moisturising cream — not just soap',
        'pH-balanced, dermatologist tested',
        'Suitable for all skin types including sensitive',
      ),
    }, 'dove-soap'),

    mkProduct({
      name: 'Lifebuoy Total Soap', unit: '100g', sellingPrice: 30, originalPrice: 38,
      brandId: lifebuoy.id, categoryId: personalCare.id, storeId: STORE_ID,
      description: desc(
        'Antibacterial soap with powerful germ protection. Keeps hands and body clean all day.',
        'Kills 99.9% germs including bacteria & viruses',
        'Long-lasting formula — lasts 30% more',
        'Available in Thulasi & Aloe Vera variants',
      ),
    }, 'lifebuoy-soap'),

    mkProduct({
      name: 'Colgate MaxFresh Gel', unit: '150g', sellingPrice: 85, originalPrice: 98,
      brandId: colgate.id, categoryId: personalCare.id, storeId: STORE_ID,
      description: desc(
        'Spearmint gel toothpaste with Mini Breath Strips for powerful, long-lasting fresh breath.',
        'Mini Breath Strips for 12-hour freshness',
        'Whitening formula reduces surface stains',
        'Fluoride protection for stronger enamel',
      ),
    }, 'colgate-maxfresh'),

    mkProduct({
      name: 'Dove Body Lotion', unit: '250ml', sellingPrice: 140, originalPrice: 165,
      brandId: dove.id, categoryId: personalCare.id, storeId: STORE_ID,
      description: desc(
        'Deep moisturising body lotion with 24-hour moisture lock. Leaves skin visibly softer.',
        'Non-greasy, fast-absorbing lightweight formula',
        '24-hour moisture lock technology',
        'With 1/4 moisturising cream for lasting softness',
      ),
    }, 'dove-lotion'),

    // ── Cleaning Supplies ──────────────────────────────────────────────────
    mkProduct({
      name: 'Surf Excel Easy Wash', unit: '1kg', sellingPrice: 120, originalPrice: 140,
      brandId: surfExcel.id, categoryId: cleaning.id, storeId: STORE_ID,
      description: desc(
        'Tough stain remover laundry detergent powder. Works on blood, oil, curry, and mud stains.',
        'Removes 100+ types of tough stains in one wash',
        'Works effectively in cold & hard water',
        'Leaves clothes fresh, bright & clean',
      ),
    }, 'surf-excel'),

    mkProduct({
      name: 'Lime Dish Wash Bar', unit: '200g', sellingPrice: 20,
      categoryId: cleaning.id, storeId: STORE_ID,
      description: desc(
        'Tough grease-cutting dish wash bar with active lime. Removes oil and food residue effortlessly.',
        'Active lime formula cuts through grease',
        'No harsh chemicals — gentle on hands',
        'Works with minimal water for eco-savings',
      ),
    }, 'dish-wash-bar'),

    mkProduct({
      name: 'Pine Floor Cleaner', unit: '500ml', sellingPrice: 90, originalPrice: 110,
      categoryId: cleaning.id, storeId: STORE_ID,
      description: desc(
        'Pine-fragrance floor cleaner that disinfects and leaves a long-lasting fresh scent.',
        'Kills 99.9% bacteria & germs on floor',
        'Pleasant pine fragrance lasts for hours',
        'Suitable for tiles, marble & mosaic floors',
      ),
    }, 'floor-cleaner'),

    mkProduct({
      name: 'Dettol Hand Sanitizer', unit: '200ml', sellingPrice: 60,
      brandId: dettol.id, categoryId: cleaning.id, storeId: STORE_ID,
      description: desc(
        'Instant hand sanitizer with 70% ethyl alcohol. No water or rinse needed.',
        '70% ethyl alcohol — WHO-recommended formula',
        'Kills 99.99% germs instantly on contact',
        'Non-sticky formula dries in seconds',
      ),
    }, 'dettol-sanitizer'),

    mkProduct({
      name: 'Dettol Liquid Hand Wash', unit: '250ml', sellingPrice: 80, originalPrice: 95,
      brandId: dettol.id, categoryId: cleaning.id, storeId: STORE_ID,
      description: desc(
        'Moisturising antibacterial hand wash. Kills germs while keeping hands soft and smooth.',
        'Kills 99.9% bacteria on hands',
        'pH-balanced, gentle on skin with regular use',
        'With skin conditioners — no dryness',
      ),
    }, 'dettol-handwash'),

    // ── Frozen & Ready to Eat ──────────────────────────────────────────────
    mkProduct({
      name: 'Maggi Masala Noodles', unit: '70g', sellingPrice: 14,
      brandId: nestle.id, categoryId: frozen.id, storeId: STORE_ID,
      description: desc(
        'The original 2-minute masala noodles. India\'s most loved quick snack since 1983.',
        'Ready in exactly 2 minutes — the fastest meal',
        'Iconic masala tastemaker with secret spice blend',
        'No added MSG, no artificial colour',
      ),
    }, 'maggi-noodles'),

    mkProduct({
      name: 'MTR Upma Mix', unit: '200g', sellingPrice: 50,
      brandId: mtr.id, categoryId: frozen.id, storeId: STORE_ID,
      description: desc(
        'Ready-to-cook upma mix with all spices pre-blended. A wholesome South Indian breakfast.',
        'Ready in under 5 minutes — just add water',
        'Authentic South Indian flavour & texture',
        'No preservatives or artificial colour',
      ),
    }, 'mtr-upma'),

    mkProduct({
      name: "Haldiram's Bikaneri Bhujia", unit: '200g', sellingPrice: 60, originalPrice: 70,
      brandId: haldirams.id, categoryId: frozen.id, storeId: STORE_ID,
      description: desc(
        'Crispy Bikaneri-style bhujia made with besan and hand-ground spices. A Rajasthani classic.',
        'Authentic 100-year-old Bikaner recipe',
        'Crispy, spiced with black pepper & ajwain',
        'Great for gifting & everyday snacking',
      ),
    }, 'bikaneri-bhujia'),

    mkProduct({
      name: "Haldiram's Mixed Namkeen", unit: '200g', sellingPrice: 50,
      brandId: haldirams.id, categoryId: frozen.id, storeId: STORE_ID,
      description: desc(
        'A crunchy assortment of sev, murmura, chana dal, and peanuts. The perfect chai companion.',
        'Mix of 8 different namkeen varieties',
        'Lightly spiced, mildly salted — not oily',
        'Great for parties, gifting & evening snacking',
      ),
    }, 'mixed-namkeen'),

    mkProduct({
      name: 'Maggi Cheesy Pasta', unit: '70g', sellingPrice: 35, originalPrice: 40,
      brandId: nestle.id, categoryId: frozen.id, storeId: STORE_ID,
      description: desc(
        'Cheesy masala pasta ready in 6 minutes. A quick and delicious meal for pasta lovers.',
        'Ready in 6 minutes — no mess, no hassle',
        'Cheesy masala sauce sachet included',
        'Customise with your favourite vegetables',
      ),
    }, 'maggi-pasta'),

  ]);

  console.log('Products done: 64');
  console.log('\n✅ Supermarket seed complete!');
  console.log(`Store  : ${store.name} | Domain: ${store.domain}`);
  console.log('Login  : admin@freshmart.com / admin123');
  console.log('\nNote: Product images use picsum.photos placeholders.');
  console.log('      Replace with real images via the admin Edit Product UI.');
}

main()
  .catch(e => { console.error('Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
