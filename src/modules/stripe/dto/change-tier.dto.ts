import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionTier } from '@prisma/client';

export class ChangeTierDto {
  @ApiProperty({ enum: ['STARTER', 'PRO', 'ENTERPRISE'] })
  @IsEnum(SubscriptionTier)
  newTier: SubscriptionTier;
}
