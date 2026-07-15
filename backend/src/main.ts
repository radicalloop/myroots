import { NestFactory } from '@nestjs/core';
import {
  BadRequestException,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.use(helmet());

  const corsOrigins = (configService.get<string>('CORS_ORIGINS') ??
    'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim());

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use(
    '/api/trees/:treeId/persons/:personId/image/upload',
    express.raw({ type: '*/*', limit: '10mb' }),
  );
  app.use(express.json({ limit: '2mb' }));

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      exceptionFactory: (errors) => {
        const messages = errors.flatMap((error) =>
          Object.values(error.constraints ?? {}),
        );
        return new BadRequestException(messages.join('; '));
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = Number(configService.get('PORT') ?? 3001);
  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}/api`);
}

bootstrap();
