import { IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';

export class InviteMemberDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    enum: OrganizationRole,
    default: OrganizationRole.MEMBER,
    description: 'Role to assign to the invited member',
  })
  @IsOptional()
  @IsEnum(OrganizationRole)
  role?: OrganizationRole = OrganizationRole.MEMBER;
}
