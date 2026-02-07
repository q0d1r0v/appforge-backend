import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ProjectsService } from './projects.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AIService } from '@/modules/ai/ai.service';
import { EventsGateway } from '@/modules/events/events.gateway';
import { EmailService } from '@/modules/email/email.service';
import { ProjectStatus } from '@prisma/client';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let mockCacheManager: any;

  const mockProject = {
    id: 'project-1',
    userId: 'user-1',
    name: 'Test Project',
    description: 'A test project description that is long enough',
    type: 'MOBILE_APP',
    status: ProjectStatus.DRAFT,
    aiAnalysis: null,
    features: [],
    screens: [],
    estimate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
  };

  const mockPrismaService = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    feature: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    screen: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    estimate: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockAIService = {
    analyzeIdea: jest.fn(),
  };

  const mockEventsGateway = {
    emitAnalysisProgress: jest.fn(),
    emitProjectStatusChanged: jest.fn(),
    emitAnalysisCompleted: jest.fn(),
    emitWireframeProgress: jest.fn(),
    emitWireframeCompleted: jest.fn(),
    emitError: jest.fn(),
  };

  const mockEmailService = {
    sendProjectReadyEmail: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AIService, useValue: mockAIService },
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: EmailService, useValue: mockEmailService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create a project in ANALYZING status', async () => {
      const dto = { description: 'A detailed app description for testing purposes' };
      mockPrismaService.project.create.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.ANALYZING,
      });
      mockAIService.analyzeIdea.mockResolvedValue({
        appName: 'Test',
        features: [],
        screens: [],
      });

      const result = await service.create('user-1', dto);

      expect(result.status).toBe(ProjectStatus.ANALYZING);
      expect(mockPrismaService.project.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Untitled Project',
          description: dto.description,
          status: ProjectStatus.ANALYZING,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated projects', async () => {
      const projects = [mockProject];
      mockPrismaService.project.findMany.mockResolvedValue(projects);
      mockPrismaService.project.count.mockResolvedValue(1);

      const result = await service.findAll('user-1', {
        page: 1,
        limit: 10,
      });

      expect(result.__paginated).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should return cached result if available', async () => {
      const cachedResult = {
        __paginated: true,
        items: [mockProject],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
      };
      mockCacheManager.get.mockResolvedValue(cachedResult);

      const result = await service.findAll('user-1', { page: 1, limit: 10 });

      expect(result).toEqual(cachedResult);
      expect(mockPrismaService.project.findMany).not.toHaveBeenCalled();
    });

    it('should support search filter', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([]);
      mockPrismaService.project.count.mockResolvedValue(0);

      await service.findAll('user-1', {
        page: 1,
        limit: 10,
        search: 'test',
      });

      const call = mockPrismaService.project.findMany.mock.calls[0][0];
      expect(call.where.OR).toBeDefined();
      expect(call.where.OR[0].name.contains).toBe('test');
    });
  });

  describe('findOne', () => {
    it('should return a project with relations', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);

      const result = await service.findOne('project-1', 'user-1');

      expect(result.id).toBe('project-1');
    });

    it('should throw NotFoundException when project not found', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return cached project if available', async () => {
      mockCacheManager.get.mockResolvedValue(mockProject);

      const result = await service.findOne('project-1', 'user-1');

      expect(result).toEqual(mockProject);
      expect(mockPrismaService.project.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update project in DRAFT status', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.project.update.mockResolvedValue({
        ...mockProject,
        name: 'Updated',
      });

      const result = await service.update('project-1', 'user-1', {
        name: 'Updated',
      });

      expect(result.name).toBe('Updated');
    });

    it('should reject update when status is ANALYZING', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.ANALYZING,
      });

      await expect(
        service.update('project-1', 'user-1', { name: 'Updated' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a project', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.project.delete.mockResolvedValue(mockProject);

      const result = await service.remove('project-1', 'user-1');

      expect(result.message).toBe('Project deleted successfully');
      expect(mockCacheManager.del).toHaveBeenCalled();
    });
  });

  describe('transitionStatus', () => {
    it('should allow DRAFT -> ANALYZING transition', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.DRAFT,
      });
      mockPrismaService.project.update.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.ANALYZING,
      });

      const result = await service.transitionStatus(
        'project-1',
        'user-1',
        ProjectStatus.ANALYZING,
      );

      expect(result.status).toBe(ProjectStatus.ANALYZING);
    });

    it('should reject invalid status transitions', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.DRAFT,
      });

      await expect(
        service.transitionStatus(
          'project-1',
          'user-1',
          ProjectStatus.COMPLETED,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow READY -> IN_DEVELOPMENT transition', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.READY,
      });
      mockPrismaService.project.update.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.IN_DEVELOPMENT,
      });

      const result = await service.transitionStatus(
        'project-1',
        'user-1',
        ProjectStatus.IN_DEVELOPMENT,
      );

      expect(result.status).toBe(ProjectStatus.IN_DEVELOPMENT);
    });
  });

  describe('archive', () => {
    it('should archive a project', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.project.update.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.ARCHIVED,
        archivedAt: new Date(),
      });

      const result = await service.archive('project-1', 'user-1');

      expect(result.status).toBe(ProjectStatus.ARCHIVED);
    });
  });

  describe('unarchive', () => {
    it('should unarchive an archived project', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.ARCHIVED,
      });
      mockPrismaService.project.update.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.DRAFT,
      });

      const result = await service.unarchive('project-1', 'user-1');

      expect(result.status).toBe(ProjectStatus.DRAFT);
    });

    it('should reject unarchive when project is not archived', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.DRAFT,
      });

      await expect(
        service.unarchive('project-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
