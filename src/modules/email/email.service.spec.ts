import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

import * as sgMail from '@sendgrid/mail';

describe('EmailService', () => {
  let service: EmailService;

  const mockConfigValues: Record<string, string | undefined> = {
    'email.sendgridApiKey': 'test-api-key',
    'email.frontendUrl': 'https://app.example.com',
    'email.fromEmail': 'noreply@appforge.com',
  };

  const mockConfigService = {
    get: jest.fn((key: string) => mockConfigValues[key]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('constructor', () => {
    it('should set API key when provided', () => {
      expect(sgMail.setApiKey).toHaveBeenCalledWith('test-api-key');
    });

    it('should not set API key when not provided', async () => {
      jest.clearAllMocks();

      const configWithoutKey = {
        get: jest.fn((key: string) => {
          if (key === 'email.sendgridApiKey') return undefined;
          return mockConfigValues[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: configWithoutKey },
        ],
      }).compile();

      module.get<EmailService>(EmailService);

      expect(sgMail.setApiKey).not.toHaveBeenCalled();
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send email with correct params', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([{ statusCode: 202 }]);

      await service.sendWelcomeEmail('user@example.com', 'John');

      expect(sgMail.send).toHaveBeenCalledTimes(1);
      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          from: 'noreply@appforge.com',
          subject: 'Welcome to AppForge!',
          html: expect.stringContaining('John'),
        }),
      );
    });

    it('should not throw when send fails', async () => {
      (sgMail.send as jest.Mock).mockRejectedValue(new Error('SendGrid error'));

      await expect(
        service.sendWelcomeEmail('user@example.com', 'John'),
      ).resolves.not.toThrow();
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send with correct reset URL', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([{ statusCode: 202 }]);

      await service.sendPasswordResetEmail(
        'user@example.com',
        'John',
        'reset-token-123',
      );

      expect(sgMail.send).toHaveBeenCalledTimes(1);
      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          from: 'noreply@appforge.com',
          subject: 'Reset Your AppForge Password',
          html: expect.stringContaining(
            'https://app.example.com/reset-password?token=reset-token-123',
          ),
        }),
      );
    });

    it('should not throw on error', async () => {
      (sgMail.send as jest.Mock).mockRejectedValue(new Error('SendGrid error'));

      await expect(
        service.sendPasswordResetEmail(
          'user@example.com',
          'John',
          'reset-token-123',
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('sendProjectReadyEmail', () => {
    it('should send with correct project URL', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([{ statusCode: 202 }]);

      await service.sendProjectReadyEmail(
        'user@example.com',
        'John',
        'My App',
        'project-456',
      );

      expect(sgMail.send).toHaveBeenCalledTimes(1);
      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          from: 'noreply@appforge.com',
          subject: 'Your project "My App" is ready!',
          html: expect.stringContaining(
            'https://app.example.com/projects/project-456',
          ),
        }),
      );
    });

    it('should not throw on error', async () => {
      (sgMail.send as jest.Mock).mockRejectedValue(new Error('SendGrid error'));

      await expect(
        service.sendProjectReadyEmail(
          'user@example.com',
          'John',
          'My App',
          'project-456',
        ),
      ).resolves.not.toThrow();
    });
  });
});
