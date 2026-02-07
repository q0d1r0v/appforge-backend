import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UsersService } from './users.service';
import { PrismaService } from '@/prisma/prisma.service';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import * as bcrypt from 'bcryptjs';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashed-password',
    name: 'Test User',
    role: 'AGENCY_OWNER',
    avatar: null,
    company: null,
    position: null,
    tier: 'FREE',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: null,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  let mockCacheManager: any;

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findById', () => {
    it('should return user without password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('user-1');

      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('should return cached user if available', async () => {
      const { password, ...cachedUser } = mockUser;
      mockCacheManager.get.mockResolvedValue(cachedUser);

      const result = await service.findById('user-1');

      expect(result).toEqual(cachedUser);
      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const dto = {
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    };

    it('should hash password and create user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrismaService.user.create.mockResolvedValue({
        ...mockUser,
        ...dto,
        password: 'hashed',
      });

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    });

    it('should throw ConflictException when email exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('updateProfile', () => {
    it('should update and return user without password', async () => {
      const updated = { ...mockUser, name: 'Updated Name' };
      mockPrismaService.user.update.mockResolvedValue(updated);

      const result = await service.updateProfile('user-1', {
        name: 'Updated Name',
      });

      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('name', 'Updated Name');
    });

    it('should invalidate cache after update', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.updateProfile('user-1', { name: 'Updated' });

      expect(mockCacheManager.del).toHaveBeenCalledWith('user:user-1');
    });
  });

  describe('changePassword', () => {
    it('should change password when current password is correct', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed');
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.changePassword(
        'user-1',
        'current-pass',
        'new-pass',
      );

      expect(result.message).toBe('Password changed successfully');
      expect(mockCacheManager.del).toHaveBeenCalledWith('user:user-1');
    });

    it('should throw when current password is incorrect', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', 'wrong-pass', 'new-pass'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent', 'pass', 'new-pass'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
