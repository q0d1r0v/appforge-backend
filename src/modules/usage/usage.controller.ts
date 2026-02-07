import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UsageService } from './usage.service';
import { UsageHistoryQueryDto } from './dto/usage-summary.dto';

@ApiTags('Usage')
@ApiBearerAuth('JWT')
@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current usage summary' })
  getMyUsage(@CurrentUser() user: any) {
    return this.usageService.getUsageSummary(user.id, user.tier);
  }

  @Get('me/history')
  @ApiOperation({ summary: 'Get usage history' })
  getMyHistory(
    @CurrentUser('id') userId: string,
    @Query() query: UsageHistoryQueryDto,
  ) {
    return this.usageService.getUsageHistory(userId, query);
  }
}
