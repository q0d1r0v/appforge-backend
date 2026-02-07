import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';

export class ChangeMemberRoleDto {
  @ApiProperty({
    enum: OrganizationRole,
    description: 'New role for the member',
  })
  @IsEnum(OrganizationRole)
  role: OrganizationRole;
}
