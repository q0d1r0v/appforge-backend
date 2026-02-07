import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UsageService } from '@/modules/usage/usage.service';
import { UsageReportQueryDto } from './dto/usage-report-query.dto';
import { SubscriptionTier } from '@prisma/client';
import { paginate, paginationArgs } from '@/common/helpers/pagination.helper';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private usageService: UsageService,
  ) {}

  async getBillingSummary(userId: string) {
    const [user, subscription] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, tier: true, trialEndsAt: true, trialExpired: true, stripeCustomerId: true },
      }),
      this.prisma.subscription.findUnique({ where: { userId } }),
    ]);

    if (!user) throw new NotFoundException('User not found');

    const usage = await this.usageService.getUsageSummary(userId, user.tier);

    return {
      currentPlan: user.tier,
      isTrialing: !user.trialExpired && user.trialEndsAt ? new Date() < user.trialEndsAt : false,
      trialEndsAt: user.trialEndsAt,
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            canceledAt: subscription.canceledAt,
          }
        : null,
      usage: {
        tokensUsed: usage.totalTokens,
        tokenQuota: usage.monthlyQuota,
        quotaUsedPercent: usage.quotaUsedPercent,
        requestsToday: usage.dailyRequestsUsed,
        dailyRequestsLimit: usage.dailyRequestsLimit,
      },
      hasStripeCustomer: !!user.stripeCustomerId,
    };
  }

  async getInvoices(userId: string, query: PaginationQueryDto) {
    const where = { userId };

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(query),
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return paginate(items, total, query);
  }

  async getInvoiceById(userId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async getUsageReport(userId: string, query: UsageReportQueryDto) {
    const where: any = { userId };

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [tokensByDay, totalStats] = await Promise.all([
      this.prisma.promptHistory.groupBy({
        by: ['createdAt'],
        where,
        _sum: { tokens: true },
        _count: { id: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.promptHistory.aggregate({
        where,
        _sum: { tokens: true },
        _count: { id: true },
        _avg: { tokens: true },
      }),
    ]);

    return {
      period: {
        startDate: query.startDate || null,
        endDate: query.endDate || null,
      },
      totals: {
        totalTokens: totalStats._sum.tokens || 0,
        totalRequests: totalStats._count.id || 0,
        avgTokensPerRequest: Math.round(totalStats._avg.tokens || 0),
      },
      daily: tokensByDay.map((d) => ({
        date: d.createdAt,
        tokens: d._sum.tokens || 0,
        requests: d._count.id || 0,
      })),
    };
  }
}
