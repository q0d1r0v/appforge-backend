import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionTier } from '@prisma/client';

export class CreateTierCheckoutDto {
  @ApiProperty({ enum: ['STARTER', 'PRO', 'ENTERPRISE'] })
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;
}
