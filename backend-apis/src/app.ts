import express from 'express';
import cors from 'cors';
import webhookRouter from './routes/webhook.js';
import authRouter from './routes/auth.js';
import adminStoreRouter from './routes/admin/store.js';
import adminInviteRouter from './routes/admin/invite.js';
import logger from './utils/logger.js';

const app = express();

const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/store', adminStoreRouter);
app.use('/api/invite', adminInviteRouter);
app.use('/api/webhook', webhookRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
