import { IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateCodeDto {
  @ApiProperty({ example: 'project-uuid-123' })
  @IsString()
  projectId: string;

  @ApiPropertyOptional({ example: ['React Native', 'TypeScript', 'Firebase'] })
  @IsOptional()
  @IsArray()
  techStack?: string[];
}
