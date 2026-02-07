import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ConnectionDto {
  @ApiProperty({ example: 'target-screen-uuid' })
  @IsString()
  targetScreenId: string;

  @ApiProperty({ example: 'onPress' })
  @IsString()
  trigger: string;

  @ApiProperty({ example: 'button-component-id' })
  @IsString()
  componentId: string;
}

export class UpdateConnectionsDto {
  @ApiProperty({ example: 'screen-uuid-123' })
  @IsString()
  screenId: string;

  @ApiProperty({ type: [ConnectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConnectionDto)
  connections: ConnectionDto[];
}