import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'https://x60r4ghj-3001.inc1.devtunnels.ms',
  'https://x60r4ghj-3002.inc1.devtunnels.ms',
  'https://14b2-120-60-199-220.ngrok-free.app',
];

const localhostSubdomainPattern = /^http:\/\/[a-z0-9-]+\.localhost:\d+$/;
const ngrokPattern = /^https:\/\/[a-z0-9-]+\.ngrok-free\.app$/;
const devtunnelsPattern = /^https:\/\/[a-z0-9]+-\d+\.[a-z0-9]+\.devtunnels\.ms$/;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        localhostSubdomainPattern.test(origin) ||
        ngrokPattern.test(origin) ||
        devtunnelsPattern.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  });

  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
