import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '@/modules/users/users.service';
import { EmailService } from '@/modules/email/email.service';
import { PrismaService } from '@/prisma/prisma.service';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashed-password',
    name: 'Test User',
    role: 'AGENCY_OWNER',
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateLastLogin: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
  };

  const mockEmailService = {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        'app.jwt.refreshSecret': 'test-refresh-secret',
        'app.jwt.refreshExpiresIn': '7d',
      };
      return config[key];
    }),
  };

  const mockPrismaService = {
    passwordReset: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'AGENCY_OWNER',
      });
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
    });

    it('should return null when user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser(
        'nonexistent@example.com',
        'password',
      );

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(
        'test@example.com',
        'wrong-password',
      );

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    const user = { id: 'user-1', email: 'test@example.com', role: 'AGENCY_OWNER' };

    it('should return user, accessToken, and refreshToken', async () => {
      const result = await service.login(user);

      expect(result).toEqual({
        user,
        accessToken: 'mock-jwt-token',
        refreshToken: 'mock-jwt-token',
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'test@example.com',
        role: 'AGENCY_OWNER',
      });
    });

    it('should call updateLastLogin', async () => {
      await service.login(user);

      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith('user-1');
    });
  });

  describe('register', () => {
    const dto = {
      email: 'new@example.com',
      password: 'Password123',
      name: 'New User',
    };

    it('should create user and return token', async () => {
      const createdUser = { ...mockUser, email: dto.email, name: dto.name };
      mockUsersService.create.mockResolvedValue(createdUser);

      const result = await service.register(dto);

      expect(result.user).toBeDefined();
      expect(result.user).not.toHaveProperty('password');
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBe('mock-jwt-token');
      expect(mockUsersService.create).toHaveBeenCalledWith(dto);
    });

    it('should send welcome email after registration', async () => {
      const createdUser = { ...mockUser, email: dto.email, name: dto.name };
      mockUsersService.create.mockResolvedValue(createdUser);

      await service.register(dto);

      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
        dto.email,
        dto.name,
      );
    });
  });

  describe('forgotPassword', () => {
    it('should return success message even if user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@example.com');

      expect(result.message).toContain('If an account with that email exists');
    });

    it('should create reset token and send email when user exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockPrismaService.passwordReset.create.mockResolvedValue({});

      const result = await service.forgotPassword('test@example.com');

      expect(result.message).toContain('If an account with that email exists');
      expect(mockPrismaService.passwordReset.create).toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should throw if token is invalid', async () => {
      mockPrismaService.passwordReset.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword('bad-token', 'NewPassword123'),
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should reset password with valid token', async () => {
      const resetRecord = {
        id: 'reset-1',
        userId: 'user-1',
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
      };
      mockPrismaService.passwordReset.findUnique.mockResolvedValue(resetRecord);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      mockPrismaService.$transaction.mockResolvedValue([]);

      const result = await service.resetPassword('valid-token', 'NewPassword123');

      expect(result.message).toBe('Password reset successfully');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });
});