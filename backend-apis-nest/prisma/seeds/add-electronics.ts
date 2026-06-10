import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const STORE_DOMAIN = 'ahrefs.localhost';

// ── BlockNote helpers ──────────────────────────────────────────────────────
let _bid = 1;
const uid = () => `e${_bid++}`;
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

// ── Product image map (R2 URLs from live DB) ──────────────────────────────
const PROD_IMGS: Record<string, { key: string; url: string; thumbnailKey: string; thumbnailUrl: string; mimeType: string; size: number; originalName: string }> = {
  'iPhone 15':                       { key: 'cmq7qp6zn000710uzh7z07jmb/products/b5f01654-bd83-4b22-b30d-bc450ead5a8f.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/b5f01654-bd83-4b22-b30d-bc450ead5a8f.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/b5f01654-bd83-4b22-b30d-bc450ead5a8f.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/b5f01654-bd83-4b22-b30d-bc450ead5a8f.jpg',  mimeType: 'image/jpeg', size: 13256,  originalName: 'iPhone 15.jpeg' },
  'iPhone 14':                       { key: 'cmq7qp6zn000710uzh7z07jmb/products/5f087c3d-0397-4787-bc1c-281b22b54990.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/5f087c3d-0397-4787-bc1c-281b22b54990.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/5f087c3d-0397-4787-bc1c-281b22b54990.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/5f087c3d-0397-4787-bc1c-281b22b54990.jpg',  mimeType: 'image/jpeg', size: 12409,  originalName: 'iPhone 14.jpeg' },
  'Samsung Galaxy S24':              { key: 'cmq7qp6zn000710uzh7z07jmb/products/65f60bf0-42ef-4fd9-8422-8475b88599fe.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/65f60bf0-42ef-4fd9-8422-8475b88599fe.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/65f60bf0-42ef-4fd9-8422-8475b88599fe.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/65f60bf0-42ef-4fd9-8422-8475b88599fe.jpg',  mimeType: 'image/jpeg', size: 12968,  originalName: 'Samsung Galaxy S24.jpeg' },
  'Samsung Galaxy A55':              { key: 'cmq7qp6zn000710uzh7z07jmb/products/8bcf46c5-8ea9-445e-8100-c590aaccb340.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/8bcf46c5-8ea9-445e-8100-c590aaccb340.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/8bcf46c5-8ea9-445e-8100-c590aaccb340.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/8bcf46c5-8ea9-445e-8100-c590aaccb340.jpg',  mimeType: 'image/jpeg', size: 99137,  originalName: 'Samsung Galaxy A55.jpg' },
  'OnePlus 12':                      { key: 'cmq7qp6zn000710uzh7z07jmb/products/ab10dc59-a4f1-4de9-8f9f-a1cda16691f9.png',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/ab10dc59-a4f1-4de9-8f9f-a1cda16691f9.png',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/ab10dc59-a4f1-4de9-8f9f-a1cda16691f9.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/ab10dc59-a4f1-4de9-8f9f-a1cda16691f9.jpg',  mimeType: 'image/png',  size: 142779, originalName: 'OnePlus 12.png' },
  'OnePlus Nord CE 4':               { key: 'cmq7qp6zn000710uzh7z07jmb/products/19fc39a7-6004-4504-b6c1-bd2a9ce6cdd6.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/19fc39a7-6004-4504-b6c1-bd2a9ce6cdd6.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/19fc39a7-6004-4504-b6c1-bd2a9ce6cdd6.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/19fc39a7-6004-4504-b6c1-bd2a9ce6cdd6.jpg',  mimeType: 'image/jpeg', size: 99849,  originalName: 'OnePlus Nord CE 4.jpg' },
  'Realme 13 Pro+':                  { key: 'cmq7qp6zn000710uzh7z07jmb/products/b943f28a-4bfb-4178-ab55-5c53009ae9b5.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/b943f28a-4bfb-4178-ab55-5c53009ae9b5.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/b943f28a-4bfb-4178-ab55-5c53009ae9b5.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/b943f28a-4bfb-4178-ab55-5c53009ae9b5.jpg',  mimeType: 'image/jpeg', size: 79026,  originalName: 'Realme 13 Pro+.jpg' },
  'Xiaomi 14':                       { key: 'cmq7qp6zn000710uzh7z07jmb/products/d3d3c66d-8021-4ede-8229-43233573d28b.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/d3d3c66d-8021-4ede-8229-43233573d28b.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/d3d3c66d-8021-4ede-8229-43233573d28b.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/d3d3c66d-8021-4ede-8229-43233573d28b.jpg',  mimeType: 'image/jpeg', size: 58864,  originalName: 'Xiaomi 14.jpg' },
  'MacBook Air M2':                  { key: 'cmq7qp6zn000710uzh7z07jmb/products/3d0630d6-7d46-4c52-8717-fb36c684f736.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/3d0630d6-7d46-4c52-8717-fb36c684f736.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/3d0630d6-7d46-4c52-8717-fb36c684f736.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/3d0630d6-7d46-4c52-8717-fb36c684f736.jpg',  mimeType: 'image/jpeg', size: 32075,  originalName: 'MacBook Air M2.jpeg' },
  'MacBook Pro 14" M3':              { key: 'cmq7qp6zn000710uzh7z07jmb/products/a62fb4f5-10fe-4c14-af81-637d51b7939e.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/a62fb4f5-10fe-4c14-af81-637d51b7939e.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/a62fb4f5-10fe-4c14-af81-637d51b7939e.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/a62fb4f5-10fe-4c14-af81-637d51b7939e.jpg',  mimeType: 'image/jpeg', size: 85144,  originalName: 'MacBook Pro 14" M3.jpg' },
  'Dell XPS 15':                     { key: 'cmq7qp6zn000710uzh7z07jmb/products/a1f18ab8-8da9-4b5f-8dbd-d67323ee0539.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/a1f18ab8-8da9-4b5f-8dbd-d67323ee0539.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/a1f18ab8-8da9-4b5f-8dbd-d67323ee0539.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/a1f18ab8-8da9-4b5f-8dbd-d67323ee0539.jpg',  mimeType: 'image/jpeg', size: 48424,  originalName: 'Dell XPS 15.jpg' },
  'HP Pavilion 15':                  { key: 'cmq7qp6zn000710uzh7z07jmb/products/44942fa9-b6e0-4695-b3a0-4f4984b52c70.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/44942fa9-b6e0-4695-b3a0-4f4984b52c70.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/44942fa9-b6e0-4695-b3a0-4f4984b52c70.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/44942fa9-b6e0-4695-b3a0-4f4984b52c70.jpg',  mimeType: 'image/jpeg', size: 85186,  originalName: 'HP Pavilion 15.jpg' },
  'Lenovo IdeaPad Slim 5':           { key: 'cmq7qp6zn000710uzh7z07jmb/products/4c87c60b-db3a-46b4-aebf-5d69993b7fa7.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/4c87c60b-db3a-46b4-aebf-5d69993b7fa7.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/4c87c60b-db3a-46b4-aebf-5d69993b7fa7.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/4c87c60b-db3a-46b4-aebf-5d69993b7fa7.jpg',  mimeType: 'image/jpeg', size: 89394,  originalName: 'Lenovo IdeaPad Slim 5.jpg' },
  'Asus VivoBook 15':                { key: 'cmq7qp6zn000710uzh7z07jmb/products/540f9867-7e09-48ce-a5a7-7f1fbd0c3b78.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/540f9867-7e09-48ce-a5a7-7f1fbd0c3b78.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/540f9867-7e09-48ce-a5a7-7f1fbd0c3b78.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/540f9867-7e09-48ce-a5a7-7f1fbd0c3b78.jpg',  mimeType: 'image/jpeg', size: 60278,  originalName: 'Asus VivoBook 15.jpg' },
  'Samsung 55" QLED 4K Q70C':       { key: 'cmq7qp6zn000710uzh7z07jmb/products/3ff63560-59ca-441b-938e-225bf5ffba0f.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/3ff63560-59ca-441b-938e-225bf5ffba0f.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/3ff63560-59ca-441b-938e-225bf5ffba0f.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/3ff63560-59ca-441b-938e-225bf5ffba0f.jpg',  mimeType: 'image/jpeg', size: 76505,  originalName: 'Samsung 55" QLED 4K Q70C.jpg' },
  'LG 55" OLED evo C3':             { key: 'cmq7qp6zn000710uzh7z07jmb/products/b4312d5c-ec26-48e5-9e73-71524318208f.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/b4312d5c-ec26-48e5-9e73-71524318208f.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/b4312d5c-ec26-48e5-9e73-71524318208f.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/b4312d5c-ec26-48e5-9e73-71524318208f.jpg',  mimeType: 'image/jpeg', size: 44933,  originalName: 'LG 55" OLED evo C3.jpeg' },
  'Sony Bravia 43" X75L 4K':        { key: 'cmq7qp6zn000710uzh7z07jmb/products/0d71ec81-a0d3-43c1-ab31-bf7444f1a268.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/0d71ec81-a0d3-43c1-ab31-bf7444f1a268.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/0d71ec81-a0d3-43c1-ab31-bf7444f1a268.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/0d71ec81-a0d3-43c1-ab31-bf7444f1a268.jpg',  mimeType: 'image/jpeg', size: 89006,  originalName: 'Sony Bravia 43" X75L 4K.jpg' },
  'Samsung 43" Crystal 4K CU7700':  { key: 'cmq7qp6zn000710uzh7z07jmb/products/a1872965-0651-46f9-93d9-5f953daec10e.avif', url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/a1872965-0651-46f9-93d9-5f953daec10e.avif', thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/a1872965-0651-46f9-93d9-5f953daec10e.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/a1872965-0651-46f9-93d9-5f953daec10e.jpg',  mimeType: 'image/avif', size: 54540,  originalName: 'Samsung 43" Crystal 4K CU7700.avif' },
  'Sony WH-1000XM5':                { key: 'cmq7qp6zn000710uzh7z07jmb/products/cb00edf6-a9bb-46a3-9128-6fd6c5d0c90e.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/cb00edf6-a9bb-46a3-9128-6fd6c5d0c90e.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/cb00edf6-a9bb-46a3-9128-6fd6c5d0c90e.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/cb00edf6-a9bb-46a3-9128-6fd6c5d0c90e.jpg',  mimeType: 'image/jpeg', size: 27769,  originalName: 'Sony WH-1000XM5.jpg' },
  'Apple AirPods Pro 2nd Gen':       { key: 'cmq7qp6zn000710uzh7z07jmb/products/aa60fb25-ab1c-460c-bc79-fed5540e1f11.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/aa60fb25-ab1c-460c-bc79-fed5540e1f11.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/aa60fb25-ab1c-460c-bc79-fed5540e1f11.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/aa60fb25-ab1c-460c-bc79-fed5540e1f11.jpg',  mimeType: 'image/jpeg', size: 12056,  originalName: 'Apple AirPods Pro 2nd Gen.jpeg' },
  'JBL Charge 5':                    { key: 'cmq7qp6zn000710uzh7z07jmb/products/11848598-ef66-4f4d-9cd8-edb95497e6fe.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/11848598-ef66-4f4d-9cd8-edb95497e6fe.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/11848598-ef66-4f4d-9cd8-edb95497e6fe.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/11848598-ef66-4f4d-9cd8-edb95497e6fe.jpg',  mimeType: 'image/jpeg', size: 87431,  originalName: 'JBL Charge 5.jpg' },
  'JBL Flip 6':                      { key: 'cmq7qp6zn000710uzh7z07jmb/products/fbc38f6e-a6be-4f91-99ab-afb21405539d.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/fbc38f6e-a6be-4f91-99ab-afb21405539d.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/fbc38f6e-a6be-4f91-99ab-afb21405539d.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/fbc38f6e-a6be-4f91-99ab-afb21405539d.jpg',  mimeType: 'image/jpeg', size: 161043, originalName: 'JBL Flip 6.jpg' },
  'boAt Airdopes 141':               { key: 'cmq7qp6zn000710uzh7z07jmb/products/ec3f07a6-4bc8-40cc-a1ca-db4aac10574f.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/ec3f07a6-4bc8-40cc-a1ca-db4aac10574f.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/ec3f07a6-4bc8-40cc-a1ca-db4aac10574f.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/ec3f07a6-4bc8-40cc-a1ca-db4aac10574f.jpg',  mimeType: 'image/jpeg', size: 23502,  originalName: 'boAt Airdopes 141.jpeg' },
  'boAt Rockerz 550':                { key: 'cmq7qp6zn000710uzh7z07jmb/products/5e1aa303-48e3-4763-9df6-e7908ca14b3a.webp', url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/5e1aa303-48e3-4763-9df6-e7908ca14b3a.webp', thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/5e1aa303-48e3-4763-9df6-e7908ca14b3a.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/5e1aa303-48e3-4763-9df6-e7908ca14b3a.jpg',  mimeType: 'image/webp', size: 36564,  originalName: 'boAt Rockerz 550.webp' },
  'Canon EOS R50':                   { key: 'cmq7qp6zn000710uzh7z07jmb/products/45afe0d0-7c74-4e75-997a-b8b9f73109c8.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/45afe0d0-7c74-4e75-997a-b8b9f73109c8.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/45afe0d0-7c74-4e75-997a-b8b9f73109c8.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/45afe0d0-7c74-4e75-997a-b8b9f73109c8.jpg',  mimeType: 'image/jpeg', size: 73953,  originalName: 'Canon EOS R50.jpg' },
  'Nikon Z30':                       { key: 'cmq7qp6zn000710uzh7z07jmb/products/1c4dd09d-ffab-4a1c-af95-62766d3718dd.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/1c4dd09d-ffab-4a1c-af95-62766d3718dd.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/1c4dd09d-ffab-4a1c-af95-62766d3718dd.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/1c4dd09d-ffab-4a1c-af95-62766d3718dd.jpg',  mimeType: 'image/jpeg', size: 9462,   originalName: 'Nikon Z30.jpeg' },
  'Sony ZV-E10 II':                  { key: 'cmq7qp6zn000710uzh7z07jmb/products/34bdd6b0-c984-4d9e-849c-3a3c1c7d4d07.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/34bdd6b0-c984-4d9e-849c-3a3c1c7d4d07.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/34bdd6b0-c984-4d9e-849c-3a3c1c7d4d07.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/34bdd6b0-c984-4d9e-849c-3a3c1c7d4d07.jpg',  mimeType: 'image/jpeg', size: 16142,  originalName: 'Sony ZV-E10 II.jpeg' },
  'Sony PlayStation 5 Slim':         { key: 'cmq7qp6zn000710uzh7z07jmb/products/aa6a652a-db66-4610-a69f-265306586b44.webp', url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/aa6a652a-db66-4610-a69f-265306586b44.webp', thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/aa6a652a-db66-4610-a69f-265306586b44.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/aa6a652a-db66-4610-a69f-265306586b44.jpg',  mimeType: 'image/webp', size: 13498,  originalName: 'Sony PlayStation 5 Slim.webp' },
  'Logitech G502 X Gaming Mouse':    { key: 'cmq7qp6zn000710uzh7z07jmb/products/19658d52-77b9-415a-9410-d5854f67c22a.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/19658d52-77b9-415a-9410-d5854f67c22a.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/19658d52-77b9-415a-9410-d5854f67c22a.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/19658d52-77b9-415a-9410-d5854f67c22a.jpg',  mimeType: 'image/jpeg', size: 81161,  originalName: 'Logitech G502 X Gaming Mouse.jpg' },
  'Logitech G435 Wireless Gaming Headset': { key: 'cmq7qp6zn000710uzh7z07jmb/products/cd8d5121-b25f-41e6-a22a-3dfd908fe061.jpg', url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/cd8d5121-b25f-41e6-a22a-3dfd908fe061.jpg', thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/cd8d5121-b25f-41e6-a22a-3dfd908fe061.jpg', thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/cd8d5121-b25f-41e6-a22a-3dfd908fe061.jpg', mimeType: 'image/jpeg', size: 227349, originalName: 'Logitech G435 Wireless Gaming Headset.jpg' },
  'Google Nest Mini 2nd Gen':        { key: 'cmq7qp6zn000710uzh7z07jmb/products/451e16be-a0cf-48f1-8bc1-ea698df32b4d.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/451e16be-a0cf-48f1-8bc1-ea698df32b4d.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/451e16be-a0cf-48f1-8bc1-ea698df32b4d.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/451e16be-a0cf-48f1-8bc1-ea698df32b4d.jpg',  mimeType: 'image/jpeg', size: 94882,  originalName: 'Google Nest Mini 2nd Gen.jpg' },
  'Xiaomi Smart Band 8 Pro':         { key: 'cmq7qp6zn000710uzh7z07jmb/products/3685432f-1236-4638-b302-d8940bec9a3f.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/3685432f-1236-4638-b302-d8940bec9a3f.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/3685432f-1236-4638-b302-d8940bec9a3f.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/3685432f-1236-4638-b302-d8940bec9a3f.jpg',  mimeType: 'image/jpeg', size: 154202, originalName: 'Xiaomi Smart Band 8 Pro.jpg' },
  'Google Chromecast with Google TV 4K': { key: 'cmq7qp6zn000710uzh7z07jmb/products/911612ff-c6a0-41c9-8eef-1ef44bf56638.webp', url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/911612ff-c6a0-41c9-8eef-1ef44bf56638.webp', thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/911612ff-c6a0-41c9-8eef-1ef44bf56638.jpg', thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/911612ff-c6a0-41c9-8eef-1ef44bf56638.jpg', mimeType: 'image/webp', size: 12546, originalName: 'Google Chromecast with Google TV 4K.webp' },
  'Samsung 45W USB-C Charger':       { key: 'cmq7qp6zn000710uzh7z07jmb/products/4f579677-6b4f-4c91-94cb-d61556ab92d9.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/4f579677-6b4f-4c91-94cb-d61556ab92d9.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/4f579677-6b4f-4c91-94cb-d61556ab92d9.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/4f579677-6b4f-4c91-94cb-d61556ab92d9.jpg',  mimeType: 'image/jpeg', size: 40827,  originalName: 'Samsung 45W USB-C Charger.jpg' },
  'WD 1TB My Passport Portable HDD': { key: 'cmq7qp6zn000710uzh7z07jmb/products/125f9bc1-7b43-457c-9b91-14fa8fad30e6.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/125f9bc1-7b43-457c-9b91-14fa8fad30e6.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/125f9bc1-7b43-457c-9b91-14fa8fad30e6.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/125f9bc1-7b43-457c-9b91-14fa8fad30e6.jpg',  mimeType: 'image/jpeg', size: 16275,  originalName: 'WD 1TB My Passport Portable HDD.jpeg' },
  'Seagate 2TB Expansion Portable HDD': { key: 'cmq7qp6zn000710uzh7z07jmb/products/2fb60449-98da-4398-948a-dbaeddc9ac2f.webp', url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/2fb60449-98da-4398-948a-dbaeddc9ac2f.webp', thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/2fb60449-98da-4398-948a-dbaeddc9ac2f.jpg', thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/2fb60449-98da-4398-948a-dbaeddc9ac2f.jpg', mimeType: 'image/webp', size: 18288, originalName: 'Seagate 2TB Expansion Portable HDD.webp' },
  'Logitech MX Master 3S Mouse':     { key: 'cmq7qp6zn000710uzh7z07jmb/products/20e1ca8c-3fbc-4a8a-bff1-a7249bfb9eb7.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/20e1ca8c-3fbc-4a8a-bff1-a7249bfb9eb7.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/20e1ca8c-3fbc-4a8a-bff1-a7249bfb9eb7.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/20e1ca8c-3fbc-4a8a-bff1-a7249bfb9eb7.jpg',  mimeType: 'image/jpeg', size: 35727,  originalName: 'Logitech MX Master 3S Mouse.jpg' },
  'Samsung 128GB Pro Plus MicroSD':  { key: 'cmq7qp6zn000710uzh7z07jmb/products/345a8059-bb20-49f5-b16f-6001dd4b5f17.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/345a8059-bb20-49f5-b16f-6001dd4b5f17.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/345a8059-bb20-49f5-b16f-6001dd4b5f17.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/345a8059-bb20-49f5-b16f-6001dd4b5f17.jpg',  mimeType: 'image/jpeg', size: 22056,  originalName: 'Samsung 128GB Pro Plus MicroSD.jpeg' },
  'iPad Air M2 11"':                 { key: 'cmq7qp6zn000710uzh7z07jmb/products/195f91d9-71e0-4710-9785-dc973696fa68.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/195f91d9-71e0-4710-9785-dc973696fa68.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/195f91d9-71e0-4710-9785-dc973696fa68.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/195f91d9-71e0-4710-9785-dc973696fa68.jpg',  mimeType: 'image/jpeg', size: 21357,  originalName: 'iPad Air M2 11".jpeg' },
  'Samsung Galaxy Tab S9 FE':        { key: 'cmq7qp6zn000710uzh7z07jmb/products/114394ca-062f-4d65-b90b-03ff6ddbe90c.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/114394ca-062f-4d65-b90b-03ff6ddbe90c.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/114394ca-062f-4d65-b90b-03ff6ddbe90c.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/114394ca-062f-4d65-b90b-03ff6ddbe90c.jpg',  mimeType: 'image/jpeg', size: 53079,  originalName: 'Samsung Galaxy Tab S9 FE.jpg' },
  'Xiaomi Pad 6':                    { key: 'cmq7qp6zn000710uzh7z07jmb/products/e3544b6c-0ead-4735-b2c4-cf0a0cd6450a.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/e3544b6c-0ead-4735-b2c4-cf0a0cd6450a.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/e3544b6c-0ead-4735-b2c4-cf0a0cd6450a.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/e3544b6c-0ead-4735-b2c4-cf0a0cd6450a.jpg',  mimeType: 'image/jpeg', size: 171326, originalName: 'Xiaomi Pad 6.jpg' },
  'Apple Watch Series 9 GPS 45mm':   { key: 'cmq7qp6zn000710uzh7z07jmb/products/64cc7023-290d-48c4-8b36-c2bff6b39c82.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/64cc7023-290d-48c4-8b36-c2bff6b39c82.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/64cc7023-290d-48c4-8b36-c2bff6b39c82.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/64cc7023-290d-48c4-8b36-c2bff6b39c82.jpg',  mimeType: 'image/jpeg', size: 53108,  originalName: 'Apple Watch Series 9 GPS 45mm.jpg' },
  'Samsung Galaxy Watch 6 Classic 47mm': { key: 'cmq7qp6zn000710uzh7z07jmb/products/0a78c182-fc39-4537-a2ea-864995c3ccd6.jpg', url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/0a78c182-fc39-4537-a2ea-864995c3ccd6.jpg', thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/0a78c182-fc39-4537-a2ea-864995c3ccd6.jpg', thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/0a78c182-fc39-4537-a2ea-864995c3ccd6.jpg', mimeType: 'image/jpeg', size: 76285, originalName: 'Samsung Galaxy Watch 6 Classic 47mm.jpg' },
  'Noise ColorFit Pro 5':            { key: 'cmq7qp6zn000710uzh7z07jmb/products/9bd4f612-0177-475a-9f9f-08ec930760f3.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/9bd4f612-0177-475a-9f9f-08ec930760f3.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/9bd4f612-0177-475a-9f9f-08ec930760f3.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/9bd4f612-0177-475a-9f9f-08ec930760f3.jpg',  mimeType: 'image/jpeg', size: 109638, originalName: 'Noise ColorFit Pro 5.jpg' },
  'boAt Wave Flex Connect':          { key: 'cmq7qp6zn000710uzh7z07jmb/products/d6df6501-497a-4b24-9437-25e33c609406.jpg',  url: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/d6df6501-497a-4b24-9437-25e33c609406.jpg',  thumbnailKey: 'cmq7qp6zn000710uzh7z07jmb/products/thumbs/d6df6501-497a-4b24-9437-25e33c609406.jpg',  thumbnailUrl: 'https://pub-df15448cd5484b50be5ee5996a81f458.r2.dev/cmq7qp6zn000710uzh7z07jmb/products/thumbs/d6df6501-497a-4b24-9437-25e33c609406.jpg',  mimeType: 'image/jpeg', size: 45359,  originalName: 'boAt Wave Flex Connect.jpg' },
};

// ── Helper: create product + Media + ProductMedia ─────────────────────────
async function mkProduct(STORE_ID: string, OWNER_ID: string, data: any) {
  const product = await prisma.product.create({ data });
  const img = PROD_IMGS[data.name];
  if (img) {
    const media = await prisma.media.create({
      data: {
        storeId: STORE_ID, uploadedBy: OWNER_ID,
        key: img.key, bucket: 'PUBLIC' as any,
        url: img.url, thumbnailKey: img.thumbnailKey, thumbnailUrl: img.thumbnailUrl,
        mimeType: img.mimeType, size: img.size, originalName: img.originalName,
        entityType: 'PRODUCT' as any, entityId: product.id,
        status: 'ACTIVE' as any,
      },
    });
    await prisma.productMedia.create({
      data: { productId: product.id, mediaId: media.id, isPrimary: true, sortOrder: 0 },
    });
  }
  return product;
}

async function main(): Promise<void> {
  const store = await prisma.store.findUnique({ where: { domain: STORE_DOMAIN } });
  if (!store) {
    console.error(`Store "${STORE_DOMAIN}" not found. Create the store first.`);
    process.exit(1);
  }
  const STORE_ID = store.id;
  console.log(`Found store: ${store.name} (${STORE_ID})`);

  const ownerRecord = await prisma.userStore.findFirst({ where: { storeId: STORE_ID, role: 'OWNER' } });
  if (!ownerRecord) { console.error('No OWNER found for store.'); process.exit(1); }
  const OWNER_ID = ownerRecord.userId;

  // ── Cleanup ───────────────────────────────────────────────────────────────
  console.log('Cleaning up existing data…');
  await prisma.collectionProduct.deleteMany({ where: { collection: { storeId: STORE_ID } } });
  await prisma.cartItem.deleteMany({ where: { storeId: STORE_ID } });
  await prisma.wishlistItem.deleteMany({ where: { storeId: STORE_ID } });
  await prisma.orderItem.deleteMany({ where: { order: { storeId: STORE_ID } } });
  await prisma.productMedia.deleteMany({ where: { product: { storeId: STORE_ID } } });
  await prisma.product.deleteMany({ where: { storeId: STORE_ID } });
  await prisma.media.deleteMany({ where: { storeId: STORE_ID } });
  await prisma.category.deleteMany({ where: { storeId: STORE_ID } });
  await prisma.brand.deleteMany({ where: { storeId: STORE_ID } });
  console.log('Cleanup done.');

  // ── Brands ────────────────────────────────────────────────────────────────
  console.log('Creating brands…');
  const [apple, samsung, sony, lg, oneplus, xiaomi, realme, jbl, boat, asus,
         dell, hp, lenovo, canon, nikon, noise, logitech, wd, seagate, google] =
    await Promise.all([
      prisma.brand.create({ data: { name: 'Apple',     storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Samsung',   storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Sony',      storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'LG',        storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'OnePlus',   storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Xiaomi',    storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Realme',    storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'JBL',       storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'boAt',      storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Asus',      storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Dell',      storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'HP',        storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Lenovo',    storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Canon',     storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Nikon',     storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Noise',     storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Logitech',  storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'WD',        storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Seagate',   storeId: STORE_ID } }),
      prisma.brand.create({ data: { name: 'Google',    storeId: STORE_ID } }),
    ]);
  console.log('Brands done: 20');

  // ── Categories ────────────────────────────────────────────────────────────
  console.log('Creating categories…');
  const [smartphones, laptops, televisions, audio, cameras, gaming, smarthome, accessories, tablets, wearables] =
    await Promise.all([
      prisma.category.create({ data: { name: 'Smartphones',        storeId: STORE_ID } }),
      prisma.category.create({ data: { name: 'Laptops',            storeId: STORE_ID } }),
      prisma.category.create({ data: { name: 'Televisions',        storeId: STORE_ID } }),
      prisma.category.create({ data: { name: 'Audio & Headphones', storeId: STORE_ID } }),
      prisma.category.create({ data: { name: 'Cameras',            storeId: STORE_ID } }),
      prisma.category.create({ data: { name: 'Gaming',             storeId: STORE_ID } }),
      prisma.category.create({ data: { name: 'Smart Home',         storeId: STORE_ID } }),
      prisma.category.create({ data: { name: 'Accessories',        storeId: STORE_ID } }),
      prisma.category.create({ data: { name: 'Tablets',            storeId: STORE_ID } }),
      prisma.category.create({ data: { name: 'Wearables',          storeId: STORE_ID } }),
    ]);
  console.log('Categories done: 10');

  // ── Products ──────────────────────────────────────────────────────────────
  console.log('Creating products…');

  // Smartphones
  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: smartphones.id, brandId: apple.id,
    name: 'iPhone 15', unit: 'piece', sellingPrice: 79999, originalPrice: 84900,
    inStock: true, isActive: true,
    description: desc(
      'Apple iPhone 15 with Dynamic Island and USB-C connectivity.',
      '6.1-inch Super Retina XDR display with Dynamic Island',
      '48MP main camera with 2x Telephoto and 12MP Ultra Wide',
      'A16 Bionic chip — fastest chip ever in a smartphone',
      'USB-C with USB 3 speeds up to 10Gb/s',
      'All-day battery life with up to 20 hours video playback',
      'Available in Pink, Yellow, Green, Blue, and Black',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: smartphones.id, brandId: apple.id,
    name: 'iPhone 14', unit: 'piece', sellingPrice: 64999, originalPrice: 79900,
    inStock: true, isActive: true,
    description: desc(
      'Apple iPhone 14 with advanced dual-camera system and Crash Detection.',
      '6.1-inch Super Retina XDR display',
      '12MP main + 12MP Ultra Wide dual camera system',
      'A15 Bionic chip with 5-core GPU',
      'Emergency SOS via satellite and Crash Detection',
      'Up to 20 hours video playback',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: smartphones.id, brandId: samsung.id,
    name: 'Samsung Galaxy S24', unit: 'piece', sellingPrice: 74999, originalPrice: 79999,
    inStock: true, isActive: true,
    description: desc(
      'Samsung Galaxy S24 with Galaxy AI and Snapdragon 8 Gen 3.',
      '6.2-inch Dynamic AMOLED 2X display at 120Hz',
      '50MP main + 12MP ultra wide + 10MP 3x telephoto',
      'Snapdragon 8 Gen 3 Mobile Platform for Galaxy',
      'Galaxy AI features: Circle to Search, Live Translate, Chat Assist',
      '4000mAh battery with 25W wired fast charging',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: smartphones.id, brandId: samsung.id,
    name: 'Samsung Galaxy A55', unit: 'piece', sellingPrice: 38999, originalPrice: 42999,
    inStock: true, isActive: true,
    description: desc(
      'Samsung Galaxy A55 with premium design and pro-grade cameras.',
      '6.6-inch Super AMOLED display at 120Hz with Vision Booster',
      '50MP OIS main + 12MP ultra wide + 5MP macro triple camera',
      'Exynos 1480 processor with 8GB RAM',
      '5000mAh battery with 25W fast charging',
      'IP67 water and dust resistance',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: smartphones.id, brandId: oneplus.id,
    name: 'OnePlus 12', unit: 'piece', sellingPrice: 64999, originalPrice: 69999,
    inStock: true, isActive: true,
    description: desc(
      'OnePlus 12 with Hasselblad cameras and 100W SUPERVOOC charging.',
      '6.82-inch LTPO AMOLED display at 1-120Hz ProXDR',
      'Hasselblad triple camera: 50MP main + 48MP ultra wide + 64MP 3x periscope',
      'Snapdragon 8 Gen 3 processor with up to 16GB RAM',
      '5400mAh battery with 100W SUPERVOOC wired charging',
      '50W AIRVOOC wireless charging support',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: smartphones.id, brandId: oneplus.id,
    name: 'OnePlus Nord CE 4', unit: 'piece', sellingPrice: 24999, originalPrice: 27999,
    inStock: true, isActive: true,
    description: desc(
      'OnePlus Nord CE 4 — flagship performance at a mid-range price.',
      '6.7-inch AMOLED display at 120Hz',
      '50MP Sony IMX890 OIS main camera + 8MP ultra wide',
      'Snapdragon 7 Gen 3 with 8GB RAM',
      '5500mAh battery with 100W SUPERVOOC charging — full charge in 28 min',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: smartphones.id, brandId: xiaomi.id,
    name: 'Xiaomi 14', unit: 'piece', sellingPrice: 69999, originalPrice: 74999,
    inStock: true, isActive: true,
    description: desc(
      'Xiaomi 14 with Leica optics and Snapdragon 8 Gen 3.',
      '6.36-inch LTPO AMOLED display at 1-120Hz, 3000 nits peak brightness',
      'Leica triple camera: 50MP main + 50MP ultra wide + 50MP 3.2x telephoto',
      'Snapdragon 8 Gen 3 with up to 12GB LPDDR5X RAM',
      '4610mAh battery with 90W HyperCharge wired and 50W wireless',
      'IP68 dust and water resistance',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: smartphones.id, brandId: realme.id,
    name: 'Realme 13 Pro+', unit: 'piece', sellingPrice: 29999, originalPrice: 33999,
    inStock: true, isActive: true,
    description: desc(
      'Realme 13 Pro+ with Sony IMX890 and Sony IMX709 dual camera system.',
      '6.7-inch curved AMOLED display at 120Hz',
      'Sony IMX890 50MP OIS + Sony IMX709 50MP portrait + 8MP ultra wide',
      'Snapdragon 7s Gen 3 processor',
      '5200mAh battery with 80W SUPERVOOC fast charging',
    ),
  });

  // Laptops
  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: laptops.id, brandId: apple.id,
    name: 'MacBook Air M2', unit: 'piece', sellingPrice: 114900, originalPrice: 119900,
    inStock: true, isActive: true,
    description: desc(
      'MacBook Air with M2 chip — supercharged by Apple Silicon.',
      '13.6-inch Liquid Retina display with 500 nits brightness',
      'Apple M2 chip with 8-core CPU and up to 10-core GPU',
      'Up to 18 hours battery life',
      'MagSafe charging, two Thunderbolt ports, headphone jack',
      'Fanless design — completely silent operation',
      'Available in Midnight, Starlight, Space Grey, Silver',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: laptops.id, brandId: apple.id,
    name: 'MacBook Pro 14" M3', unit: 'piece', sellingPrice: 169900, originalPrice: 179900,
    inStock: true, isActive: true,
    description: desc(
      'MacBook Pro 14-inch with M3 chip for pro-level performance.',
      '14.2-inch Liquid Retina XDR display with ProMotion 120Hz',
      'Apple M3 with 8-core CPU and 10-core GPU',
      'Up to 22 hours battery life',
      'Three Thunderbolt 4 ports, HDMI, SD card slot, MagSafe 3',
      'Advanced camera and audio system with Spatial Audio',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: laptops.id, brandId: dell.id,
    name: 'Dell XPS 15', unit: 'piece', sellingPrice: 159990, originalPrice: 174990,
    inStock: true, isActive: true,
    description: desc(
      'Dell XPS 15 — professional powerhouse with OLED display.',
      '15.6-inch OLED 3.5K display at 120Hz with 100% DCI-P3',
      'Intel Core i7-13700H with NVIDIA RTX 4060 8GB',
      '16GB DDR5 RAM, 512GB NVMe SSD',
      'Thunderbolt 4, USB-C, SD card reader',
      'Up to 13 hours battery life',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: laptops.id, brandId: hp.id,
    name: 'HP Pavilion 15', unit: 'piece', sellingPrice: 72990, originalPrice: 79990,
    inStock: true, isActive: true,
    description: desc(
      'HP Pavilion 15 for everyday productivity and entertainment.',
      '15.6-inch FHD IPS micro-edge display at 250 nits',
      'Intel Core i5-1335U with Intel Iris Xe Graphics',
      '8GB DDR4 RAM, 512GB PCIe NVMe SSD',
      'HP Fast Charge — 50% charge in 45 minutes',
      'Backlit keyboard with fingerprint reader',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: laptops.id, brandId: lenovo.id,
    name: 'Lenovo IdeaPad Slim 5', unit: 'piece', sellingPrice: 65990, originalPrice: 72990,
    inStock: true, isActive: true,
    description: desc(
      'Lenovo IdeaPad Slim 5 — thin, light, and powerful for daily use.',
      '14-inch 2.8K OLED display with 90Hz and 100% DCI-P3',
      'AMD Ryzen 7 7730U processor with AMD Radeon Graphics',
      '16GB LPDDR4X RAM, 512GB SSD',
      'Up to 12 hours battery life',
      'Fingerprint reader and IR camera for Windows Hello',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: laptops.id, brandId: asus.id,
    name: 'Asus VivoBook 15', unit: 'piece', sellingPrice: 52990, originalPrice: 59990,
    inStock: true, isActive: true,
    description: desc(
      'Asus VivoBook 15 — versatile laptop for students and creators.',
      '15.6-inch FHD IPS display with 250 nits, anti-glare',
      'Intel Core i5-12500H processor',
      '8GB DDR4 RAM, 512GB PCIe SSD',
      'ASUS DialPad for creative shortcuts',
      'Weight: 1.7 kg with slim 17.9mm profile',
    ),
  });

  // Televisions
  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: televisions.id, brandId: samsung.id,
    name: 'Samsung 55" QLED 4K Q70C', unit: 'piece', sellingPrice: 89999, originalPrice: 109900,
    inStock: true, isActive: true,
    description: desc(
      'Samsung 55-inch QLED 4K smart TV with Quantum Dot technology.',
      'Quantum HDR+ with 4K upscaling and 100% Color Volume',
      'Object Tracking Sound for audio that follows the action',
      'Tizen OS with built-in Alexa, Google Assistant, Bixby',
      'Gaming Hub with 144Hz refresh rate support',
      'Slim One Connect Box — one cable to the TV',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: televisions.id, brandId: lg.id,
    name: 'LG 55" OLED evo C3', unit: 'piece', sellingPrice: 129999, originalPrice: 149990,
    inStock: true, isActive: true,
    description: desc(
      'LG OLED evo C3 — perfect blacks and infinite contrast for cinematic viewing.',
      'OLED evo panel with α9 AI Processor Gen6',
      'Dolby Vision IQ and Dolby Atmos support',
      '4x HDMI 2.1 ports supporting 4K 120Hz and VRR',
      'webOS 23 with ThinQ AI voice control',
      'FILMMAKER MODE for cinema-accurate picture',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: televisions.id, brandId: sony.id,
    name: 'Sony Bravia 43" X75L 4K', unit: 'piece', sellingPrice: 54999, originalPrice: 64990,
    inStock: true, isActive: true,
    description: desc(
      'Sony Bravia 43-inch 4K HDR smart TV with X-Reality PRO processing.',
      '43-inch 4K HDR display with TRILUMINOS PRO colour technology',
      'X-Reality PRO picture engine for sharp, detailed images',
      'Google TV with built-in Chromecast and Apple AirPlay',
      'Dolby Atmos and DTS:X audio support',
      'Motionflow XR for smooth action scenes',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: televisions.id, brandId: samsung.id,
    name: 'Samsung 43" Crystal 4K CU7700', unit: 'piece', sellingPrice: 44999, originalPrice: 54990,
    inStock: true, isActive: true,
    description: desc(
      'Samsung 43-inch Crystal 4K UHD smart TV for everyday entertainment.',
      'Dynamic Crystal Color with 4K UHD resolution',
      'PurColor for vivid, lifelike colour reproduction',
      'Tizen OS with Samsung Gaming Hub',
      'Auto Game Mode with 60Hz display',
      '3x HDMI, 2x USB ports',
    ),
  });

  // Audio & Headphones
  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: audio.id, brandId: sony.id,
    name: 'Sony WH-1000XM5', unit: 'piece', sellingPrice: 34990, originalPrice: 39990,
    inStock: true, isActive: true,
    description: desc(
      'Sony WH-1000XM5 — industry-leading noise cancelling wireless headphones.',
      '8 microphones with two processors for best-in-class noise cancellation',
      '30 hours battery life with quick charge (3 min = 3 hours)',
      'Multipoint connection — connect to two devices simultaneously',
      'Speak-to-Chat automatically pauses music when you talk',
      'Crystal-clear hands-free calling with 4 beamforming mics',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: audio.id, brandId: apple.id,
    name: 'Apple AirPods Pro 2nd Gen', unit: 'piece', sellingPrice: 24900, originalPrice: 26900,
    inStock: true, isActive: true,
    description: desc(
      'AirPods Pro 2nd generation with H2 chip and Adaptive Audio.',
      'Adaptive Audio — dynamically blends ANC and Transparency mode',
      'Up to 2x more ANC than previous generation',
      '30 hours total battery with MagSafe Charging Case',
      'Personalised Spatial Audio with head tracking',
      'IP54 dust, sweat and water resistant',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: audio.id, brandId: jbl.id,
    name: 'JBL Charge 5', unit: 'piece', sellingPrice: 14999, originalPrice: 17999,
    inStock: true, isActive: true,
    description: desc(
      'JBL Charge 5 portable Bluetooth speaker with PowerBank feature.',
      'Bold JBL Original Pro Sound with powerful woofer and tweeter',
      '20 hours of playtime with PartyBoost multi-speaker pairing',
      'IP67 waterproof and dustproof — submersible up to 1m for 30 min',
      'Built-in USB-A port to charge your devices on the go',
      'Connect 2 phones and take turns playing music',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: audio.id, brandId: jbl.id,
    name: 'JBL Flip 6', unit: 'piece', sellingPrice: 9999, originalPrice: 11999,
    inStock: true, isActive: true,
    description: desc(
      'JBL Flip 6 — compact speaker with surprisingly powerful sound.',
      'JBL Pure Bass Sound with racetrack-shaped driver',
      '12 hours of playtime with USB-C charging',
      'IP67 waterproof and dustproof rating',
      'PartyBoost for pairing with compatible JBL speakers',
      'Available in 10 vibrant colours',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: audio.id, brandId: boat.id,
    name: 'boAt Airdopes 141', unit: 'piece', sellingPrice: 1499, originalPrice: 3990,
    inStock: true, isActive: true,
    description: desc(
      'boAt Airdopes 141 TWS earbuds with BEAST mode for gaming.',
      '8mm drivers with boAt Signature Sound',
      'BEAST mode for ultra-low 60ms latency gaming',
      'Up to 42 hours total playback with the charging case',
      'IPX4 water resistance for workouts',
      'Touch controls and voice assistant support',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: audio.id, brandId: boat.id,
    name: 'boAt Rockerz 550', unit: 'piece', sellingPrice: 2499, originalPrice: 4990,
    inStock: true, isActive: true,
    description: desc(
      'boAt Rockerz 550 over-ear Bluetooth headphone with 20 hours playtime.',
      '50mm dynamic drivers for rich, immersive audio',
      '20 hours wireless playback on a single charge',
      'foldable design with cushioned ear cups for comfort',
      'Built-in mic for hands-free calling',
      'Compatible with voice assistants',
    ),
  });

  // Cameras
  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: cameras.id, brandId: canon.id,
    name: 'Canon EOS R50', unit: 'piece', sellingPrice: 79990, originalPrice: 89990,
    inStock: true, isActive: true,
    description: desc(
      'Canon EOS R50 mirrorless camera for creators and vloggers.',
      '24.2MP APS-C CMOS sensor with DIGIC X processor',
      'Dual Pixel CMOS AF II with subject tracking — people, animals, vehicles',
      '4K 30fps video with oversampling from 6K; 4K HQ with no crop',
      'Compact and lightweight at just 375g',
      'Fully articulating 3-inch touchscreen LCD',
      'Built-in Wi-Fi and Bluetooth for easy sharing',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: cameras.id, brandId: nikon.id,
    name: 'Nikon Z30', unit: 'piece', sellingPrice: 74995, originalPrice: 84995,
    inStock: true, isActive: true,
    description: desc(
      'Nikon Z30 mirrorless camera designed for content creators.',
      '20.9MP APS-C BSI-CMOS sensor without AA filter',
      '4K UHD 30fps video and Full HD 120fps for slow motion',
      'EXPEED 6 image processor for fast, accurate autofocus',
      'Vari-angle touchscreen for flexible shooting angles',
      'No viewfinder — optimised for live view and video shooting',
      'Lightweight 405g body for all-day content creation',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: cameras.id, brandId: sony.id,
    name: 'Sony ZV-E10 II', unit: 'piece', sellingPrice: 89990, originalPrice: 99990,
    inStock: true, isActive: true,
    description: desc(
      'Sony ZV-E10 II vlog camera with AI-powered autofocus.',
      '26MP APS-C Exmor R CMOS sensor for rich detail in any light',
      'AI-based autofocus with subject recognition for people, animals, insects',
      '4K 60fps video; 4K 120fps super slow motion',
      'Active SteadyShot electronic image stabilisation',
      'Side-opening vari-angle LCD touchscreen',
      'Built-in directional 3-capsule mic with wind screen',
    ),
  });

  // Gaming
  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: gaming.id, brandId: sony.id,
    name: 'Sony PlayStation 5 Slim', unit: 'piece', sellingPrice: 54990, originalPrice: 59990,
    inStock: true, isActive: true,
    description: desc(
      'PS5 Slim — the new, slimmer PlayStation 5 with disc drive.',
      'Custom AMD Zen 2 CPU at 3.5GHz + RDNA 2 GPU at 10.3 TFLOPs',
      '825GB custom NVMe SSD for near-instant load times',
      '4K gaming at up to 120fps with ray tracing support',
      '3D audio via Tempest 3D AudioTech engine',
      'DualSense wireless controller with haptic feedback and adaptive triggers',
      '30% smaller volume than original PS5',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: gaming.id, brandId: logitech.id,
    name: 'Logitech G502 X Gaming Mouse', unit: 'piece', sellingPrice: 5495, originalPrice: 6995,
    inStock: true, isActive: true,
    description: desc(
      'Logitech G502 X wired gaming mouse with LIGHTFORCE hybrid switches.',
      'LIGHTFORCE hybrid optical-mechanical switches — up to 100M clicks',
      'HERO 25K sensor with 100-25,600 DPI range, no smoothing or filtering',
      '13 programmable buttons with G HUB software',
      'Adjustable weight system with 4g and 2g weights',
      '2.5m braided cable for durability',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: gaming.id, brandId: logitech.id,
    name: 'Logitech G435 Wireless Gaming Headset', unit: 'piece', sellingPrice: 6495, originalPrice: 7995,
    inStock: true, isActive: true,
    description: desc(
      'Logitech G435 lightweight wireless gaming headset with Dolby Atmos.',
      'Ultra-lightweight at just 165g — lightest wireless gaming headset',
      'Dual connectivity — LIGHTSPEED wireless and Bluetooth 5.1',
      '18 hours battery life',
      'Dolby Atmos and Windows Sonic support',
      'Built-in dual beamforming mics — no external boom mic needed',
      'Compatible with PC, PS4, PS5, Nintendo Switch, and mobile',
    ),
  });

  // Smart Home
  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: smarthome.id, brandId: google.id,
    name: 'Google Nest Mini 2nd Gen', unit: 'piece', sellingPrice: 4499, originalPrice: 4999,
    inStock: true, isActive: true,
    description: desc(
      'Google Nest Mini — small speaker with big Google Assistant smarts.',
      'Improved bass over original Google Home Mini',
      'Far-field voice recognition with 3 far-field mics',
      'Machine learning on-device for faster responses',
      'Wall-mountable with built-in hole',
      'Made with 35% recycled plastic',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: smarthome.id, brandId: xiaomi.id,
    name: 'Xiaomi Smart Band 8 Pro', unit: 'piece', sellingPrice: 5999, originalPrice: 7499,
    inStock: true, isActive: true,
    description: desc(
      'Xiaomi Smart Band 8 Pro with AMOLED rectangular display and GPS.',
      '1.74-inch AMOLED rectangular display — always-on option',
      'Built-in GPS for accurate outdoor tracking without phone',
      '14-day battery life; 5 days with always-on display',
      '150+ fitness modes including swimming (5ATM water resistance)',
      'Heart rate, SpO2, stress, and sleep monitoring',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: smarthome.id, brandId: google.id,
    name: 'Google Chromecast with Google TV 4K', unit: 'piece', sellingPrice: 6399, originalPrice: 6999,
    inStock: true, isActive: true,
    description: desc(
      'Google Chromecast — plug any TV into Google TV with 4K streaming.',
      '4K HDR streaming with Dolby Vision, HDR10, HDR10+, and HLG',
      'Dolby Atmos audio pass-through',
      'Google TV with 700,000+ movies and TV episodes',
      'Voice remote with Google Assistant built in',
      'Cast from any device using the Google Home app',
    ),
  });

  // Accessories
  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: accessories.id, brandId: samsung.id,
    name: 'Samsung 45W USB-C Charger', unit: 'piece', sellingPrice: 2999, originalPrice: 3499,
    inStock: true, isActive: true,
    description: desc(
      'Samsung 45W USB-C super fast charging adapter.',
      '45W USB Power Delivery 3.0 compatible',
      'Super Fast Charging 2.0 for compatible Samsung devices',
      'Compact design with folding prongs',
      'USB-C to USB-C cable not included',
      'Compatible with Galaxy S series, Note series, and Tab S series',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: accessories.id, brandId: wd.id,
    name: 'WD 1TB My Passport Portable HDD', unit: 'piece', sellingPrice: 4499, originalPrice: 5499,
    inStock: true, isActive: true,
    description: desc(
      'WD My Passport 1TB portable hard drive — take your data anywhere.',
      '1TB capacity for up to 500,000 photos or 17 hours of 4K video',
      'USB 3.0 interface, backwards compatible with USB 2.0',
      'WD Backup software and 256-bit AES hardware encryption',
      'Compact, pocket-sized design in multiple colours',
      '3-year limited warranty',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: accessories.id, brandId: seagate.id,
    name: 'Seagate 2TB Expansion Portable HDD', unit: 'piece', sellingPrice: 5999, originalPrice: 6999,
    inStock: true, isActive: true,
    description: desc(
      'Seagate Expansion 2TB portable hard drive — simple plug-and-play storage.',
      '2TB capacity for massive photo, video, and file storage',
      'USB 3.0 for fast file transfers up to 5Gbps',
      'No software to install — plug in and drag and drop',
      'Works with PC and Mac out of the box',
      '3-year rescue data recovery included',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: accessories.id, brandId: logitech.id,
    name: 'Logitech MX Master 3S Mouse', unit: 'piece', sellingPrice: 8995, originalPrice: 10995,
    inStock: true, isActive: true,
    description: desc(
      'Logitech MX Master 3S — the master of mice for performance users.',
      '8K DPI Darkfield sensor — works on any surface including glass',
      'Quiet clicks — 90% noise reduction vs standard clicks',
      'MagSpeed electromagnetic scroll wheel — 1,000 lines per second',
      'Multi-device with Easy-Switch for up to 3 devices',
      '70-day battery life on full charge',
      'USB-C quick charge — 1 minute = 3 hours use',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: accessories.id, brandId: samsung.id,
    name: 'Samsung 128GB Pro Plus MicroSD', unit: 'piece', sellingPrice: 1299, originalPrice: 1999,
    inStock: true, isActive: true,
    description: desc(
      'Samsung Pro Plus 128GB microSD — high-speed card for 4K video.',
      'Read speed up to 180MB/s; write speed up to 130MB/s',
      'Supports 4K UHD video recording and fast burst mode',
      'V30 speed class for consistent 30MB/s minimum write',
      'Waterproof, temperature-proof, X-ray proof, and MRI-safe',
      'Compatible with smartphones, drones, action cameras, and more',
    ),
  });

  // Tablets
  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: tablets.id, brandId: apple.id,
    name: 'iPad Air M2 11"', unit: 'piece', sellingPrice: 74900, originalPrice: 79900,
    inStock: true, isActive: true,
    description: desc(
      'iPad Air with M2 chip — powerful, thin, and versatile.',
      '11-inch Liquid Retina display with True Tone and P3 wide colour',
      'Apple M2 chip — same chip as in MacBook Air',
      'Apple Pencil Pro and Magic Keyboard compatible',
      'All-day battery life — up to 10 hours',
      'Available in Blue, Purple, Starlight, and Space Grey',
      'Wi-Fi 6E for faster connectivity',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: tablets.id, brandId: samsung.id,
    name: 'Samsung Galaxy Tab S9 FE', unit: 'piece', sellingPrice: 46999, originalPrice: 52999,
    inStock: true, isActive: true,
    description: desc(
      'Samsung Galaxy Tab S9 FE with S Pen included and IP68 rating.',
      '10.9-inch 90Hz display with Samsung DeX support',
      'Exynos 1380 processor with 6GB RAM',
      'IP68 water and dust resistance — unique for tablets',
      'S Pen included for notes, sketches, and precise control',
      '10,090mAh battery with 45W fast charging',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: tablets.id, brandId: xiaomi.id,
    name: 'Xiaomi Pad 6', unit: 'piece', sellingPrice: 26999, originalPrice: 29999,
    inStock: true, isActive: true,
    description: desc(
      'Xiaomi Pad 6 — flagship-grade tablet at a mid-range price.',
      '11-inch WQHD+ 144Hz display with Dolby Vision',
      'Snapdragon 870 processor with up to 8GB RAM',
      '8840mAh battery with 33W fast charging',
      'Quad speaker system with Dolby Atmos',
      'Supports Xiaomi Smart Pen 2 stylus',
    ),
  });

  // Wearables
  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: wearables.id, brandId: apple.id,
    name: 'Apple Watch Series 9 GPS 45mm', unit: 'piece', sellingPrice: 44900, originalPrice: 47900,
    inStock: true, isActive: true,
    description: desc(
      'Apple Watch Series 9 with S9 chip and Double Tap gesture.',
      'Brightest Apple Watch display ever — 2000 nits peak brightness',
      'New Double Tap gesture for one-handed control',
      'S9 SiP chip with 4-core Neural Engine for on-device Siri',
      'Blood oxygen, ECG, heart rate, and temperature sensors',
      '18 hours battery life; up to 36 hours in Low Power Mode',
      'Carbon neutral with recycled aluminium case option',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: wearables.id, brandId: samsung.id,
    name: 'Samsung Galaxy Watch 6 Classic 47mm', unit: 'piece', sellingPrice: 36999, originalPrice: 42999,
    inStock: true, isActive: true,
    description: desc(
      'Samsung Galaxy Watch 6 Classic with iconic rotating bezel.',
      'Classic rotating bezel for intuitive navigation',
      '47mm Super AMOLED display with sapphire crystal glass',
      'Advanced health: BioActive Sensor, ECG, blood pressure monitoring',
      'Sleep coaching with detailed sleep stage analysis',
      'IP68 and 5ATM water resistance',
      '40 hours battery life with power saving mode',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: wearables.id, brandId: noise.id,
    name: 'Noise ColorFit Pro 5', unit: 'piece', sellingPrice: 4499, originalPrice: 7999,
    inStock: true, isActive: true,
    description: desc(
      'Noise ColorFit Pro 5 smartwatch with Bluetooth calling and AMOLED display.',
      '1.85-inch AMOLED always-on display with 550 nits brightness',
      'Bluetooth calling with built-in mic and speaker',
      '100+ workout modes with auto-detection',
      'Health suite: SpO2, heart rate, stress, sleep tracking',
      'Up to 7 days battery; 20 days in power save mode',
      'IP68 water resistance',
    ),
  });

  await mkProduct(STORE_ID, OWNER_ID, {
    storeId: STORE_ID, categoryId: wearables.id, brandId: boat.id,
    name: 'boAt Wave Flex Connect', unit: 'piece', sellingPrice: 1799, originalPrice: 3999,
    inStock: true, isActive: true,
    description: desc(
      'boAt Wave Flex Connect smartwatch with Bluetooth calling and flexible strap.',
      '1.83-inch HD display with 550 nits brightness',
      'Bluetooth calling via built-in speaker and mic',
      '100+ sport modes and 24/7 heart rate monitoring',
      'Up to 7 days battery life',
      'IP68 water resistance for everyday use',
    ),
  });

  const count = await prisma.product.count({ where: { storeId: STORE_ID } });
  console.log(`Products done: ${count}`);
  console.log('Electronics seed complete! Upload product images from the admin panel.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
