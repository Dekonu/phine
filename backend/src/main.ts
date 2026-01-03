import { config } from 'dotenv';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

// Load environment variables from .env file
// In development, __dirname points to src/, in production it points to dist/
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Set global prefix for all routes
  app.setGlobalPrefix('api');
  
  // Enable CORS for Next.js frontend
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, or curl)
      if (!origin) {
        return callback(null, true);
      }
      // Allow requests from the configured frontend URL
      if (origin === frontendUrl) {
        return callback(null, true);
      }
      // In development, allow localhost on any port
      if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      // Reject other origins
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-User-ID'],
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  // Bootstrap logging - Logger for initial startup message
  // Services use NestJS Logger for runtime logging
  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Backend server running on http://localhost:${port}`);
}

bootstrap();

