import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const allowedOrigins = [
  'https://portal.dreambiz.app',
  'http://localhost:3010',
  'http://localhost:3011',
  'http://localhost:3012'
];

const localhostSubdomainPattern = /^http:\/\/[a-z0-9-]+\.localhost:\d+$/;
const ngrokPattern = /^https:\/\/[a-z0-9-]+\.ngrok-free\.(app|dev)$/;
const devtunnelsPattern = /^https:\/\/[a-z0-9]+-\d+\.[a-z0-9]+\.devtunnels\.ms$/;
//Production
const STOREFRONT_ORIGIN_REGEX = /^https:\/\/[a-z0-9-]+\.dreambiz\.app$/;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        localhostSubdomainPattern.test(origin) ||
        ngrokPattern.test(origin) ||
        devtunnelsPattern.test(origin) ||
        STOREFRONT_ORIGIN_REGEX.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  });

  app.setGlobalPrefix('api');
  const port = process.env.PORT ?? 3010;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}/api`);

  
}
bootstrap();
