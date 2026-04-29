import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Enable CORS so the Next.js frontend on port 3000 can communicate with this API
  app.enableCors();
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
