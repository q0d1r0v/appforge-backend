import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AIService } from '@/modules/ai/ai.service';
import { EventsGateway } from '@/modules/events/events.gateway';
import { ProjectAccessService } from '@/common/services/project-access.service';
import { CreateScreenDto } from './dto/create-screen.dto';
import { UpdateScreenDto } from './dto/update-screen.dto';
import { ProjectStatus } from '@prisma/client';

@Injectable()
export class WireframesService {
  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
    private eventsGateway: EventsGateway,
    private projectAccess: ProjectAccessService,
  ) {}

  async findAllByProject(projectId: string, userId: string) {
    await this.projectAccess.canAccessProject(projectId, userId);

    return this.prisma.screen.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(screenId: string, userId: string) {
    const screen = await this.prisma.screen.findUnique({
      where: { id: screenId },
      include: { project: true },
    });

    if (!screen) {
      throw new NotFoundException('Screen not found');
    }

    await this.projectAccess.canAccessProject(screen.projectId, userId);

    return screen;
  }

  async create(userId: string, dto: CreateScreenDto) {
    await this.projectAccess.canModifyProject(dto.projectId, userId);

    return this.prisma.screen.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        type: dto.type,
        order: dto.order,
        wireframe: dto.wireframe || {},
      },
    });
  }

  async update(screenId: string, userId: string, dto: UpdateScreenDto) {
    const screen = await this.prisma.screen.findUnique({
      where: { id: screenId },
      include: { project: true },
    });

    if (!screen) {
      throw new NotFoundException('Screen not found');
    }

    await this.projectAccess.canModifyProject(screen.projectId, userId);

    return this.prisma.screen.update({
      where: { id: screenId },
      data: dto,
    });
  }

  async remove(screenId: string, userId: string) {
    const screen = await this.prisma.screen.findUnique({
      where: { id: screenId },
      include: { project: true },
    });

    if (!screen) {
      throw new NotFoundException('Screen not found');
    }

    await this.projectAccess.canModifyProject(screen.projectId, userId);

    await this.prisma.screen.delete({ where: { id: screenId } });

    // Reorder remaining screens
    await this.prisma.screen.updateMany({
      where: {
        projectId: screen.projectId,
        order: { gt: screen.order },
      },
      data: { order: { decrement: 1 } },
    });

    return { message: 'Screen deleted successfully' };
  }

  async generateWireframes(projectId: string, userId: string) {
    await this.projectAccess.canModifyProject(projectId, userId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        screens: { orderBy: { order: 'asc' } },
        features: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.WIREFRAMING },
    });

    this.eventsGateway.emitProjectStatusChanged(userId, projectId, {
      status: ProjectStatus.WIREFRAMING,
      projectName: project.name,
    });

    const featureNames = project.features.map((f) => f.name);

    // Generate wireframes in background
    this.generateWireframesInBackground(
      project.id,
      userId,
      project.description,
      project.screens,
      featureNames,
    );

    return { message: 'Wireframe generation started', screenCount: project.screens.length };
  }

  private async generateWireframesInBackground(
    projectId: string,
    userId: string,
    description: string,
    screens: any[],
    features: string[],
  ) {
    try {
      for (let i = 0; i < screens.length; i++) {
        const screen = screens[i];

        this.eventsGateway.emitWireframeProgress(userId, projectId, {
          screenName: screen.name,
          currentScreen: i + 1,
          totalScreens: screens.length,
        });

        const wireframe = await this.aiService.generateWireframe(
          screen.name,
          screen.type,
          description,
          features,
          projectId,
        );

        await this.prisma.screen.update({
          where: { id: screen.id },
          data: { wireframe },
        });
      }

      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.READY },
      });

      this.eventsGateway.emitProjectStatusChanged(userId, projectId, {
        status: ProjectStatus.READY,
        projectName: screens[0]?.name || 'Project',
      });

      this.eventsGateway.emitWireframeCompleted(userId, projectId);
    } catch (error) {
      console.error('Wireframe generation failed:', error);

      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.DRAFT },
      });

      this.eventsGateway.emitError(userId, {
        message: 'Wireframe generation failed. Please try again.',
        context: `project:${projectId}`,
      });
    }
  }

  async reorderScreens(
    projectId: string,
    userId: string,
    screenIds: string[],
  ) {
    await this.projectAccess.canModifyProject(projectId, userId);

    const updates = screenIds.map((id, index) =>
      this.prisma.screen.update({
        where: { id },
        data: { order: index + 1 },
      }),
    );

    await this.prisma.$transaction(updates);

    return this.prisma.screen.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });
  }
}
