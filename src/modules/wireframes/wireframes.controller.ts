import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WireframesService } from './wireframes.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CreateScreenDto } from './dto/create-screen.dto';
import { UpdateScreenDto } from './dto/update-screen.dto';

@ApiTags('Wireframes')
@ApiBearerAuth('JWT')
@Controller('wireframes')
export class WireframesController {
  constructor(private readonly wireframesService: WireframesService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get project screens' })
  findAllByProject(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.wireframesService.findAllByProject(projectId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single screen' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.wireframesService.findOne(id, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new screen' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateScreenDto) {
    return this.wireframesService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a screen' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateScreenDto,
  ) {
    return this.wireframesService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a screen' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.wireframesService.remove(id, userId);
  }

  @Post('generate/:projectId')
  @ApiOperation({ summary: 'Generate wireframes for all screens' })
  generateWireframes(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.wireframesService.generateWireframes(projectId, userId);
  }

  @Patch('reorder/:projectId')
  @ApiOperation({ summary: 'Reorder screens' })
  reorderScreens(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Body('screenIds') screenIds: string[],
  ) {
    return this.wireframesService.reorderScreens(projectId, userId, screenIds);
  }
}