import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailService } from '@/modules/email/email.service';
import { EventsGateway } from '@/modules/events/events.gateway';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { OrganizationRole, InviteStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private eventsGateway: EventsGateway,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    let slug = dto.slug || this.generateSlug(dto.name);

    // Check if slug already exists; if so, append a random suffix
    const existingSlug = await this.prisma.organization.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      slug = `${slug}-${this.randomSuffix()}`;
    }

    const organization = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.name,
          slug,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          role: OrganizationRole.OWNER,
        },
      });

      return org;
    });

    return organization;
  }

  async findById(orgId: string, userId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Verify user is a member
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException(
        'You are not a member of this organization',
      );
    }

    return org;
  }

  async findMyOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    }));
  }

  async update(orgId: string, userId: string, dto: UpdateOrganizationDto) {
    await this.verifyRole(orgId, userId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: dto,
    });

    return updated;
  }

  async delete(orgId: string, userId: string) {
    await this.verifyRole(orgId, userId, [OrganizationRole.OWNER]);

    await this.prisma.$transaction(async (tx) => {
      await tx.organizationInvite.deleteMany({
        where: { organizationId: orgId },
      });
      await tx.organizationMember.deleteMany({
        where: { organizationId: orgId },
      });
      await tx.organization.delete({ where: { id: orgId } });
    });

    return { message: 'Organization deleted successfully' };
  }

  async getMembers(orgId: string, userId: string) {
    // Verify the requesting user is a member
    await this.verifyMembership(orgId, userId);

    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
    }));
  }

  async inviteMember(orgId: string, userId: string, dto: InviteMemberDto) {
    await this.verifyRole(orgId, userId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);

    // Check if user is already a member by email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      const existingMember = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMember) {
        throw new ConflictException(
          'This user is already a member of the organization',
        );
      }
    }

    // Check if there's already a pending invite for this email
    const existingInvite = await this.prisma.organizationInvite.findFirst({
      where: {
        organizationId: orgId,
        email: dto.email,
        status: InviteStatus.PENDING,
      },
    });

    if (existingInvite) {
      throw new ConflictException(
        'A pending invite already exists for this email',
      );
    }

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await this.prisma.organizationInvite.create({
      data: {
        organizationId: orgId,
        email: dto.email,
        role: dto.role || OrganizationRole.MEMBER,
        token,
        invitedBy: userId,
        expiresAt,
      },
    });

    // Get inviter name and org name for the email
    const [inviter, org] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      }),
      this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
      }),
    ]);

    // Send invite email (fire-and-forget)
    this.emailService.sendOrganizationInviteEmail(
      dto.email,
      inviter?.name || 'A team member',
      org?.name || 'an organization',
      token,
    );

    return invite;
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.organizationInvite.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('This invite is no longer valid');
    }

    if (new Date() > invite.expiresAt) {
      // Mark as expired
      await this.prisma.organizationInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.EXPIRED },
      });
      throw new BadRequestException('This invite has expired');
    }

    // Verify the accepting user's email matches the invite email
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user || user.email !== invite.email) {
      throw new ForbiddenException(
        'This invite was sent to a different email address',
      );
    }

    // Check if already a member
    const existingMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invite.organizationId,
          userId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException(
        'You are already a member of this organization',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const member = await tx.organizationMember.create({
        data: {
          organizationId: invite.organizationId,
          userId,
          role: invite.role,
        },
      });

      await tx.organizationInvite.update({
        where: { id: invite.id },
        data: {
          status: InviteStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      return member;
    });

    // Notify the inviter
    this.eventsGateway.emitNotification(invite.invitedBy, {
      type: 'org:invite-accepted',
      title: 'Invite Accepted',
      message: `${user.email} has joined ${invite.organization.name}`,
    });

    return result;
  }

  async revokeInvite(orgId: string, inviteId: string, userId: string) {
    await this.verifyRole(orgId, userId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);

    const invite = await this.prisma.organizationInvite.findFirst({
      where: { id: inviteId, organizationId: orgId },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('Only pending invites can be revoked');
    }

    const updated = await this.prisma.organizationInvite.update({
      where: { id: inviteId },
      data: { status: InviteStatus.REVOKED },
    });

    return updated;
  }

  async removeMember(orgId: string, memberId: string, userId: string) {
    await this.verifyRole(orgId, userId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);

    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Cannot remove yourself if you are OWNER
    if (member.userId === userId && member.role === OrganizationRole.OWNER) {
      throw new BadRequestException(
        'Owner cannot remove themselves from the organization',
      );
    }

    // Admins cannot remove other admins or owners
    const actingMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (
      actingMember?.role === OrganizationRole.ADMIN &&
      (member.role === OrganizationRole.OWNER ||
        member.role === OrganizationRole.ADMIN)
    ) {
      throw new ForbiddenException(
        'Admins cannot remove other admins or owners',
      );
    }

    await this.prisma.organizationMember.delete({
      where: { id: memberId },
    });

    return { message: 'Member removed successfully' };
  }

  async changeMemberRole(
    orgId: string,
    memberId: string,
    userId: string,
    role: OrganizationRole,
  ) {
    await this.verifyRole(orgId, userId, [OrganizationRole.OWNER]);

    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Cannot change own role
    if (member.userId === userId) {
      throw new BadRequestException('You cannot change your own role');
    }

    const updated = await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { role },
    });

    return updated;
  }

  // --- Private helpers ---

  private async verifyMembership(orgId: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException(
        'You are not a member of this organization',
      );
    }

    return member;
  }

  private async verifyRole(
    orgId: string,
    userId: string,
    allowedRoles: OrganizationRole[],
  ) {
    const member = await this.verifyMembership(orgId, userId);

    if (!allowedRoles.includes(member.role)) {
      throw new ForbiddenException(
        'You do not have the required role to perform this action',
      );
    }

    return member;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private randomSuffix(): string {
    return Math.random().toString(36).substring(2, 8);
  }
}
