import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /** Get user's token usage stats */
  async getUserTokenUsage(userId: string, query: AnalyticsQueryDto) {
    const where = this.buildDateFilter(userId, query);

    const stats = await this.prisma.promptHistory.aggregate({
      where,
      _sum: { tokens: true },
      _count: { id: true },
      _avg: { tokens: true, duration: true },
    });

    return {
      totalTokens: stats._sum.tokens || 0,
      totalRequests: stats._count.id || 0,
      avgTokensPerRequest: Math.round(stats._avg.tokens || 0),
      avgDuration: Math.round(stats._avg.duration || 0),
    };
  }

  /** Get usage trend over time */
  async getUsageTrend(userId: string, query: AnalyticsQueryDto) {
    const records = await this.prisma.usageRecord.findMany({
      where: { userId },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
      take: 12,
    });

    return records.map((r) => ({
      year: r.year,
      month: r.month,
      totalTokens: r.totalTokens,
      totalRequests: r.totalRequests,
    }));
  }

  /** Get per-project token usage */
  async getProjectTokenUsage(userId: string, projectId: string) {
    const stats = await this.prisma.promptHistory.aggregate({
      where: { userId, projectId },
      _sum: { tokens: true },
      _count: { id: true },
      _avg: { tokens: true },
    });

    return {
      projectId,
      totalTokens: stats._sum.tokens || 0,
      totalRequests: stats._count.id || 0,
      avgTokensPerRequest: Math.round(stats._avg.tokens || 0),
    };
  }

  // --- Admin analytics ---

  /** Get system-wide stats (admin only) */
  async getSystemStats() {
    const [userCount, projectCount, totalTokens, activeSubscriptions] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.project.count(),
        this.prisma.promptHistory.aggregate({ _sum: { tokens: true } }),
        this.prisma.subscription.count({
          where: { status: 'ACTIVE' },
        }),
      ]);

    return {
      totalUsers: userCount,
      totalProjects: projectCount,
      totalTokensUsed: totalTokens._sum.tokens || 0,
      activeSubscriptions,
    };
  }

  /** Get revenue analytics (admin only) */
  async getRevenueAnalytics(query: AnalyticsQueryDto) {
    const where: any = {};
    if (query.startDate) where.createdAt = { ...where.createdAt, gte: new Date(query.startDate) };
    if (query.endDate) where.createdAt = { ...where.createdAt, lte: new Date(query.endDate) };

    const invoices = await this.prisma.invoice.aggregate({
      where: { ...where, status: 'paid' },
      _sum: { amountPaid: true },
      _count: { id: true },
    });

    return {
      totalRevenue: invoices._sum.amountPaid || 0,
      totalInvoices: invoices._count.id || 0,
      currency: 'usd',
    };
  }

  /** Get tier distribution (admin only) */
  async getTierDistribution() {
    const distribution = await this.prisma.user.groupBy({
      by: ['tier'],
      _count: { id: true },
    });

    return distribution.map((d) => ({
      tier: d.tier,
      count: d._count.id,
    }));
  }

  private buildDateFilter(userId: string, query: AnalyticsQueryDto) {
    const where: any = { userId };
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }
    return where;
  }
}
