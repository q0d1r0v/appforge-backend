import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '@/common/pipes/parse-uuid.pipe';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { ProjectStatus } from '@prisma/client';

@ApiTags('Projects')
@ApiBearerAuth('JWT')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects (with pagination)' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.projectsService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single project' })
  findOne(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project' })
  remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.remove(id, userId);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a project' })
  archive(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.archive(id, userId);
  }

  @Post(':id/unarchive')
  @ApiOperation({ summary: 'Unarchive a project' })
  unarchive(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.unarchive(id, userId);
  }

  @Post(':id/reanalyze')
  @ApiOperation({ summary: 'Re-analyze a project' })
  reanalyze(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.reanalyze(id, userId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change project status' })
  transitionStatus(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: ProjectStatus,
  ) {
    return this.projectsService.transitionStatus(id, userId, status);
  }

  @Post(':id/estimate')
  @ApiOperation({ summary: 'Generate project estimate' })
  generateEstimate(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.generateEstimate(id, userId);
  }

  @Get(':id/estimate')
  @ApiOperation({ summary: 'Get project estimate' })
  getEstimate(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getEstimate(id, userId);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export a project' })
  exportProject(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.exportProject(id, userId);
  }
}
