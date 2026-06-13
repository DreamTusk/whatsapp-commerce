import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// TODO: Change this to the Tea Bench store domain once the store is created
const STORE_DOMAIN = 'tea-bench.localhost';

// ── BlockNote helpers ──────────────────────────────────────────────────────
let _bid = 1;
const uid = () => `tb${_bid++}`;
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

// ── Main ───────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const store = await prisma.store.findUnique({ where: { domain: STORE_DOMAIN } });
  if (!store) {
    console.error(`Store "${STORE_DOMAIN}" not found. Create the store first then run this seed.`);
    process.exit(1);
  }
  const STORE_ID = store.id;
  console.log(`Found store: ${store.name} (${STORE_ID})`);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  console.log('Cleaning up existing data…');
  await prisma.collectionProduct.deleteMany({ where: { Collection: { storeId: STORE_ID } } });
  await prisma.cartItem.deleteMany({ where: { storeId: STORE_ID } });
  await prisma.wishlistItem.deleteMany({ where: { storeId: STORE_ID } });
  await prisma.orderItem.deleteMany({ where: { Order: { storeId: STORE_ID } } });
  await prisma.productMedia.deleteMany({ where: { Product: { storeId: STORE_ID } } });
  await prisma.product.deleteMany({ where: { storeId: STORE_ID } });
  await prisma.media.deleteMany({ where: { storeId: STORE_ID } });
  await prisma.category.deleteMany({ where: { storeId: STORE_ID } });
  console.log('Cleanup done.');

  // ── Categories ────────────────────────────────────────────────────────────
  console.log('Creating categories…');
  const [tea, coffee, snacks, iceCream] = await Promise.all([
    prisma.category.create({ data: { name: 'Tea',       storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Coffee',    storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Snacks',    storeId: STORE_ID } }),
    prisma.category.create({ data: { name: 'Ice Cream', storeId: STORE_ID } }),
  ]);
  console.log('Categories done: 4');

  // ── Tea ───────────────────────────────────────────────────────────────────
  console.log('Creating tea products…');
  await Promise.all([

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: tea.id,
      name: 'Masala Chai', unit: '1 cup', sellingPrice: 30, originalPrice: 35,
      inStock: true, isActive: true,
      description: desc(
        'Our signature masala chai — a bold blend of black tea brewed with a secret spice mix.',
        'Freshly brewed strong CTC tea with whole spices',
        'Hand-ground masala: cardamom, ginger, cinnamon, cloves, pepper',
        'Made with full-cream milk for a rich, creamy texture',
        'Sweetness adjustable — just ask for less sugar or sugar-free',
        'Best paired with our Khari Biscuit or Samosa',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: tea.id,
      name: 'Ginger Tea', unit: '1 cup', sellingPrice: 30, originalPrice: 35,
      inStock: true, isActive: true,
      description: desc(
        'Strong, warming ginger tea made with freshly crushed ginger and good-quality black tea.',
        'Made with fresh ginger — not ginger powder',
        'A natural remedy for sore throat and cold weather',
        'Brewed to order for maximum freshness',
        'Available with or without milk',
        'Light on sugar — add more on request',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: tea.id,
      name: 'Cardamom Tea', unit: '1 cup', sellingPrice: 35,
      inStock: true, isActive: true,
      description: desc(
        'Delicate black tea infused with freshly crushed green cardamom — fragrant and soothing.',
        'Whole green cardamom pods freshly crushed per cup',
        'Lighter on spice compared to masala chai — mild and aromatic',
        'Full-cream milk with medium strength brew',
        'A popular evening chai choice',
        'Perfect with our Banana Chips',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: tea.id,
      name: 'Adrak Elaichi Chai', unit: '1 cup', sellingPrice: 35,
      inStock: true, isActive: true,
      description: desc(
        'The best of both worlds — ginger and cardamom together in a perfectly balanced cup.',
        'Double-infused with fresh ginger and crushed cardamom',
        'Medium-strong brew with creamy full-fat milk',
        'Naturally warming and fragrant',
        'A fan favourite at Tea Bench since day one',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: tea.id,
      name: 'Green Tea', unit: '1 cup', sellingPrice: 40, originalPrice: 45,
      inStock: true, isActive: true,
      description: desc(
        'Light and refreshing green tea — steeped at the right temperature for the perfect cup.',
        'Premium loose-leaf green tea, not tea bags',
        'Steeped at 80°C to avoid bitterness',
        'Rich in antioxidants and naturally low in caffeine',
        'Served plain or with a squeeze of lemon and honey',
        'Ideal for health-conscious customers',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: tea.id,
      name: 'Lemon Tea', unit: '1 cup', sellingPrice: 35,
      inStock: true, isActive: true,
      description: desc(
        'Refreshing black tea with a squeeze of fresh lemon — light, tangy, and revitalising.',
        'Brewed strong black tea served hot or cold',
        'Fresh lemon squeezed to order',
        'Served without milk — add honey for a soothing variation',
        'Great for digestion and immunity',
        'Can be served iced on request',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: tea.id,
      name: 'Tulsi Tea', unit: '1 cup', sellingPrice: 40,
      inStock: true, isActive: true,
      description: desc(
        'Herbal tulsi (holy basil) tea — a traditional Ayurvedic cup known for its calming properties.',
        'Fresh tulsi leaves steeped with black tea',
        'Naturally aromatic and earthy in flavour',
        'Known to relieve stress and support immunity',
        'Served with or without milk and sugar',
        'Caffeine-light compared to regular chai',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: tea.id,
      name: 'Cutting Chai', unit: '1 cutting glass', sellingPrice: 20, originalPrice: 25,
      inStock: true, isActive: true,
      description: desc(
        'Mumbai-style cutting chai — a half-glass of strong, milky tea served piping hot.',
        'Half portion of full masala chai — stronger and more concentrated',
        'Served in a traditional cutting glass',
        'Perfect when you want a quick pick-me-up',
        'Classic street-style brew — sweet, milky, and bold',
        'Best enjoyed with Khari Biscuit',
      ),
    }}),

  ]);
  console.log('Tea products done: 8');

  // ── Coffee ────────────────────────────────────────────────────────────────
  console.log('Creating coffee products…');
  await Promise.all([

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: coffee.id,
      name: 'Filter Coffee', unit: '1 cup', sellingPrice: 60, originalPrice: 70,
      inStock: true, isActive: true,
      description: desc(
        'Authentic South Indian filter coffee — slow-dripped decoction served with frothy hot milk.',
        'Traditional brass filter used for slow decoction brewing',
        'Blend of Arabica and Robusta coffee beans, freshly ground',
        'Frothy milk added with the classic pour-over technique',
        'Medium roast — bold flavour with mild bitterness',
        'Served in a traditional dabarah-tumbler set',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: coffee.id,
      name: 'Espresso', unit: '1 shot', sellingPrice: 80,
      inStock: true, isActive: true,
      description: desc(
        'A concentrated shot of freshly pulled espresso — intense, rich, and aromatic.',
        'Double shot pulled on a commercial espresso machine',
        'Medium-dark roast blend for a balanced crema',
        'Served in a small ceramic cup at the right temperature',
        'No milk — pure coffee experience',
        'Base for all our espresso-based drinks',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: coffee.id,
      name: 'Cappuccino', unit: '1 cup', sellingPrice: 120, originalPrice: 130,
      inStock: true, isActive: true,
      description: desc(
        'Classic Italian cappuccino — equal parts espresso, steamed milk, and velvety foam.',
        'Double shot espresso base',
        'Fresh full-cream milk steamed to microfoam perfection',
        'Equal thirds: espresso, steamed milk, foam',
        'Light dusting of cocoa powder on top',
        'Available hot or served as an iced cappuccino',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: coffee.id,
      name: 'Cafe Latte', unit: '1 cup', sellingPrice: 120, originalPrice: 130,
      inStock: true, isActive: true,
      description: desc(
        'Smooth and milky latte with a double shot of espresso and silky steamed milk.',
        'Double shot espresso topped with steamed full-cream milk',
        'More milk than a cappuccino — creamier and milder',
        'Light layer of microfoam on top',
        'Available in hot, iced, or as a latte art cup',
        'Add a flavour shot: vanilla, caramel, or hazelnut on request',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: coffee.id,
      name: 'Americano', unit: '1 cup', sellingPrice: 90,
      inStock: true, isActive: true,
      description: desc(
        'Espresso diluted with hot water — smooth, bold, and clean-tasting.',
        'Double shot espresso topped with hot water',
        'Similar strength to filter coffee but different flavour profile',
        'No milk — served black with sugar on the side',
        'Can be served iced as an Iced Americano',
        'Great for those who want coffee without the creaminess',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: coffee.id,
      name: 'Cold Coffee', unit: '1 glass', sellingPrice: 100, originalPrice: 120,
      inStock: true, isActive: true,
      description: desc(
        'Chilled blended cold coffee — sweet, creamy, and deeply satisfying.',
        'Double shot espresso blended with chilled full-cream milk and ice',
        'Lightly sweetened with sugar syrup — extra sweet on request',
        'Optional: add a scoop of vanilla ice cream for extra richness',
        'Served in a tall glass with a reusable straw',
        'A crowd favourite on hot days',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: coffee.id,
      name: 'Iced Latte', unit: '1 glass', sellingPrice: 130, originalPrice: 140,
      inStock: true, isActive: true,
      description: desc(
        'Espresso poured over ice and fresh cold milk — refreshing and bold.',
        'Double shot espresso poured over a glass of ice',
        'Cold full-cream milk added for a smooth finish',
        'Less sweet than cold coffee — coffee-forward flavour',
        'Add flavour syrups: vanilla, caramel, or hazelnut',
        'Served with a straw in a clear glass to show off the layers',
      ),
    }}),

  ]);
  console.log('Coffee products done: 7');

  // ── Snacks ────────────────────────────────────────────────────────────────
  console.log('Creating snack products…');
  await Promise.all([

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: snacks.id,
      name: 'Samosa', unit: '2 pieces', sellingPrice: 30, originalPrice: 40,
      inStock: true, isActive: true,
      description: desc(
        'Crispy golden samosas filled with spiced potato and peas — the perfect chai companion.',
        'Hand-folded pastry with a flaky, crispy outer shell',
        'Filling: spiced mashed potatoes, green peas, and herbs',
        'Fried fresh every hour throughout the day',
        'Served with green chutney and tamarind chutney',
        'Vegetarian — contains gluten',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: snacks.id,
      name: 'Veg Puff', unit: '1 piece', sellingPrice: 25, originalPrice: 30,
      inStock: true, isActive: true,
      description: desc(
        'Flaky puff pastry baked to golden perfection with a spiced vegetable filling.',
        'Layers of buttery puff pastry baked fresh every morning',
        'Filling: mixed vegetables with onion, pepper, and mild spices',
        'Lighter than fried snacks — baked, not fried',
        'Best enjoyed warm with a cup of masala chai',
        'Vegetarian — contains gluten and dairy',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: snacks.id,
      name: 'Bread Pakoda', unit: '2 pieces', sellingPrice: 40, originalPrice: 50,
      inStock: true, isActive: true,
      description: desc(
        'Thick slices of bread stuffed with spiced potato, dipped in besan batter, and deep fried.',
        'White bread stuffed with spiced mashed potato filling',
        'Dipped in seasoned gram flour (besan) batter',
        'Deep fried until golden and crispy on all sides',
        'Served hot with green chutney and ketchup',
        'A classic North Indian street snack',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: snacks.id,
      name: 'Khari Biscuit', unit: '4 pieces', sellingPrice: 20,
      inStock: true, isActive: true,
      description: desc(
        'Light, flaky puff pastry biscuits — the classic dunking companion for any hot beverage.',
        'Made with layers of puffed pastry dough',
        'Lightly salted and buttery with a crispy snap',
        'Traditional chai-time snack in India',
        'Great for dunking in chai or coffee',
        'Baked fresh daily in small batches',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: snacks.id,
      name: 'Banana Chips', unit: '1 bowl (75g)', sellingPrice: 30, originalPrice: 35,
      inStock: true, isActive: true,
      description: desc(
        'Thin, crispy banana chips fried in coconut oil — a Kerala-style classic snack.',
        'Made from raw nendran bananas sliced paper-thin',
        'Fried in pure coconut oil for authentic flavour',
        'Lightly salted — available in masala and plain variants',
        'Crunchy texture that holds up well between bites',
        'Excellent with ginger tea or lemon tea',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: snacks.id,
      name: 'Vada Pav', unit: '1 piece', sellingPrice: 30, originalPrice: 35,
      inStock: true, isActive: true,
      description: desc(
        'Mumbai\'s iconic street food — spiced potato vada in a soft pav with chutneys.',
        'Deep-fried spiced potato ball (vada) in a besan batter',
        'Soft white pav bun toasted with butter',
        'Served with dry garlic chutney, green chutney, and fried chilli',
        'A complete snack — pairs well with cutting chai',
        'Vegetarian — contains gluten',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: snacks.id,
      name: 'Cheese Toast', unit: '2 slices', sellingPrice: 60, originalPrice: 70,
      inStock: true, isActive: true,
      description: desc(
        'Toasted bread loaded with melted processed cheese and a touch of herbs.',
        'Thick-cut white bread toasted in a sandwich press',
        'Generous layer of processed cheese melted until bubbly',
        'Sprinkled with oregano and chilli flakes',
        'Crispy edges, gooey centre',
        'Best paired with a hot cappuccino or cold coffee',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: snacks.id,
      name: 'Onion Pakoda', unit: '1 plate', sellingPrice: 50, originalPrice: 60,
      inStock: true, isActive: true,
      description: desc(
        'Crispy onion fritters made with thinly sliced onions, green chillies, and spiced gram flour batter.',
        'Thin-sliced onion rings coated in seasoned besan batter',
        'Green chillies, curry leaves, and coriander in every bite',
        'Fried to a deep golden-brown crunch',
        'Served with tomato ketchup and green chutney',
        'The best rainy-day snack with a hot masala chai',
      ),
    }}),

  ]);
  console.log('Snack products done: 8');

  // ── Ice Cream ─────────────────────────────────────────────────────────────
  console.log('Creating ice cream products…');
  await Promise.all([

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: iceCream.id,
      name: 'Vanilla Scoop', unit: '1 scoop', sellingPrice: 60, originalPrice: 70,
      inStock: true, isActive: true,
      description: desc(
        'Classic creamy vanilla ice cream — made with real vanilla bean extract.',
        'Rich, full-fat milk base churned to a smooth, dense texture',
        'Real vanilla bean extract — no artificial flavouring',
        'Served in a waffle cone or cup of your choice',
        'Top with chocolate sauce, caramel, or sprinkles (add-ons available)',
        'A timeless choice for all ages',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: iceCream.id,
      name: 'Chocolate Scoop', unit: '1 scoop', sellingPrice: 60, originalPrice: 70,
      inStock: true, isActive: true,
      description: desc(
        'Dark, rich chocolate ice cream for the true chocolate lover.',
        'Made with premium cocoa powder and dark chocolate chips',
        'Dense, fudgy texture with intense chocolate flavour',
        'Served in a waffle cone or cup',
        'Pairs perfectly with a scoop of vanilla for a classic duo',
        'Top with hot fudge sauce on request',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: iceCream.id,
      name: 'Mango Scoop', unit: '1 scoop', sellingPrice: 70,
      inStock: true, isActive: true,
      description: desc(
        'Real Alphonso mango ice cream — bursting with the flavour of India\'s finest mangoes.',
        'Made with Alphonso mango pulp — the king of mangoes',
        'Available seasonally with maximum freshness',
        'Naturally sweet with a fruity, tropical aroma',
        'No artificial mango flavouring or colour',
        'Best enjoyed in a cup to savour every drop',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: iceCream.id,
      name: 'Strawberry Scoop', unit: '1 scoop', sellingPrice: 70,
      inStock: true, isActive: true,
      description: desc(
        'Fresh strawberry ice cream made with real strawberry pieces and natural flavour.',
        'Real strawberry pieces folded into a smooth cream base',
        'Natural pink colour — no added food colouring',
        'Balanced sweet-tart flavour with fresh fruit notes',
        'Served in a waffle cone or cup',
        'Great paired with a chocolate scoop',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: iceCream.id,
      name: 'Kulfi', unit: '1 stick', sellingPrice: 50, originalPrice: 60,
      inStock: true, isActive: true,
      description: desc(
        'Traditional Indian kulfi — dense, creamy, and slow-frozen on a stick.',
        'Made by slowly reducing full-cream milk to a thick, concentrated base',
        'Flavoured with cardamom, saffron, and crushed pistachios',
        'Denser and richer than regular ice cream — a proper Indian treat',
        'Served on a wooden stick',
        'Available in malai, kesar-pista, and rose flavours',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: iceCream.id,
      name: 'Mixed Fruit Sundae', unit: '1 serving', sellingPrice: 120, originalPrice: 140,
      inStock: true, isActive: true,
      description: desc(
        'A loaded fruit sundae with two scoops of ice cream, fresh fruit, and toppings.',
        'Two scoops of your choice: vanilla, chocolate, or strawberry',
        'Fresh seasonal fruit: banana, mango, kiwi, strawberry',
        'Topped with chocolate sauce, caramel drizzle, and rainbow sprinkles',
        'Served in a tall sundae glass with a long spoon',
        'A full dessert experience — great for sharing',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: iceCream.id,
      name: 'Chocolate Sundae', unit: '1 serving', sellingPrice: 130, originalPrice: 150,
      inStock: true, isActive: true,
      description: desc(
        'Decadent chocolate sundae with hot fudge, whipped cream, and a cherry on top.',
        'Two scoops of chocolate ice cream in a sundae glass',
        'Poured with warm hot fudge sauce',
        'Topped with fresh whipped cream rosette',
        'Finished with chocolate chips and a cocktail cherry',
        'Pure indulgence — a chocoholic\'s dream dessert',
      ),
    }}),

    prisma.product.create({ data: {
      storeId: STORE_ID, categoryId: iceCream.id,
      name: 'Ice Cream Sandwich', unit: '1 piece', sellingPrice: 80, originalPrice: 90,
      inStock: true, isActive: true,
      description: desc(
        'A scoop of ice cream pressed between two freshly baked cookies — the ultimate handheld treat.',
        'One scoop of vanilla or chocolate ice cream',
        'Pressed between two soft, chewy chocolate chip cookies',
        'Cookies baked fresh in-house every morning',
        'Served immediately — eat fast before it melts!',
        'A playful twist on a classic dessert',
      ),
    }}),

  ]);
  console.log('Ice cream products done: 8');

  console.log('\n✓ Tea Bench seed complete!');
  console.log(`  Store: ${store.name} | Domain: ${store.domain}`);
  console.log(`  Categories: Tea (8), Coffee (7), Snacks (8), Ice Cream (8) — 31 products total`);
  console.log('\nNext steps:');
  console.log('  1. Add product images via the store-admin dashboard');
  console.log('  2. Set min_order_amount and delivery_radius in Store settings');
  console.log('  3. Add /etc/hosts entry: 127.0.0.1   teabench.localhost');
}

main()
  .catch((e) => {
    console.error('Error seeding Tea Bench:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
