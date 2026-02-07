import { Controller, Get, Patch, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrototypesService } from './prototypes.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UpdateConnectionsDto } from './dto/update-connections.dto';

@ApiTags('Prototypes')
@ApiBearerAuth('JWT')
@Controller('prototypes')
export class PrototypesController {
  constructor(private readonly prototypesService: PrototypesService) {}

  @Get(':projectId')
  @ApiOperation({ summary: 'Get project prototype' })
  getPrototype(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.prototypesService.getPrototype(projectId, userId);
  }

  @Patch('connections')
  @ApiOperation({ summary: 'Update screen connections' })
  updateConnections(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateConnectionsDto,
  ) {
    return this.prototypesService.updateConnections(userId, dto);
  }

  @Post(':projectId/validate')
  @ApiOperation({ summary: 'Validate screen connections' })
  validateConnections(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.prototypesService.validateConnections(projectId, userId);
  }
}