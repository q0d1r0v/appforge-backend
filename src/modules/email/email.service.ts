import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly frontendUrl: string;
  private readonly fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('email.sendgridApiKey');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    }
    this.frontendUrl = this.configService.get<string>('email.frontendUrl')!;
    this.fromEmail = this.configService.get<string>('email.fromEmail')!;
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    try {
      await sgMail.send({
        to,
        from: this.fromEmail,
        subject: 'Welcome to AppForge!',
        html: this.buildWelcomeHtml(name),
      });
      this.logger.log(`Welcome email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${to}`, error);
    }
  }

  async sendEmailVerificationEmail(
    to: string,
    name: string,
    verificationToken: string,
  ): Promise<void> {
    try {
      const verifyUrl = `${this.frontendUrl}/verify-email?token=${verificationToken}`;
      await sgMail.send({
        to,
        from: this.fromEmail,
        subject: 'Verify Your AppForge Email Address',
        html: this.buildEmailVerificationHtml(name, verifyUrl),
      });
      this.logger.log(`Email verification sent to ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email verification to ${to}`,
        error,
      );
    }
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetToken: string,
  ): Promise<void> {
    try {
      const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;
      await sgMail.send({
        to,
        from: this.fromEmail,
        subject: 'Reset Your AppForge Password',
        html: this.buildPasswordResetHtml(name, resetUrl),
      });
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${to}`,
        error,
      );
    }
  }

  async sendProjectReadyEmail(
    to: string,
    name: string,
    projectName: string,
    projectId: string,
  ): Promise<void> {
    try {
      const projectUrl = `${this.frontendUrl}/projects/${projectId}`;
      await sgMail.send({
        to,
        from: this.fromEmail,
        subject: `Your project "${projectName}" is ready!`,
        html: this.buildProjectReadyHtml(name, projectName, projectUrl),
      });
      this.logger.log(`Project ready email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send project ready email to ${to}`, error);
    }
  }

  async sendOrganizationInviteEmail(
    to: string,
    inviterName: string,
    orgName: string,
    token: string,
  ): Promise<void> {
    try {
      const inviteUrl = `${this.frontendUrl}/invites/${token}`;
      await sgMail.send({
        to,
        from: this.fromEmail,
        subject: `You've been invited to join ${orgName} on AppForge`,
        html: this.buildOrgInviteHtml(inviterName, orgName, inviteUrl),
      });
      this.logger.log(`Organization invite email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send organization invite email to ${to}`, error);
    }
  }

  async sendTrialExpiringEmail(to: string, name: string, daysLeft: number): Promise<void> {
    try {
      await sgMail.send({
        to,
        from: this.fromEmail,
        subject: `Your AppForge trial expires in ${daysLeft} days`,
        html: this.buildTrialExpiringHtml(name, daysLeft),
      });
      this.logger.log(`Trial expiring email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send trial expiring email to ${to}`, error);
    }
  }

  async sendTrialExpiredEmail(to: string, name: string): Promise<void> {
    try {
      await sgMail.send({
        to,
        from: this.fromEmail,
        subject: 'Your AppForge trial has expired',
        html: this.buildTrialExpiredHtml(name),
      });
      this.logger.log(`Trial expired email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send trial expired email to ${to}`, error);
    }
  }

  async sendQuotaWarningEmail(to: string, name: string, usedPercent: number): Promise<void> {
    try {
      await sgMail.send({
        to,
        from: this.fromEmail,
        subject: `You've used ${usedPercent}% of your AppForge token quota`,
        html: this.buildQuotaWarningHtml(name, usedPercent),
      });
      this.logger.log(`Quota warning email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send quota warning email to ${to}`, error);
    }
  }

  private buildWelcomeHtml(name: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1;">Welcome to AppForge!</h1>
        <p>Hi ${name},</p>
        <p>Thank you for joining AppForge! We're excited to help you bring your app ideas to life.</p>
        <p>With AppForge, you can:</p>
        <ul>
          <li>Describe your app idea and get AI-powered analysis</li>
          <li>Generate wireframes and prototypes automatically</li>
          <li>Get accurate time and cost estimates</li>
          <li>Export your project for development</li>
        </ul>
        <a href="${this.frontendUrl}/projects/new"
           style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          Create Your First Project
        </a>
        <p style="margin-top: 24px; color: #666;">The AppForge Team</p>
      </div>
    `;
  }

  private buildEmailVerificationHtml(name: string, verifyUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1;">Verify Your Email</h1>
        <p>Hi ${name},</p>
        <p>Welcome to AppForge! Please verify your email address by clicking the button below:</p>
        <a href="${verifyUrl}"
           style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          Verify Email Address
        </a>
        <p style="margin-top: 24px; color: #666;">If you didn't create an account, you can safely ignore this email.</p>
        <p style="color: #666;">This link expires in 24 hours.</p>
      </div>
    `;
  }

  private buildPasswordResetHtml(name: string, resetUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1;">Reset Your Password</h1>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the button below to create a new one:</p>
        <a href="${resetUrl}"
           style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          Reset Password
        </a>
        <p style="margin-top: 24px; color: #666;">If you didn't request this, you can safely ignore this email.</p>
        <p style="color: #666;">This link expires in 1 hour.</p>
      </div>
    `;
  }

  private buildProjectReadyHtml(
    name: string,
    projectName: string,
    projectUrl: string,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1;">Your Project is Ready!</h1>
        <p>Hi ${name},</p>
        <p>Great news! Your project <strong>"${projectName}"</strong> has been analyzed and is ready for review.</p>
        <p>We've generated:</p>
        <ul>
          <li>Feature breakdown with priorities</li>
          <li>Screen structure and navigation</li>
          <li>AI-powered recommendations</li>
        </ul>
        <a href="${projectUrl}"
           style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          View Your Project
        </a>
        <p style="margin-top: 24px; color: #666;">The AppForge Team</p>
      </div>
    `;
  }

  private buildOrgInviteHtml(inviterName: string, orgName: string, inviteUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1;">You're Invited!</h1>
        <p>${inviterName} has invited you to join <strong>${orgName}</strong> on AppForge.</p>
        <a href="${inviteUrl}"
           style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          Accept Invitation
        </a>
        <p style="margin-top: 24px; color: #666;">This invitation expires in 7 days.</p>
      </div>
    `;
  }

  private buildTrialExpiringHtml(name: string, daysLeft: number): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1;">Your Trial is Ending Soon</h1>
        <p>Hi ${name},</p>
        <p>Your AppForge PRO trial expires in <strong>${daysLeft} days</strong>.</p>
        <p>Upgrade now to keep access to all PRO features including advanced AI generation and code export.</p>
        <a href="${this.frontendUrl}/settings/billing"
           style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          Upgrade Now
        </a>
        <p style="margin-top: 24px; color: #666;">The AppForge Team</p>
      </div>
    `;
  }

  private buildTrialExpiredHtml(name: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1;">Your Trial Has Expired</h1>
        <p>Hi ${name},</p>
        <p>Your AppForge PRO trial has expired. Your account has been moved to the FREE plan.</p>
        <p>You can still use AppForge with limited features. Upgrade anytime to unlock the full power of AppForge.</p>
        <a href="${this.frontendUrl}/settings/billing"
           style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          View Plans
        </a>
        <p style="margin-top: 24px; color: #666;">The AppForge Team</p>
      </div>
    `;
  }

  private buildQuotaWarningHtml(name: string, usedPercent: number): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #f59e0b;">Token Quota Warning</h1>
        <p>Hi ${name},</p>
        <p>You've used <strong>${usedPercent}%</strong> of your monthly AI token quota.</p>
        <p>Consider upgrading your plan or purchasing additional token packs to avoid interruptions.</p>
        <a href="${this.frontendUrl}/settings/billing"
           style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          Manage Billing
        </a>
        <p style="margin-top: 24px; color: #666;">The AppForge Team</p>
      </div>
    `;
  }
}
