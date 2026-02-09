import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { OrganizationRole, Project } from '@prisma/client';

export type ProjectAccessLevel = 'owner' | 'org_admin' | 'org_member';

export interface ProjectAccessResult {
  project: Project;
  accessLevel: ProjectAccessLevel;
}

@Injectable()
export class ProjectAccessService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if a user can access a project.
   * Returns the project and access level, or throws NotFoundException.
   *
   * Access logic:
   * 1. Direct owner (project.userId === userId) → 'owner'
   * 2. Organization OWNER/ADMIN → 'org_admin'
   * 3. Organization MEMBER → 'org_member'
   * 4. No access → NotFoundException (don't reveal project exists)
   */
  async canAccessProject(
    projectId: string,
    userId: string,
  ): Promise<ProjectAccessResult> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // 1. Direct owner
    if (project.userId === userId) {
      return { project, accessLevel: 'owner' };
    }

    // 2. Organization member
    if (project.organizationId) {
      const member = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: project.organizationId,
            userId,
          },
        },
      });

      if (member) {
        const isAdmin = (
          [OrganizationRole.OWNER, OrganizationRole.ADMIN] as OrganizationRole[]
        ).includes(member.role);

        return {
          project,
          accessLevel: isAdmin ? 'org_admin' : 'org_member',
        };
      }
    }

    // 3. No access — don't reveal project exists
    throw new NotFoundException('Project not found');
  }

  /**
   * Check if a user can modify a project (create/update/delete/AI operations).
   * Only project owner and org OWNER/ADMIN can modify.
   * Org MEMBERs get ForbiddenException (they know the project exists via read access).
   */
  async canModifyProject(
    projectId: string,
    userId: string,
  ): Promise<ProjectAccessResult> {
    const result = await this.canAccessProject(projectId, userId);

    if (result.accessLevel === 'org_member') {
      throw new ForbiddenException(
        'You do not have permission to modify this project',
      );
    }

    return result;
  }

  /**
   * Verify user can create a project in an organization.
   * Only org OWNER/ADMIN can create projects.
   */
  async canCreateInOrganization(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException(
        'You are not a member of this organization',
      );
    }

    if (
      !(
        [OrganizationRole.OWNER, OrganizationRole.ADMIN] as OrganizationRole[]
      ).includes(member.role)
    ) {
      throw new ForbiddenException(
        'Only organization owners and admins can create projects',
      );
    }
  }
}
