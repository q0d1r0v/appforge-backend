import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '@/common/pipes/parse-uuid.pipe';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { ChangeMemberRoleDto } from './dto/change-member-role.dto';

@ApiTags('Organizations')
@ApiBearerAuth('JWT')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get my organizations' })
  findMyOrganizations(@CurrentUser('id') userId: string) {
    return this.organizationsService.findMyOrganizations(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an organization by ID' })
  findById(
    @Param('id', ParseUUIDPipe) orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.organizationsService.findById(orgId, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an organization' })
  update(
    @Param('id', ParseUUIDPipe) orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(orgId, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an organization' })
  delete(
    @Param('id', ParseUUIDPipe) orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.organizationsService.delete(orgId, userId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get organization members' })
  getMembers(
    @Param('id', ParseUUIDPipe) orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.organizationsService.getMembers(orgId, userId);
  }

  @Post(':id/invites')
  @ApiOperation({ summary: 'Invite a member to the organization' })
  inviteMember(
    @Param('id', ParseUUIDPipe) orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.organizationsService.inviteMember(orgId, userId, dto);
  }

  @Delete(':id/invites/:inviteId')
  @ApiOperation({ summary: 'Revoke an organization invite' })
  revokeInvite(
    @Param('id', ParseUUIDPipe) orgId: string,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.organizationsService.revokeInvite(orgId, inviteId, userId);
  }

  @Post('invites/:token/accept')
  @ApiOperation({ summary: 'Accept an organization invite' })
  acceptInvite(
    @Param('token') token: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.organizationsService.acceptInvite(token, userId);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from the organization' })
  removeMember(
    @Param('id', ParseUUIDPipe) orgId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.organizationsService.removeMember(orgId, memberId, userId);
  }

  @Patch(':id/members/:memberId/role')
  @ApiOperation({ summary: 'Change a member role in the organization' })
  changeMemberRole(
    @Param('id', ParseUUIDPipe) orgId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ChangeMemberRoleDto,
  ) {
    return this.organizationsService.changeMemberRole(
      orgId,
      memberId,
      userId,
      dto.role,
    );
  }
}
