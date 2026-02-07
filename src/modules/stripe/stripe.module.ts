import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { STRIPE_CLIENT } from './stripe.constants';

@Module({
  controllers: [StripeController],
  providers: [
    {
      provide: STRIPE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const key = config.get<string>('stripe.secretKey');
        if (!key) return null;
        return new Stripe(key);
      },
    },
    StripeService,
  ],
  exports: [StripeService],
})
export class StripeModule {}
