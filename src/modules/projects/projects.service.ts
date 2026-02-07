import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '@/prisma/prisma.service';
import { AIService } from '@/modules/ai/ai.service';
import { EventsGateway } from '@/modules/events/events.gateway';
import { EmailService } from '@/modules/email/email.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { paginate, paginationArgs } from '@/common/helpers/pagination.helper';
import { Prisma, ProjectStatus } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
    private eventsGateway: EventsGateway,
    private emailService: EmailService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        userId,
        name: dto.name || 'Untitled Project',
        description: dto.description,
        status: ProjectStatus.ANALYZING,
      },
    });

    await this.invalidateProjectListCache(userId);

    // Trigger AI analysis asynchronously
    this.analyzeProjectInBackground(project.id, userId, dto.description);

    return project;
  }

  private async analyzeProjectInBackground(
    projectId: string,
    userId: string,
    description: string,
  ) {
    try {
      this.eventsGateway.emitAnalysisProgress(userId, projectId, {
        step: 'analyzing',
        progress: 10,
        message: 'AI analyzing your idea...',
      });

      const analysis = await this.aiService.analyzeIdea({ description });

      this.eventsGateway.emitAnalysisProgress(userId, projectId, {
        step: 'structuring',
        progress: 50,
        message: 'Structuring features and screens...',
      });

      // Update project with AI analysis
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          aiAnalysis: analysis,
          name: analysis.appName || 'Untitled Project',
          type: analysis.appType,
          status: ProjectStatus.WIREFRAMING,
        },
      });

      this.eventsGateway.emitProjectStatusChanged(userId, projectId, {
        status: ProjectStatus.WIREFRAMING,
        projectName: analysis.appName || 'Untitled Project',
      });

      // Create features
      if (analysis.features) {
        await this.prisma.feature.createMany({
          data: analysis.features.map((feature) => ({
            projectId,
            name: feature.name,
            description: feature.description,
            category: feature.category,
            priority: feature.priority,
            estimatedHours: feature.estimatedHours,
            complexity: feature.complexity,
          })),
        });
      }

      this.eventsGateway.emitAnalysisProgress(userId, projectId, {
        step: 'screens',
        progress: 80,
        message: 'Creating screen structure...',
      });

      // Create screens
      if (analysis.screens) {
        await this.prisma.screen.createMany({
          data: analysis.screens.map((screen) => ({
            projectId,
            name: screen.name,
            type: screen.type,
            order: screen.order,
            wireframe: {}, // Empty wireframe for now
          })),
        });
      }

      // Mark as READY
      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.READY },
      });

      this.eventsGateway.emitProjectStatusChanged(userId, projectId, {
        status: ProjectStatus.READY,
        projectName: analysis.appName || 'Untitled Project',
      });

      this.eventsGateway.emitAnalysisCompleted(userId, projectId, {
        featuresCount: analysis.features?.length || 0,
        screensCount: analysis.screens?.length || 0,
      });

      // Send project ready email (fire-and-forget)
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (user) {
        this.emailService.sendProjectReadyEmail(
          user.email,
          user.name,
          analysis.appName || 'Your project',
          projectId,
        );
      }

      await this.invalidateProjectCache(projectId, userId);
    } catch (error) {
      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.DRAFT },
      });

      this.eventsGateway.emitProjectStatusChanged(userId, projectId, {
        status: ProjectStatus.DRAFT,
        projectName: 'Analysis failed',
      });

      this.eventsGateway.emitError(userId, {
        message: 'AI analysis failed. Please try again.',
        context: `project:${projectId}`,
      });

      console.error('AI Analysis failed:', error);
    }
  }

  async findAll(userId: string, query: PaginationQueryDto) {
    const cacheKey = `projects:${userId}:${query.page}:${query.limit}:${query.search || ''}:${query.sortBy || ''}:${query.sortOrder || ''}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const where: Prisma.ProjectWhereInput = { userId };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          features: true,
          screens: true,
          estimate: true,
        },
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        ...paginationArgs(query),
      }),
      this.prisma.project.count({ where }),
    ]);

    const result = paginate(items, total, query);
    await this.cacheManager.set(cacheKey, result, 30000); // 30s
    return result;
  }

  async findOne(id: string, userId: string) {
    const cacheKey = `project:${id}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached as any;

    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: {
        features: {
          orderBy: { priority: 'asc' },
        },
        screens: {
          orderBy: { order: 'asc' },
        },
        estimate: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.cacheManager.set(cacheKey, project, 60000); // 60s
    return project;
  }

  async update(id: string, userId: string, dto: UpdateProjectDto) {
    const project = await this.findOne(id, userId);

    if (
      project.status !== ProjectStatus.DRAFT &&
      project.status !== ProjectStatus.READY
    ) {
      throw new BadRequestException(
        'Project can only be updated in DRAFT or READY status',
      );
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: dto,
      include: { features: true, screens: true, estimate: true },
    });

    await this.invalidateProjectCache(id, userId);
    return updated;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.project.delete({ where: { id } });
    await this.invalidateProjectCache(id, userId);
    return { message: 'Project deleted successfully' };
  }

  async archive(id: string, userId: string) {
    await this.findOne(id, userId);
    const archived = await this.prisma.project.update({
      where: { id },
      data: {
        status: ProjectStatus.ARCHIVED,
        archivedAt: new Date(),
      },
    });
    await this.invalidateProjectCache(id, userId);
    return archived;
  }

  async unarchive(id: string, userId: string) {
    const project = await this.findOne(id, userId);
    if (project.status !== ProjectStatus.ARCHIVED) {
      throw new BadRequestException('Project is not archived');
    }
    const unarchived = await this.prisma.project.update({
      where: { id },
      data: {
        status: ProjectStatus.DRAFT,
        archivedAt: null,
      },
    });
    await this.invalidateProjectCache(id, userId);
    return unarchived;
  }

  async reanalyze(id: string, userId: string) {
    const project = await this.findOne(id, userId);

    // Delete old features and screens
    await this.prisma.feature.deleteMany({ where: { projectId: id } });
    await this.prisma.screen.deleteMany({ where: { projectId: id } });

    await this.prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.ANALYZING, aiAnalysis: Prisma.DbNull },
    });

    await this.invalidateProjectCache(id, userId);
    this.analyzeProjectInBackground(id, userId, project.description);

    return { message: 'Re-analysis started' };
  }

  private static readonly VALID_TRANSITIONS: Record<string, string[]> = {
    [ProjectStatus.DRAFT]: [ProjectStatus.ANALYZING],
    [ProjectStatus.READY]: [ProjectStatus.IN_DEVELOPMENT],
    [ProjectStatus.IN_DEVELOPMENT]: [ProjectStatus.COMPLETED],
  };

  async transitionStatus(
    id: string,
    userId: string,
    newStatus: ProjectStatus,
  ) {
    const project = await this.findOne(id, userId);
    const allowed =
      ProjectsService.VALID_TRANSITIONS[project.status] || [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${project.status} to ${newStatus}`,
      );
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: { status: newStatus },
    });
    await this.invalidateProjectCache(id, userId);
    return updated;
  }

  async generateEstimate(id: string, userId: string) {
    const project = await this.findOne(id, userId);

    if (!project.features || project.features.length === 0) {
      throw new BadRequestException(
        'Project must have features to generate estimate',
      );
    }

    const totalHours = project.features.reduce(
      (sum, f) => sum + (f.estimatedHours || 0),
      0,
    );

    const designHours = Math.ceil(totalHours * 0.15);
    const frontendHours = Math.ceil(totalHours * 0.35);
    const backendHours = Math.ceil(totalHours * 0.30);
    const testingHours = Math.ceil(totalHours * 0.15);
    const deploymentHours = Math.ceil(totalHours * 0.05);
    const total = designHours + frontendHours + backendHours + testingHours + deploymentHours;

    const hourlyRate = 50;
    const designCost = designHours * hourlyRate;
    const developmentCost = (frontendHours + backendHours) * hourlyRate;
    const infrastructureCost = deploymentHours * hourlyRate * 2;
    const totalCost = designCost + developmentCost + infrastructureCost + testingHours * hourlyRate;

    const weeksNeeded = Math.ceil(total / 40);

    const estimate = await this.prisma.estimate.upsert({
      where: { projectId: id },
      update: {
        designHours,
        frontendHours,
        backendHours,
        testingHours,
        deploymentHours,
        totalHours: total,
        designCost,
        developmentCost,
        infrastructureCost,
        totalCost,
        estimatedDuration: `${weeksNeeded}-${weeksNeeded + 2} weeks`,
        phases: [
          { name: 'Design & Planning', duration: `${Math.ceil(weeksNeeded * 0.2)} weeks`, cost: designCost },
          { name: 'Frontend Development', duration: `${Math.ceil(weeksNeeded * 0.35)} weeks`, cost: frontendHours * hourlyRate },
          { name: 'Backend Development', duration: `${Math.ceil(weeksNeeded * 0.3)} weeks`, cost: backendHours * hourlyRate },
          { name: 'Testing & Deployment', duration: `${Math.ceil(weeksNeeded * 0.15)} weeks`, cost: (testingHours + deploymentHours) * hourlyRate },
        ],
        version: { increment: 1 },
      },
      create: {
        projectId: id,
        designHours,
        frontendHours,
        backendHours,
        testingHours,
        deploymentHours,
        totalHours: total,
        designCost,
        developmentCost,
        infrastructureCost,
        totalCost,
        estimatedDuration: `${weeksNeeded}-${weeksNeeded + 2} weeks`,
        phases: [
          { name: 'Design & Planning', duration: `${Math.ceil(weeksNeeded * 0.2)} weeks`, cost: designCost },
          { name: 'Frontend Development', duration: `${Math.ceil(weeksNeeded * 0.35)} weeks`, cost: frontendHours * hourlyRate },
          { name: 'Backend Development', duration: `${Math.ceil(weeksNeeded * 0.3)} weeks`, cost: backendHours * hourlyRate },
          { name: 'Testing & Deployment', duration: `${Math.ceil(weeksNeeded * 0.15)} weeks`, cost: (testingHours + deploymentHours) * hourlyRate },
        ],
      },
    });

    await this.invalidateProjectCache(id, userId);
    return estimate;
  }

  async getEstimate(id: string, userId: string) {
    await this.findOne(id, userId);
    const estimate = await this.prisma.estimate.findUnique({
      where: { projectId: id },
    });
    if (!estimate) {
      throw new NotFoundException('Estimate not found for this project');
    }
    return estimate;
  }

  async exportProject(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: {
        features: { orderBy: { priority: 'asc' } },
        screens: { orderBy: { order: 'asc' } },
        estimate: true,
        user: { select: { name: true, email: true, company: true } },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return {
      project: {
        name: project.name,
        description: project.description,
        type: project.type,
        status: project.status,
        aiAnalysis: project.aiAnalysis,
      },
      features: project.features,
      screens: project.screens,
      estimate: project.estimate,
      client: project.user,
      exportedAt: new Date().toISOString(),
    };
  }

  // --- Cache helpers ---

  private async invalidateProjectCache(projectId: string, userId: string) {
    await this.cacheManager.del(`project:${projectId}`);
    await this.invalidateProjectListCache(userId);
  }

  private async invalidateProjectListCache(userId: string) {
    // Delete known list cache patterns
    // For simplicity, we delete the default first page cache
    await this.cacheManager.del(`projects:${userId}:1:10::::`);
  }
}
