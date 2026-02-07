import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateEstimateDto {
  @ApiProperty({ example: 'project-uuid-123' })
  @IsString()
  projectId: string;
}
