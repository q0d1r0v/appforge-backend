import { IsString, IsEnum, IsInt, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScreenType } from '@prisma/client';

export class CreateScreenDto {
  @ApiProperty({ example: 'project-uuid-123' })
  @IsString()
  projectId: string;

  @ApiProperty({ example: 'Login Screen' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ScreenType })
  @IsEnum(ScreenType)
  type: ScreenType;

  @ApiProperty({ example: 1 })
  @IsInt()
  order: number;

  @ApiPropertyOptional({ example: { layout: 'column', components: [] } })
  @IsOptional()
  @IsObject()
  wireframe?: any;
}