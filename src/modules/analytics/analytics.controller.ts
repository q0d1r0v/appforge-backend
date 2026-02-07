import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@ApiTags('Analytics')
@ApiBearerAuth('JWT')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('usage')
  @ApiOperation({ summary: 'Get personal token usage stats' })
  getUsage(
    @CurrentUser('id') userId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getUserTokenUsage(userId, query);
  }

  @Get('usage/trend')
  @ApiOperation({ summary: 'Get usage trend over months' })
  getUsageTrend(
    @CurrentUser('id') userId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getUsageTrend(userId, query);
  }

  @Get('projects/:id/usage')
  @ApiOperation({ summary: 'Get token usage for a specific project' })
  getProjectUsage(
    @CurrentUser('id') userId: string,
    @Param('id') projectId: string,
  ) {
    return this.analyticsService.getProjectTokenUsage(userId, projectId);
  }

  @Get('admin/system')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get system-wide stats (admin)' })
  getSystemStats() {
    return this.analyticsService.getSystemStats();
  }

  @Get('admin/revenue')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get revenue analytics (admin)' })
  getRevenue(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getRevenueAnalytics(query);
  }

  @Get('admin/tiers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get tier distribution (admin)' })
  getTierDistribution() {
    return this.analyticsService.getTierDistribution();
  }
}
