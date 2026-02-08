import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '@/prisma/prisma.service';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { paginate, paginationArgs } from '@/common/helpers/pagination.helper';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll(query: PaginationQueryDto) {
    const where: Prisma.UserWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { company: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          company: true,
          position: true,
          tier: true,
          emailVerified: true,
          createdAt: true,
          lastLogin: true,
        },
        orderBy: {
          [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
        },
        ...paginationArgs(query),
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(items, total, query);
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    const cacheKey = `user:${id}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, ...result } = user;

    await this.cacheManager.set(cacheKey, result, 60000); // 60s
    return result;
  }

  async create(data: {
    email: string;
    password: string;
    name: string;
    company?: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  async updateProfile(
    id: string,
    data: {
      name?: string;
      company?: string;
      position?: string;
      avatar?: string;
    },
  ) {
    const user = await this.prisma.user.update({ where: { id }, data });
    const { password, ...result } = user;

    await this.cacheManager.del(`user:${id}`);
    return result;
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new ConflictException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    await this.cacheManager.del(`user:${id}`);
    return { message: 'Password changed successfully' };
  }

  async updateLastLogin(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() },
    });
  }
}
