import { Controller, Post, Body, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AIService } from './ai.service';
import { AnalyzeIdeaDto } from './dto/analyze-idea.dto';
import { GenerateWireframeDto } from './dto/generate-wireframe.dto';
import { GenerateEstimateDto } from './dto/generate-estimate.dto';
import { GenerateCodeDto } from './dto/generate-code.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('AI')
@ApiBearerAuth('JWT')
@Controller('ai')
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze app idea with AI' })
  analyzeIdea(@Body() dto: AnalyzeIdeaDto) {
    return this.aiService.analyzeIdea(dto);
  }

  @Post('wireframe')
  @ApiOperation({ summary: 'Generate wireframe for a screen' })
  async generateWireframe(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateWireframeDto,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, userId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.aiService.generateWireframe(
      dto.screenName,
      dto.screenType,
      project.description,
      dto.features || [],
      dto.projectId,
    );
  }

  @Post('estimate')
  @ApiOperation({ summary: 'Generate estimate for a project' })
  async generateEstimate(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateEstimateDto,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, userId },
      include: { features: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.aiService.generateEstimate(
      project.aiAnalysis,
      project.features,
      dto.projectId,
    );
  }

  @Post('codegen')
  @ApiOperation({ summary: 'Generate code for a project' })
  async generateCode(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateCodeDto,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, userId },
      include: { features: true, screens: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.aiService.generateCode(
      project.screens,
      project.features,
      dto.techStack || [],
      dto.projectId,
    );
  }
}