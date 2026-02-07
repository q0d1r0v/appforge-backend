import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { SubscriptionTier } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { getTierConfig } from '@/config/tier.config';
import { paginate, paginationArgs } from '@/common/helpers/pagination.helper';
import { UsageSummaryDto, UsageHistoryQueryDto } from './dto/usage-summary.dto';

@Injectable()
export class UsageService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getCurrentMonthUsage(userId: string) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const cacheKey = `usage:${userId}:${year}:${month}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached as any;

    let record = await this.prisma.usageRecord.findUnique({
      where: { userId_year_month: { userId, year, month } },
    });

    if (!record) {
      // Aggregate from PromptHistory for this month
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

      const aggregation = await this.prisma.promptHistory.aggregate({
        where: {
          userId,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { tokens: true },
        _count: { id: true },
      });

      record = await this.prisma.usageRecord.create({
        data: {
          userId,
          year,
          month,
          totalTokens: aggregation._sum.tokens || 0,
          totalRequests: aggregation._count.id || 0,
        },
      });
    }

    await this.cacheManager.set(cacheKey, record, 60000); // 60s TTL
    return record;
  }

  async getTodayRequestCount(userId: string): Promise<number> {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const cacheKey = `usage:daily:${userId}:${dateStr}`;

    const cached = await this.cacheManager.get<number>(cacheKey);
    if (cached !== undefined && cached !== null) return cached;

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const count = await this.prisma.promptHistory.count({
      where: {
        userId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    await this.cacheManager.set(cacheKey, count, 30000); // 30s TTL
    return count;
  }

  async checkQuota(
    userId: string,
    tier: SubscriptionTier,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const tierConfig = getTierConfig(tier);

    // Check monthly token quota
    const monthUsage = await this.getCurrentMonthUsage(userId);
    if (
      tierConfig.monthlyTokenQuota !== Infinity &&
      monthUsage.totalTokens >= tierConfig.monthlyTokenQuota
    ) {
      return {
        allowed: false,
        reason: `Monthly token quota exceeded. You have used ${monthUsage.totalTokens} of ${tierConfig.monthlyTokenQuota} tokens. Please upgrade your plan.`,
      };
    }

    // Check daily request limit
    const dailyCount = await this.getTodayRequestCount(userId);
    if (
      tierConfig.dailyAiRequests !== Infinity &&
      dailyCount >= tierConfig.dailyAiRequests
    ) {
      return {
        allowed: false,
        reason: `Daily AI request limit reached. You have used ${dailyCount} of ${tierConfig.dailyAiRequests} daily requests. Try again tomorrow or upgrade your plan.`,
      };
    }

    return { allowed: true };
  }

  async recordUsage(userId: string, tokens: number): Promise<void> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    await this.prisma.usageRecord.upsert({
      where: { userId_year_month: { userId, year, month } },
      update: {
        totalTokens: { increment: tokens },
        totalRequests: { increment: 1 },
      },
      create: {
        userId,
        year,
        month,
        totalTokens: tokens,
        totalRequests: 1,
      },
    });

    // Invalidate caches
    const dateStr = now.toISOString().split('T')[0];
    await this.cacheManager.del(`usage:${userId}:${year}:${month}`);
    await this.cacheManager.del(`usage:daily:${userId}:${dateStr}`);
  }

  async getUsageSummary(
    userId: string,
    tier: SubscriptionTier,
  ): Promise<UsageSummaryDto> {
    const tierConfig = getTierConfig(tier);
    const monthUsage = await this.getCurrentMonthUsage(userId);
    const dailyRequestsUsed = await this.getTodayRequestCount(userId);

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const quotaUsedPercent =
      tierConfig.monthlyTokenQuota === Infinity
        ? 0
        : Math.round((monthUsage.totalTokens / tierConfig.monthlyTokenQuota) * 10000) / 100;

    return {
      totalTokens: monthUsage.totalTokens,
      totalRequests: monthUsage.totalRequests,
      monthlyQuota: tierConfig.monthlyTokenQuota,
      dailyRequestsLimit: tierConfig.dailyAiRequests,
      dailyRequestsUsed,
      quotaUsedPercent,
      tier,
      periodStart,
      periodEnd,
    };
  }

  async getUsageHistory(userId: string, query: UsageHistoryQueryDto) {
    const where: any = { userId };

    if (query.year) {
      where.year = query.year;
    }

    const [items, total] = await Promise.all([
      this.prisma.usageRecord.findMany({
        where,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        ...paginationArgs(query),
      }),
      this.prisma.usageRecord.count({ where }),
    ]);

    return paginate(items, total, query);
  }
}
