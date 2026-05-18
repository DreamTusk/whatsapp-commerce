import 'dotenv/config';
import express from 'express';
import webhookRouter from './routes/webhook.js';
import authRouter from './routes/auth.js';
import adminStoreRouter from './routes/admin/store.js';
import logger from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/admin/store', adminStoreRouter);
app.use('/api/webhook', webhookRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`WhatsApp Commerce Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Webhook URL: http://localhost:${PORT}/api/webhook`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
