import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const STORE_DOMAIN = 'teststore.localhost'; // change this to your store domain

async function main(): Promise<void> {
  const store = await prisma.store.findUnique({ where: { domain: STORE_DOMAIN } });
  if (!store) {
    console.error(`Store with domain "${STORE_DOMAIN}" not found. Run seed.ts first.`);
    process.exit(1);
  }

  console.log(`Found store: ${store.name} (${store.id})`);
  const STORE_ID = store.id;

  // ── Cleanup ────────────────────────────────────────────────────────────────
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
    prisma.brand.create({ data: { name: 'Samsung',   storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Apple',     storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Sony',      storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'LG',        storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'OnePlus',   storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Xiaomi',    storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Dell',      storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'HP',        storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'JBL',       storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Philips',   storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Logitech',  storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Canon',     storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Panasonic', storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Bosch',     storeId: STORE_ID } }),
    prisma.brand.create({ data: { name: 'Realme',    storeId: STORE_ID } }),
  ]);

  const [samsung, apple, sony, lg, oneplus, xiaomi, dell, hp, jbl, philips, logitech, canon, panasonic, bosch, realme] = brands;
  console.log(`Brands done: ${brands.length}`);

  // ── Picsum helper ──────────────────────────────────────────────────────────
  const p = (seed: string) => `https://picsum.photos/seed/${seed}/400/400`;

  // ── Categories ─────────────────────────────────────────────────────────────
  console.log('Creating categories...');
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Smartphones',             imageUrl: p('smartphones'),       storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Laptops & Computers',     imageUrl: p('laptops'),           storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Audio & Headphones',      imageUrl: p('headphones'),        storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Televisions',             imageUrl: p('television'),        storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Home Appliances',         imageUrl: p('appliances'),        storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Cameras & Photography',   imageUrl: p('camera'),            storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Accessories & Peripherals', imageUrl: p('accessories'),     storeId: STORE_ID } }),
  ]);

  const [smartphones, laptops, audio, tvs, appliances, cameras, accessories] = categories;
  console.log(`Categories done: ${categories.length}`);

  // ── Product image map ──────────────────────────────────────────────────────
  const IMG = {
    phone1:    p('phone-samsung'),
    phone2:    p('phone-iphone'),
    phone3:    p('phone-oneplus'),
    phone4:    p('phone-xiaomi'),
    phone5:    p('phone-realme'),
    laptop1:   p('laptop-dell'),
    laptop2:   p('laptop-hp'),
    laptop3:   p('laptop-apple'),
    laptop4:   p('laptop-samsung'),
    headphone1:p('headphone-sony'),
    headphone2:p('headphone-jbl'),
    headphone3:p('headphone-apple'),
    speaker1:  p('speaker-jbl'),
    speaker2:  p('speaker-sony'),
    tv1:       p('tv-samsung'),
    tv2:       p('tv-lg'),
    tv3:       p('tv-sony'),
    washing:   p('washing-machine'),
    fridge:    p('refrigerator'),
    ac:        p('air-conditioner'),
    microwave: p('microwave-oven'),
    vacuum:    p('vacuum-cleaner'),
    camera1:   p('camera-canon'),
    camera2:   p('camera-sony'),
    tripod:    p('camera-tripod'),
    mouse:     p('wireless-mouse'),
    keyboard:  p('keyboard-logitech'),
    charger:   p('usb-charger'),
    cable:     p('hdmi-cable'),
    powerbank: p('power-bank'),
    cover:     p('phone-cover'),
  };

  // ── Products ───────────────────────────────────────────────────────────────
  console.log('Creating products...');

  await Promise.all([
    // Smartphones
    prisma.product.create({ data: { name: 'Samsung Galaxy S24',      description: '6.2" Dynamic AMOLED, Snapdragon 8 Gen 3, 50MP camera, 4000mAh',         sellingPrice: 74999, originalPrice: 79999, unit: '1 pc',  brandId: samsung.id,  categoryId: smartphones.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Apple iPhone 15',         description: '6.1" Super Retina XDR, A16 Bionic chip, 48MP main camera, USB-C',        sellingPrice: 79999, originalPrice: 84999, unit: '1 pc',  brandId: apple.id,    categoryId: smartphones.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'OnePlus 12',              description: '6.82" LTPO AMOLED, Snapdragon 8 Gen 3, 50MP Hasselblad, 5400mAh',        sellingPrice: 64999, originalPrice: 69999, unit: '1 pc',  brandId: oneplus.id,  categoryId: smartphones.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Xiaomi 14',               description: '6.36" AMOLED, Snapdragon 8 Gen 3, Leica 50MP, 4610mAh, 90W charging',    sellingPrice: 59999, originalPrice: 64999, unit: '1 pc',  brandId: xiaomi.id,   categoryId: smartphones.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Samsung Galaxy A55',      description: '6.6" Super AMOLED, Exynos 1480, 50MP OIS, 5000mAh, IP67 rated',          sellingPrice: 34999, originalPrice: 37999, unit: '1 pc',  brandId: samsung.id,  categoryId: smartphones.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Realme 12 Pro+',          description: '6.7" AMOLED, Snapdragon 7s Gen 2, 50MP periscope, 5000mAh, 67W',         sellingPrice: 29999, originalPrice: 32999, unit: '1 pc',  brandId: realme.id,   categoryId: smartphones.id, storeId: STORE_ID } }),

    // Laptops & Computers
    prisma.product.create({ data: { name: 'Dell XPS 15',             description: '15.6" 4K OLED, Intel Core i7-13700H, 16GB RAM, 512GB SSD, RTX 4060',     sellingPrice: 159999, originalPrice: 174999, unit: '1 pc', brandId: dell.id,    categoryId: laptops.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'HP Spectre x360',         description: '14" 2.8K OLED touch, Intel i7-1355U, 16GB, 1TB SSD, 360° hinge',         sellingPrice: 139999, originalPrice: 154999, unit: '1 pc', brandId: hp.id,      categoryId: laptops.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Apple MacBook Air M3',    description: '13.6" Liquid Retina, Apple M3 chip, 8GB RAM, 256GB SSD, 18hr battery',    sellingPrice: 114999, originalPrice: 119999, unit: '1 pc', brandId: apple.id,   categoryId: laptops.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Samsung Galaxy Book4',    description: '15.6" FHD AMOLED, Intel Core Ultra 5, 8GB, 512GB SSD, thin & light',      sellingPrice: 89999, originalPrice: 99999,  unit: '1 pc', brandId: samsung.id, categoryId: laptops.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Dell Inspiron 15',        description: '15.6" FHD IPS, Intel Core i5-1335U, 8GB, 512GB SSD, Win 11 Home',        sellingPrice: 62999, originalPrice: 69999,  unit: '1 pc', brandId: dell.id,    categoryId: laptops.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'HP Pavilion 14',          description: '14" FHD IPS, AMD Ryzen 5 7530U, 16GB, 512GB SSD, backlit keyboard',       sellingPrice: 54999, originalPrice: 59999,  unit: '1 pc', brandId: hp.id,      categoryId: laptops.id, storeId: STORE_ID } }),

    // Audio & Headphones
    prisma.product.create({ data: { name: 'Sony WH-1000XM5',         description: 'Industry-leading ANC, 30hr battery, multipoint, Hi-Res audio certified', sellingPrice: 24999, originalPrice: 29999, unit: '1 pc',  brandId: sony.id,     categoryId: audio.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Apple AirPods Pro 2',     description: 'Active Noise Cancellation, Adaptive Transparency, H2 chip, 30hr total',   sellingPrice: 24999, originalPrice: 26900, unit: '1 pc',  brandId: apple.id,    categoryId: audio.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'JBL Tune 770NC',          description: 'Hybrid ANC, 70hr battery, JBL Pure Bass, multipoint Bluetooth 5.3',       sellingPrice: 7999,  originalPrice: 9999,  unit: '1 pc',  brandId: jbl.id,      categoryId: audio.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Sony WF-1000XM5',         description: 'True wireless earbuds, best-in-class ANC, 8hr + 24hr case, LDAC',         sellingPrice: 19999, originalPrice: 23999, unit: '1 pc',  brandId: sony.id,     categoryId: audio.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'JBL Charge 5',            description: 'Portable Bluetooth speaker, IP67, 20hr playtime, powerbank function',      sellingPrice: 14999, originalPrice: 17999, unit: '1 pc',  brandId: jbl.id,      categoryId: audio.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Sony SRS-XB100',          description: 'Compact Bluetooth speaker, IP67, 16hr battery, extra bass',               sellingPrice: 4999,  originalPrice: 5999,  unit: '1 pc',  brandId: sony.id,     categoryId: audio.id, storeId: STORE_ID } }),

    // Televisions
    prisma.product.create({ data: { name: 'Samsung 55" QLED 4K',     description: 'Quantum Processor 4K, 100% Colour Volume, Smart TV, Gaming Hub',          sellingPrice: 79999, originalPrice: 94999, unit: '1 pc',  brandId: samsung.id,  categoryId: tvs.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'LG 55" OLED C3',          description: 'OLED evo, α9 AI Processor 4K, Dolby Vision IQ, G-Sync, 120Hz',            sellingPrice: 149999, originalPrice: 169999, unit: '1 pc', brandId: lg.id,      categoryId: tvs.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Sony 43" Bravia X75L',    description: '4K HDR, X1 Processor, Triluminos Pro, Google TV, Dolby Atmos',             sellingPrice: 54999, originalPrice: 62999, unit: '1 pc',  brandId: sony.id,     categoryId: tvs.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Samsung 32" Full HD',     description: '1080p LED Smart TV, T4400 Processor, PurColor, 2 HDMI, WiFi',              sellingPrice: 24999, originalPrice: 28999, unit: '1 pc',  brandId: samsung.id,  categoryId: tvs.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'LG 65" UHD 4K NanoCell',  description: 'NanoCell display, α5 AI 4K Gen6 Processor, webOS 23, 60Hz, Alexa',        sellingPrice: 89999, originalPrice: 104999, unit: '1 pc', brandId: lg.id,      categoryId: tvs.id, storeId: STORE_ID } }),

    // Home Appliances
    prisma.product.create({ data: { name: 'Samsung 8kg Front Load WM', description: 'EcoBubble technology, AI Control, hygiene steam, 1400 RPM, Wi-Fi',       sellingPrice: 44999, originalPrice: 52999, unit: '1 pc',  brandId: samsung.id,  categoryId: appliances.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'LG 260L Double Door Fridge', description: 'Smart Inverter Compressor, Door Cooling+, Multi Air Flow, 3-star',       sellingPrice: 29999, originalPrice: 35999, unit: '1 pc',  brandId: lg.id,       categoryId: appliances.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Panasonic 1.5T Split AC',  description: '5-star inverter, PM 2.5 filter, Nanoe-G, Wi-Fi, auto clean, 7-in-1',      sellingPrice: 42999, originalPrice: 49999, unit: '1 pc',  brandId: panasonic.id, categoryId: appliances.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Samsung 28L Microwave',    description: 'Convection + grill, SlimFry, Anti-bacterial coating, 900W power',          sellingPrice: 11999, originalPrice: 14999, unit: '1 pc',  brandId: samsung.id,  categoryId: appliances.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Philips Dry Iron',         description: '2000W, non-stick soleplate, steam burst, 300ml tank, auto shut-off',       sellingPrice: 2499,  originalPrice: 2999,  unit: '1 pc',  brandId: philips.id,  categoryId: appliances.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Bosch 6.5kg Top Load WM',  description: 'EcoSilence Motor, 3D washing, Anti-Tangle, 5-star rated, 700 RPM',        sellingPrice: 22999, originalPrice: 27999, unit: '1 pc',  brandId: bosch.id,    categoryId: appliances.id, storeId: STORE_ID } }),

    // Cameras & Photography
    prisma.product.create({ data: { name: 'Canon EOS R50',           description: 'Mirrorless, 24.2MP APS-C, 4K video, Dual Pixel CMOS AF II, Wi-Fi',         sellingPrice: 69999, originalPrice: 79999, unit: '1 pc',  brandId: canon.id,    categoryId: cameras.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Sony ZV-E10',             description: 'Content creator mirrorless, 24.2MP, real-time tracking AF, 4K, hot shoe',   sellingPrice: 59999, originalPrice: 67999, unit: '1 pc',  brandId: sony.id,     categoryId: cameras.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Canon EF 50mm f/1.8',     description: 'Nifty fifty prime lens, STM motor, bokeh portrait, APS-C & full frame',     sellingPrice: 9999,  originalPrice: 11999, unit: '1 pc',  brandId: canon.id,    categoryId: cameras.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Joby GorillaPod 5K',      description: 'Flexible tripod, 5kg load, ball head, universal fit, lightweight',           sellingPrice: 5999,  originalPrice: 6999,  unit: '1 pc',  categoryId: cameras.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'SanDisk 128GB SD Card',   description: 'Extreme Pro UHS-I, 200MB/s read, V30 class, 4K & 8K video ready',           sellingPrice: 1599,  originalPrice: 1999,  unit: '1 pc',  categoryId: cameras.id, storeId: STORE_ID } }),

    // Accessories & Peripherals
    prisma.product.create({ data: { name: 'Logitech MX Master 3S',   description: 'Ergonomic wireless mouse, 8K DPI, MagSpeed scroll, USB-C, multi-device',    sellingPrice: 9999,  originalPrice: 12999, unit: '1 pc',  brandId: logitech.id, categoryId: accessories.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Logitech MK470 Combo',    description: 'Slim wireless keyboard + mouse, whisper-quiet, 3-year battery life',         sellingPrice: 3999,  originalPrice: 4999,  unit: '1 pc',  brandId: logitech.id, categoryId: accessories.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Anker 65W GaN Charger',   description: '3-port USB-C + USB-A, foldable plug, PowerIQ 4.0, compact travel size',     sellingPrice: 2999,  originalPrice: 3499,  unit: '1 pc',  categoryId: accessories.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Philips HDMI 2.1 Cable',  description: '8K 60Hz / 4K 144Hz, 48Gbps, 2m braided cable, gaming & home theatre',       sellingPrice: 799,   originalPrice: 999,   unit: '1 pc',  brandId: philips.id,  categoryId: accessories.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Mi 20000mAh Power Bank',  description: '50W fast charging, dual USB-C + USB-A, LED display, airline approved',       sellingPrice: 2499,  originalPrice: 2999,  unit: '1 pc',  brandId: xiaomi.id,   categoryId: accessories.id, storeId: STORE_ID } }),
    prisma.product.create({ data: { name: 'Samsung Clear Phone Cover', description: 'Official transparent back cover, shockproof corners, precise cutouts',     sellingPrice: 999,   originalPrice: 1299,  unit: '1 pc',  brandId: samsung.id,  categoryId: accessories.id, storeId: STORE_ID } }),
  ]);

  console.log('Products done: 45');
  console.log('\n✅ Electronics seed complete!');
  console.log(`Store: ${store.name} | Domain: ${store.domain}`);
}

main()
  .catch(e => { console.error('Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
