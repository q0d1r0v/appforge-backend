import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrototypesService } from './prototypes.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('PrototypesService', () => {
  let service: PrototypesService;

  const mockScreens = [
    {
      id: 'screen-1',
      name: 'Home',
      type: 'HOME',
      order: 1,
      wireframe: { layout: 'column' },
      connections: [{ targetScreenId: 'screen-2', trigger: 'button' }],
    },
    {
      id: 'screen-2',
      name: 'Profile',
      type: 'PROFILE',
      order: 2,
      wireframe: { layout: 'column' },
      connections: [],
    },
  ];

  const mockProject = {
    id: 'project-1',
    userId: 'user-1',
    name: 'Test App',
    status: 'READY',
    type: 'MOBILE_APP',
    screens: mockScreens,
  };

  const mockPrismaService = {
    project: {
      findFirst: jest.fn(),
    },
    screen: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrototypesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PrototypesService>(PrototypesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getPrototype', () => {
    it('should return formatted prototype when project found', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);

      const result = await service.getPrototype('project-1', 'user-1');

      expect(result.project).toEqual({
        id: 'project-1',
        name: 'Test App',
        status: 'READY',
        type: 'MOBILE_APP',
      });
      expect(result.screens).toHaveLength(2);
      expect(result.startScreenId).toBe('screen-1');
    });

    it('should throw NotFoundException when project not found', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(
        service.getPrototype('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set startScreenId to null when no screens', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue({
        ...mockProject,
        screens: [],
      });

      const result = await service.getPrototype('project-1', 'user-1');

      expect(result.startScreenId).toBeNull();
      expect(result.screens).toHaveLength(0);
    });
  });

  describe('updateConnections', () => {
    it('should update connections when screen found and owned by user', async () => {
      const screen = {
        id: 'screen-1',
        project: { userId: 'user-1' },
      };
      mockPrismaService.screen.findUnique.mockResolvedValue(screen);
      const newConnections = [{ targetScreenId: 'screen-2', trigger: 'tap', componentId: 'btn-1' }];
      mockPrismaService.screen.update.mockResolvedValue({
        ...screen,
        connections: newConnections,
      });

      const dto = { screenId: 'screen-1', connections: newConnections };
      const result = await service.updateConnections('user-1', dto);

      expect(result.connections).toEqual(newConnections);
      expect(mockPrismaService.screen.update).toHaveBeenCalledWith({
        where: { id: 'screen-1' },
        data: { connections: newConnections },
      });
    });

    it('should throw NotFoundException when screen not found', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValue(null);

      await expect(
        service.updateConnections('user-1', { screenId: 'none', connections: [] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user does not own screen', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValue({
        id: 'screen-1',
        project: { userId: 'other-user' },
      });

      await expect(
        service.updateConnections('user-1', { screenId: 'screen-1', connections: [] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateConnections', () => {
    it('should return valid when all connections point to existing screens', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);

      const result = await service.validateConnections('project-1', 'user-1');

      expect(result.valid).toBe(true);
      expect(result.totalScreens).toBe(2);
      expect(result.issues).toHaveLength(0);
    });

    it('should return issues when connections point to non-existent screens', async () => {
      const projectWithBadConnections = {
        ...mockProject,
        screens: [
          {
            id: 'screen-1',
            name: 'Home',
            connections: [{ targetScreenId: 'nonexistent' }],
          },
        ],
      };
      mockPrismaService.project.findFirst.mockResolvedValue(projectWithBadConnections);

      const result = await service.validateConnections('project-1', 'user-1');

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].issue).toContain('nonexistent');
    });

    it('should throw NotFoundException when project not found', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(
        service.validateConnections('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
