import { IsString, IsEnum, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScreenType } from '@prisma/client';

export class GenerateWireframeDto {
  @ApiProperty({ example: 'screen-uuid-123' })
  @IsString()
  screenId: string;

  @ApiProperty({ example: 'project-uuid-123' })
  @IsString()
  projectId: string;

  @ApiProperty({ enum: ScreenType })
  @IsEnum(ScreenType)
  screenType: ScreenType;

  @ApiProperty({ example: 'Login Screen' })
  @IsString()
  screenName: string;

  @ApiPropertyOptional({ example: ['Authentication', 'Social Login'] })
  @IsOptional()
  @IsArray()
  features?: string[];
}
