import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ProjectAccessService } from '@/common/services/project-access.service';
import { UpdateConnectionsDto } from './dto/update-connections.dto';

@Injectable()
export class PrototypesService {
  constructor(
    private prisma: PrismaService,
    private projectAccess: ProjectAccessService,
  ) {}

  async getPrototype(projectId: string, userId: string) {
    await this.projectAccess.canAccessProject(projectId, userId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        screens: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        type: project.type,
      },
      screens: project.screens.map((screen) => ({
        id: screen.id,
        name: screen.name,
        type: screen.type,
        order: screen.order,
        wireframe: screen.wireframe,
        connections: screen.connections,
      })),
      startScreenId: project.screens[0]?.id || null,
    };
  }

  async updateConnections(userId: string, dto: UpdateConnectionsDto) {
    const screen = await this.prisma.screen.findUnique({
      where: { id: dto.screenId },
      include: { project: true },
    });

    if (!screen) {
      throw new NotFoundException('Screen not found');
    }

    await this.projectAccess.canModifyProject(screen.projectId, userId);

    return this.prisma.screen.update({
      where: { id: dto.screenId },
      data: { connections: dto.connections as any },
    });
  }

  async validateConnections(projectId: string, userId: string) {
    await this.projectAccess.canAccessProject(projectId, userId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { screens: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const screenIds = new Set(project.screens.map((s) => s.id));
    const issues: { screenId: string; screenName: string; issue: string }[] = [];

    for (const screen of project.screens) {
      const connections = (screen.connections as any[]) || [];
      for (const conn of connections) {
        if (!screenIds.has(conn.targetScreenId)) {
          issues.push({
            screenId: screen.id,
            screenName: screen.name,
            issue: `Target screen ${conn.targetScreenId} does not exist`,
          });
        }
      }
    }

    return {
      valid: issues.length === 0,
      totalScreens: project.screens.length,
      issues,
    };
  }
}
