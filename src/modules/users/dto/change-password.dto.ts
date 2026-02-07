import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldPassword123' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'newPassword456', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}