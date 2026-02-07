import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
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
import { UsageModule } from '@/modules/usage/usage.module';
import { OrganizationsModule } from '@/modules/organizations/organizations.module';
import { BillingModule } from '@/modules/billing/billing.module';
import { AnalyticsModule } from '@/modules/analytics/analytics.module';
import { AdminModule } from '@/modules/admin/admin.module';
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
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
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
    UsageModule,
    OrganizationsModule,
    BillingModule,
    AnalyticsModule,
    AdminModule,
  ],
})
export class AppModule {}
