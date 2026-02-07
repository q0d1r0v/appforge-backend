import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { AdminUserQueryDto, ChangeUserTierDto } from './dto/admin-query.dto';

@ApiTags('Admin')
@ApiBearerAuth('JWT')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard stats' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users with filtering' })
  getUsers(@Query() query: AdminUserQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Patch('users/:id/tier')
  @ApiOperation({ summary: 'Change user tier (admin)' })
  changeUserTier(
    @Param('id') userId: string,
    @Body() dto: ChangeUserTierDto,
  ) {
    return this.adminService.changeUserTier(userId, dto);
  }

  @Get('ai-calls')
  @ApiOperation({ summary: 'Get recent AI calls' })
  getRecentAiCalls() {
    return this.adminService.getRecentAiCalls();
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get system usage stats' })
  getSystemUsage() {
    return this.adminService.getSystemUsage();
  }
}
