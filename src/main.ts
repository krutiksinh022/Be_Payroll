import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function getAllowedOrigins() {
  return (process.env.CORS_ORIGIN ?? process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = getAllowedOrigins();

  app.enableCors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isConfiguredOrigin = allowedOrigins.includes(origin);
      const isLocalDevOrigin =
        allowedOrigins.length === 0 &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      callback(null, isConfiguredOrigin || isLocalDevOrigin);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
