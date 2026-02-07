import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailService } from '@/modules/email/email.service';
import { SubscriptionTier } from '@prisma/client';
import { getTierConfig } from '@/config/tier.config';

@Injectable()
export class UsageScheduler {
  private readonly logger = new Logger(UsageScheduler.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /** Warn users whose trial expires in 3 days */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleTrialExpiringWarnings() {
    this.logger.log('Checking for expiring trials...');

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const startOfDay = new Date(threeDaysFromNow);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(threeDaysFromNow);
    endOfDay.setHours(23, 59, 59, 999);

    const expiringUsers = await this.prisma.user.findMany({
      where: {
        trialExpired: false,
        trialEndsAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: { id: true, email: true, name: true, trialEndsAt: true },
    });

    for (const user of expiringUsers) {
      const daysLeft = Math.ceil(
        (user.trialEndsAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      this.emailService
        .sendTrialExpiringEmail(user.email, user.name, daysLeft)
        .catch((err) =>
          this.logger.error(`Failed to send trial warning to ${user.email}`, err),
        );
    }

    this.logger.log(`Sent trial expiring warnings to ${expiringUsers.length} users`);
  }

  /** Expire trials that have passed their end date */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredTrials() {
    this.logger.log('Checking for expired trials...');

    const expiredUsers = await this.prisma.user.findMany({
      where: {
        trialExpired: false,
        trialEndsAt: { lt: new Date() },
        // Only expire users who don't have an active paid subscription
        subscription: null,
      },
      select: { id: true, email: true, name: true },
    });

    for (const user of expiredUsers) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          tier: SubscriptionTier.FREE,
          trialExpired: true,
        },
      });

      this.emailService
        .sendTrialExpiredEmail(user.email, user.name)
        .catch((err) =>
          this.logger.error(`Failed to send trial expired email to ${user.email}`, err),
        );
    }

    this.logger.log(`Expired ${expiredUsers.length} trials`);
  }

  /** Warn users at 80% quota usage */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async handleQuotaWarnings() {
    this.logger.log('Checking quota usage...');

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Find users with significant usage this month
    const records = await this.prisma.usageRecord.findMany({
      where: { year, month },
      include: {
        user: {
          select: { id: true, email: true, name: true, tier: true },
        },
      },
    });

    let warned = 0;
    for (const record of records) {
      const tierConfig = getTierConfig(record.user.tier);
      if (tierConfig.monthlyTokenQuota === Infinity) continue;

      const usedPercent = Math.round(
        (record.totalTokens / tierConfig.monthlyTokenQuota) * 100,
      );

      // Warn at 80% usage
      if (usedPercent >= 80 && usedPercent < 100) {
        this.emailService
          .sendQuotaWarningEmail(record.user.email, record.user.name, usedPercent)
          .catch((err) =>
            this.logger.error(`Failed to send quota warning to ${record.user.email}`, err),
          );
        warned++;
      }
    }

    this.logger.log(`Sent quota warnings to ${warned} users`);
  }
}
