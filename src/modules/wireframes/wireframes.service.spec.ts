import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WireframesService } from './wireframes.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AIService } from '@/modules/ai/ai.service';
import { EventsGateway } from '@/modules/events/events.gateway';
import { ProjectStatus, ScreenType } from '@prisma/client';

describe('WireframesService', () => {
  let service: WireframesService;

  const mockProject = {
    id: 'project-1',
    userId: 'user-1',
    name: 'Test Project',
    description: 'A test project description',
    type: 'MOBILE_APP',
    status: ProjectStatus.DRAFT,
    aiAnalysis: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
  };

  const mockScreen = {
    id: 'screen-1',
    projectId: 'project-1',
    name: 'Login Screen',
    type: ScreenType.LOGIN,
    order: 1,
    wireframe: { layout: 'column', components: [] },
    connections: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    project: {
      id: 'project-1',
      userId: 'user-1',
    },
  };

  const mockScreens = [
    mockScreen,
    {
      id: 'screen-2',
      projectId: 'project-1',
      name: 'Home Screen',
      type: ScreenType.HOME,
      order: 2,
      wireframe: { layout: 'column', components: [] },
      connections: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      project: {
        id: 'project-1',
        userId: 'user-1',
      },
    },
  ];

  const mockPrismaService = {
    project: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    screen: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAIService = {
    generateWireframe: jest.fn(),
  };

  const mockEventsGateway = {
    emitProjectStatusChanged: jest.fn(),
    emitWireframeProgress: jest.fn(),
    emitWireframeCompleted: jest.fn(),
    emitError: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WireframesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AIService, useValue: mockAIService },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    service = module.get<WireframesService>(WireframesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAllByProject', () => {
    it('should return screens for a valid project', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.screen.findMany.mockResolvedValue(mockScreens);

      const result = await service.findAllByProject('project-1', 'user-1');

      expect(result).toEqual(mockScreens);
      expect(mockPrismaService.project.findFirst).toHaveBeenCalledWith({
        where: { id: 'project-1', userId: 'user-1' },
      });
      expect(mockPrismaService.screen.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        orderBy: { order: 'asc' },
      });
    });

    it('should throw NotFoundException when project not found', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(
        service.findAllByProject('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.screen.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return screen when found and user owns it', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValue(mockScreen);

      const result = await service.findOne('screen-1', 'user-1');

      expect(result).toEqual(mockScreen);
      expect(mockPrismaService.screen.findUnique).toHaveBeenCalledWith({
        where: { id: 'screen-1' },
        include: { project: true },
      });
    });

    it('should throw NotFoundException when screen not found', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user does not own the screen', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValue({
        ...mockScreen,
        project: { id: 'project-1', userId: 'other-user' },
      });

      await expect(
        service.findOne('screen-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a screen for a valid project', async () => {
      const dto = {
        projectId: 'project-1',
        name: 'Login Screen',
        type: ScreenType.LOGIN,
        order: 1,
        wireframe: { layout: 'column', components: [] },
      };
      const createdScreen = {
        id: 'screen-new',
        ...dto,
        connections: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.screen.create.mockResolvedValue(createdScreen);

      const result = await service.create('user-1', dto);

      expect(result).toEqual(createdScreen);
      expect(mockPrismaService.project.findFirst).toHaveBeenCalledWith({
        where: { id: 'project-1', userId: 'user-1' },
      });
      expect(mockPrismaService.screen.create).toHaveBeenCalledWith({
        data: {
          projectId: 'project-1',
          name: 'Login Screen',
          type: ScreenType.LOGIN,
          order: 1,
          wireframe: { layout: 'column', components: [] },
        },
      });
    });

    it('should throw NotFoundException when project not found', async () => {
      const dto = {
        projectId: 'nonexistent',
        name: 'Login Screen',
        type: ScreenType.LOGIN,
        order: 1,
      };

      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(service.create('user-1', dto)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockPrismaService.screen.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a screen', async () => {
      const dto = { name: 'Updated Screen Name' };
      const updatedScreen = { ...mockScreen, name: 'Updated Screen Name' };

      mockPrismaService.screen.findUnique.mockResolvedValue(mockScreen);
      mockPrismaService.screen.update.mockResolvedValue(updatedScreen);

      const result = await service.update('screen-1', 'user-1', dto);

      expect(result.name).toBe('Updated Screen Name');
      expect(mockPrismaService.screen.findUnique).toHaveBeenCalledWith({
        where: { id: 'screen-1' },
        include: { project: true },
      });
      expect(mockPrismaService.screen.update).toHaveBeenCalledWith({
        where: { id: 'screen-1' },
        data: dto,
      });
    });
  });

  describe('remove', () => {
    it('should delete screen and reorder remaining screens', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValue(mockScreen);
      mockPrismaService.screen.delete.mockResolvedValue(mockScreen);
      mockPrismaService.screen.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.remove('screen-1', 'user-1');

      expect(result).toEqual({ message: 'Screen deleted successfully' });
      expect(mockPrismaService.screen.delete).toHaveBeenCalledWith({
        where: { id: 'screen-1' },
      });
      expect(mockPrismaService.screen.updateMany).toHaveBeenCalledWith({
        where: {
          projectId: 'project-1',
          order: { gt: 1 },
        },
        data: { order: { decrement: 1 } },
      });
    });
  });

  describe('generateWireframes', () => {
    it('should start wireframe generation for a valid project', async () => {
      const projectWithRelations = {
        ...mockProject,
        screens: [
          { id: 'screen-1', name: 'Login', type: 'LOGIN', order: 1 },
          { id: 'screen-2', name: 'Home', type: 'HOME', order: 2 },
        ],
        features: [
          { id: 'feat-1', name: 'Authentication' },
          { id: 'feat-2', name: 'Dashboard' },
        ],
      };

      mockPrismaService.project.findFirst.mockResolvedValue(projectWithRelations);
      mockPrismaService.project.update.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.WIREFRAMING,
      });

      const result = await service.generateWireframes('project-1', 'user-1');

      expect(result).toEqual({
        message: 'Wireframe generation started',
        screenCount: 2,
      });
      expect(mockPrismaService.project.findFirst).toHaveBeenCalledWith({
        where: { id: 'project-1', userId: 'user-1' },
        include: {
          screens: { orderBy: { order: 'asc' } },
          features: true,
        },
      });
      expect(mockPrismaService.project.update).toHaveBeenCalledWith({
        where: { id: 'project-1' },
        data: { status: ProjectStatus.WIREFRAMING },
      });
      expect(mockEventsGateway.emitProjectStatusChanged).toHaveBeenCalledWith(
        'user-1',
        'project-1',
        {
          status: ProjectStatus.WIREFRAMING,
          projectName: 'Test Project',
        },
      );
    });

    it('should throw NotFoundException when project not found', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(
        service.generateWireframes('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.project.update).not.toHaveBeenCalled();
      expect(mockEventsGateway.emitProjectStatusChanged).not.toHaveBeenCalled();
    });
  });

  describe('reorderScreens', () => {
    it('should reorder screens using a transaction', async () => {
      const screenIds = ['screen-2', 'screen-1'];
      const reorderedScreens = [
        { ...mockScreens[1], order: 1 },
        { ...mockScreens[0], order: 2 },
      ];

      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.$transaction.mockResolvedValue(undefined);
      mockPrismaService.screen.findMany.mockResolvedValue(reorderedScreens);

      const result = await service.reorderScreens(
        'project-1',
        'user-1',
        screenIds,
      );

      expect(result).toEqual(reorderedScreens);
      expect(mockPrismaService.project.findFirst).toHaveBeenCalledWith({
        where: { id: 'project-1', userId: 'user-1' },
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Array),
      );
      expect(mockPrismaService.screen.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        orderBy: { order: 'asc' },
      });
    });

    it('should throw NotFoundException when project not found', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(
        service.reorderScreens('nonexistent', 'user-1', ['screen-1']),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });
});
