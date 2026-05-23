import express from 'express';
import path from 'path';
import cors from 'cors';
import webhookRouter from './routes/webhook.js';
import authRouter from './routes/auth.js';
import adminStoreRouter from './routes/admin/store.js';
import adminInviteRouter from './routes/admin/invite.js';
import adminCategoriesRouter from './routes/admin/categories.js';
import adminProductsRouter from './routes/admin/products.js';
import storefrontCategoriesRouter from './routes/storefront/categories.js';
import storefrontProductsRouter from './routes/storefront/products.js';
import storefrontAuthRouter from './routes/storefront/auth.js';
import storefrontOrdersRouter from './routes/storefront/orders.js';
import storefrontCartRouter from './routes/storefront/cart.js';
import storefrontWishlistRouter from './routes/storefront/wishlist.js';
import adminOrdersRouter from './routes/admin/orders.js';
import adminCustomersRouter from './routes/admin/customers.js';
import adminBrandsRouter from './routes/admin/brands.js';
import adminVariantsRouter from './routes/admin/variants.js';
import adminInventoryRouter from './routes/admin/inventory.js';
import logger from './utils/logger.js';

const app = express();

const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
];

// customer storefront runs on subdomains: http://freshmart.localhost:3002
const localhostSubdomainPattern = /^http:\/\/[a-z0-9-]+\.localhost:\d+$/;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || localhostSubdomainPattern.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/store', adminStoreRouter);
app.use('/api/invite', adminInviteRouter);
app.use('/api/categories', adminCategoriesRouter);
app.use('/api/products', adminProductsRouter);
app.use('/api/orders', adminOrdersRouter);
app.use('/api/customers', adminCustomersRouter);
app.use('/api/brands', adminBrandsRouter);
app.use('/api/products/:productId/variants', adminVariantsRouter);
app.use('/api/inventory', adminInventoryRouter);
app.use('/api/storefront/auth', storefrontAuthRouter);
app.use('/api/storefront/orders', storefrontOrdersRouter);
app.use('/api/storefront/cart', storefrontCartRouter);
app.use('/api/storefront/wishlist', storefrontWishlistRouter);
app.use('/api/storefront/categories', storefrontCategoriesRouter);
app.use('/api/storefront/products', storefrontProductsRouter);
app.use('/api/webhook', webhookRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
