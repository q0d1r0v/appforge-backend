import { IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyzeIdeaDto {
  @ApiProperty({ example: 'Online store mobile app for users', minLength: 20 })
  @IsString()
  @MinLength(20, { message: 'Describe the app idea with at least 20 characters' })
  description: string;

  @ApiPropertyOptional({ example: 'MOBILE_APP' })
  @IsOptional()
  @IsString()
  projectType?: string;
}
