import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UsageService } from '@/modules/usage/usage.service';

@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(private usageService: UsageService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const quota = await this.usageService.checkQuota(user.id, user.tier);

    if (!quota.allowed) {
      throw new ForbiddenException(quota.reason);
    }

    return true;
  }
}
