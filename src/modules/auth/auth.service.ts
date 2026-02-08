import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomUUID, randomBytes } from 'crypto';
import { SubscriptionTier } from '@prisma/client';
import { UsersService } from '@/modules/users/users.service';
import { EmailService } from '@/modules/email/email.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private prisma: PrismaService,
  ) { }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    await this.usersService.updateLastLogin(user.id);

    return {
      user,
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);

    // Set up 14-day PRO trial
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        tier: SubscriptionTier.PRO,
        trialStartedAt: new Date(),
        trialEndsAt,
      },
    });

    const { password, ...result } = updatedUser as any;
    const payload = { sub: updatedUser.id, email: updatedUser.email, role: updatedUser.role };

    // Send verification email (fire-and-forget)
    this.createEmailVerification(updatedUser.id, updatedUser.email, updatedUser.name)
      .catch((err) => console.error('Failed to create email verification:', err));

    return {
      user: result,
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('app.jwt.refreshSecret'),
      });

      const user = await this.usersService.findById(payload.sub) as any;
      if (!user) {
        throw new BadRequestException('Invalid refresh token');
      }

      const newPayload = { sub: user.id as string, email: user.email as string, role: user.role as string };

      return {
        accessToken: this.jwtService.sign(newPayload),
        refreshToken: this.generateRefreshToken(newPayload),
      };
    } catch {
      throw new BadRequestException('Invalid or expired refresh token');
    }
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If an account with that email exists, a reset link has been sent' };
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    this.emailService.sendPasswordResetEmail(user.email, user.name, token).catch((err) =>
      console.error('Failed to send password reset email:', err),
    );

    return { message: 'If an account with that email exists, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const resetRecord = await this.prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Password reset successfully' };
  }

  async verifyEmail(token: string) {
    const verification = await this.prisma.emailVerification.findUnique({
      where: { token },
    });

    if (!verification || verification.usedAt || verification.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { emailVerified: true },
      }),
      this.prisma.emailVerification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Send welcome email now that user is verified (fire-and-forget)
    const user = await this.prisma.user.findUnique({
      where: { id: verification.userId },
    });
    if (user) {
      this.emailService
        .sendWelcomeEmail(user.email, user.name)
        .catch((err) => console.error('Failed to send welcome email:', err));
    }

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.usersService.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user || user.emailVerified) {
      return { message: 'If the account exists and is unverified, a verification email has been sent' };
    }

    // Invalidate existing unused tokens
    await this.prisma.emailVerification.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    await this.createEmailVerification(user.id, user.email, user.name);

    return { message: 'If the account exists and is unverified, a verification email has been sent' };
  }

  private async createEmailVerification(userId: string, email: string, name: string): Promise<void> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.emailVerification.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    this.emailService
      .sendEmailVerificationEmail(email, name, token)
      .catch((err) => console.error('Failed to send email verification:', err));
  }

  private generateRefreshToken(payload: { sub: string; email: string; role: string }) {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('app.jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('app.jwt.refreshExpiresIn') as any,
    });
  }
}
