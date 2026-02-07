import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiPropertyOptional({ example: 'My App' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Online store mobile app for users', minLength: 20 })
  @IsString()
  @MinLength(20, { message: 'Describe the app idea with at least 20 characters' })
  description: string;
}