import {
  Controller,
  Post,
  Get,
  Headers,
  HttpCode,
  RawBody,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { StripeService } from './stripe.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('Stripe')
@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('checkout')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create Stripe checkout session for subscription' })
  createCheckout(@CurrentUser('id') userId: string) {
    return this.stripeService.createCheckoutSession(userId);
  }

  @Post('webhook')
  @Public()
  @HttpCode(200)
  @ApiExcludeEndpoint()
  handleWebhook(
    @RawBody() payload: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.stripeService.handleWebhook(payload, signature);
  }

  @Post('cancel')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Cancel active subscription' })
  cancelSubscription(@CurrentUser('id') userId: string) {
    return this.stripeService.cancelSubscription(userId);
  }

  @Get('status')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get current subscription status' })
  getStatus(@CurrentUser('id') userId: string) {
    return this.stripeService.getSubscriptionStatus(userId);
  }
}
