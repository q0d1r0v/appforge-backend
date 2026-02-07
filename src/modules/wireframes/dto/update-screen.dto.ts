import { IsString, IsOptional, IsObject, IsInt, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ScreenType } from '@prisma/client';

export class UpdateScreenDto {
  @ApiPropertyOptional({ example: 'Updated Screen Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ScreenType })
  @IsOptional()
  @IsEnum(ScreenType)
  type?: ScreenType;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional({ example: { layout: 'column', components: [] } })
  @IsOptional()
  @IsObject()
  wireframe?: any;

  @ApiPropertyOptional({ example: { targetScreenId: 'screen-uuid', trigger: 'onPress' } })
  @IsOptional()
  @IsObject()
  connections?: any;
}