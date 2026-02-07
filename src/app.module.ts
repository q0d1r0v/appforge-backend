import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { RedisCacheModule } from '@/modules/cache/cache.module';
import { EmailModule } from '@/modules/email/email.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { UsersModule } from '@/modules/users/users.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { AIModule } from '@/modules/ai/ai.module';
import { WireframesModule } from '@/modules/wireframes/wireframes.module';
import { PrototypesModule } from '@/modules/prototypes/prototypes.module';
import { EventsModule } from '@/modules/events/events.module';
import { UploadsModule } from '@/modules/uploads/uploads.module';
import { StripeModule } from '@/modules/stripe/stripe.module';
import appConfig from '@/config/app.config';
import aiConfig from '@/config/ai.config';
import redisConfig from '@/config/redis.config';
import emailConfig from '@/config/email.config';
import uploadConfig from '@/config/upload.config';
import stripeConfig from '@/config/stripe.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, aiConfig, redisConfig, emailConfig, uploadConfig, stripeConfig],
    }),
    PrismaModule,
    RedisCacheModule,
    EmailModule,
    EventsModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    AIModule,
    WireframesModule,
    PrototypesModule,
    UploadsModule,
    StripeModule,
  ],
})
export class AppModule {}
