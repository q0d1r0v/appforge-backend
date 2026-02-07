jest.mock('passport-jwt', () => ({
  Strategy: class {},
  ExtractJwt: { fromAuthHeaderAsBearerToken: jest.fn() },
}));

jest.mock('@nestjs/passport', () => ({
  PassportStrategy: (strategy: any) =>
    class {
      constructor(...args: any[]) {}
    },
}));

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashed-password',
    name: 'Test User',
    role: 'AGENCY_OWNER',
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-jwt-secret'),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    strategy = new JwtStrategy(
      mockConfigService as unknown as ConfigService,
      mockPrismaService as unknown as PrismaService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('validate', () => {
    it('should return user without password when user is found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await strategy.validate({
        sub: 'user-1',
        email: 'test@example.com',
      });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(result).not.toHaveProperty('password');
      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'AGENCY_OWNER',
        avatarUrl: null,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        lastLoginAt: null,
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        strategy.validate({ sub: 'nonexistent', email: 'no@example.com' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
      });
    });
  });
});
