import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { SKIP_EMAIL_VERIFICATION_KEY } from '@/common/decorators/skip-email-verification.decorator';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const skipVerification = this.reflector.getAllAndOverride<boolean>(
      SKIP_EMAIL_VERIFICATION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipVerification) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return true;
    }

    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Email verification required. Please verify your email address before accessing this resource.',
      );
    }

    return true;
  }
}
