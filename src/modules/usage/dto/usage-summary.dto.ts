import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionTier } from '@prisma/client';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

export class UsageSummaryDto {
  @ApiProperty({ description: 'Total tokens used this month' })
  totalTokens: number;

  @ApiProperty({ description: 'Total AI requests this month' })
  totalRequests: number;

  @ApiProperty({ description: 'Monthly token quota for current tier' })
  monthlyQuota: number;

  @ApiProperty({ description: 'Daily AI requests limit for current tier' })
  dailyRequestsLimit: number;

  @ApiProperty({ description: 'Number of AI requests made today' })
  dailyRequestsUsed: number;

  @ApiProperty({ description: 'Percentage of monthly quota used' })
  quotaUsedPercent: number;

  @ApiProperty({ enum: SubscriptionTier, description: 'Current subscription tier' })
  tier: SubscriptionTier;

  @ApiProperty({ description: 'Start of the current billing period' })
  periodStart: Date;

  @ApiProperty({ description: 'End of the current billing period' })
  periodEnd: Date;
}

export class UsageHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by year', example: 2025 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  year?: number;
}
