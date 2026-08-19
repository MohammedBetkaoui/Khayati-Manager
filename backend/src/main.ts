import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origin === 'null' || origin.startsWith('http://localhost:5173') || origin.startsWith('http://localhost:3000')) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed`), false);
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(Number(process.env.PORT ?? 3000), '127.0.0.1');
}
bootstrap();
