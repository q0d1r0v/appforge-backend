import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionTier } from '@prisma/client';
import { paginate, paginationArgs } from '@/common/helpers/pagination.helper';
import { AdminUserQueryDto, ChangeUserTierDto } from './dto/admin-query.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      newUsersThisMonth,
      totalProjects,
      activeSubscriptions,
      tierDistribution,
      totalRevenue,
      totalTokensUsed,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      this.prisma.project.count(),
      this.prisma.subscription.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.user.groupBy({
        by: ['tier'],
        _count: { id: true },
      }),
      this.prisma.invoice.aggregate({
        where: { status: 'paid' },
        _sum: { amountPaid: true },
      }),
      this.prisma.promptHistory.aggregate({
        _sum: { tokens: true },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
      },
      projects: { total: totalProjects },
      subscriptions: { active: activeSubscriptions },
      tiers: tierDistribution.map((d) => ({
        tier: d.tier,
        count: d._count.id,
      })),
      revenue: {
        totalCents: totalRevenue._sum.amountPaid || 0,
        currency: 'usd',
      },
      tokenUsage: {
        totalTokens: totalTokensUsed._sum.tokens || 0,
      },
    };
  }

  async getUsers(query: AdminUserQueryDto) {
    const where: any = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.tier) {
      where.tier = query.tier as SubscriptionTier;
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          tier: true,
          createdAt: true,
          lastLogin: true,
          trialEndsAt: true,
          trialExpired: true,
          _count: {
            select: { projects: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(query),
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(items, total, query);
  }

  async changeUserTier(userId: string, dto: ChangeUserTierDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { tier: dto.tier as SubscriptionTier },
      select: { id: true, email: true, name: true, tier: true },
    });

    return updated;
  }

  async getRecentAiCalls(limit: number = 20) {
    const calls = await this.prisma.promptHistory.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        input: true,
        model: true,
        tokens: true,
        duration: true,
        createdAt: true,
        userId: true,
        projectId: true,
      },
    });

    return calls;
  }

  async getSystemUsage() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const monthlyUsage = await this.prisma.usageRecord.aggregate({
      where: { year, month },
      _sum: { totalTokens: true, totalRequests: true },
    });

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const dailyBreakdown = await this.prisma.promptHistory.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: last30Days } },
      _sum: { tokens: true },
      _count: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      currentMonth: {
        totalTokens: monthlyUsage._sum.totalTokens || 0,
        totalRequests: monthlyUsage._sum.totalRequests || 0,
      },
      dailyBreakdown: dailyBreakdown.map((d) => ({
        date: d.createdAt,
        tokens: d._sum.tokens || 0,
        requests: d._count.id || 0,
      })),
    };
  }
}
