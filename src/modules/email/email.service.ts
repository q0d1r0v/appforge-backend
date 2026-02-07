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
}
