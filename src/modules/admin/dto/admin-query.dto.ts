import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

export class AdminUserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] })
  @IsOptional()
  @IsIn(['FREE', 'STARTER', 'PRO', 'ENTERPRISE'])
  tier?: string;
}

export class ChangeUserTierDto {
  @ApiPropertyOptional({ enum: ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] })
  @IsIn(['FREE', 'STARTER', 'PRO', 'ENTERPRISE'])
  tier: string;
}
