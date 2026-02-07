import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import basicAuth from 'express-basic-auth';
import { AppModule } from '@/app.module';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from '@/common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));

  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:5173'],
    credentials: true,
  });

  // Swagger — only in development mode
  const nodeEnv = configService.get<string>('app.nodeEnv');
  if (nodeEnv === 'development') {
    const swaggerUser = configService.get<string>('app.swagger.user') || 'admin';
    const swaggerPassword = configService.get<string>('app.swagger.password') || 'changeme';

    // Protect Swagger routes with basic auth
    app.use(
      ['/api/docs', '/api/docs-json', '/api/docs-yaml'],
      basicAuth({
        challenge: true,
        users: { [swaggerUser]: swaggerPassword } as Record<string, string>,
      }),
    );

    const swaggerConfig = new DocumentBuilder()
      .setTitle('AppForge API')
      .setDescription('AI-powered app development platform API')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Users', 'User management')
      .addTag('Projects', 'Project management')
      .addTag('AI', 'AI generation endpoints')
      .addTag('Wireframes', 'Wireframe management')
      .addTag('Prototypes', 'Prototype management')
      .addTag('Uploads', 'File upload endpoints')
      .addTag('Events', 'WebSocket real-time events')
      .addTag('Stripe', 'Subscription & billing endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    console.log(`Swagger docs: http://localhost:${configService.get<number>('app.port') || 3000}/api/docs`);
  }

  app.enableShutdownHooks();

  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port);
  console.log(`AppForge API running on http://localhost:${port}/api/v1`);
  console.log(`Environment: ${nodeEnv}`);
}
bootstrap();
