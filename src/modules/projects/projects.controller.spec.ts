import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

describe('ProjectsController', () => {
  let controller: ProjectsController;

  const mockProjectsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    archive: jest.fn(),
    unarchive: jest.fn(),
    reanalyze: jest.fn(),
    transitionStatus: jest.fn(),
    generateEstimate: jest.fn(),
    getEstimate: jest.fn(),
    exportProject: jest.fn(),
  };

  const userId = 'user-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        { provide: ProjectsService, useValue: mockProjectsService },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to projectsService.create with userId and dto', async () => {
      const dto: CreateProjectDto = {
        name: 'Test Project',
        description: 'A test project description with enough characters',
      };
      const expected = { id: 'proj-1', ...dto, userId };
      mockProjectsService.create.mockResolvedValue(expected);

      const result = await controller.create(userId, dto);

      expect(result).toEqual(expected);
      expect(mockProjectsService.create).toHaveBeenCalledWith(userId, dto);
      expect(mockProjectsService.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should delegate to projectsService.findAll with userId and query', async () => {
      const query: PaginationQueryDto = { page: 1, limit: 10 };
      const expected = {
        __paginated: true,
        items: [{ id: 'proj-1' }],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
      };
      mockProjectsService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(userId, query);

      expect(result).toEqual(expected);
      expect(mockProjectsService.findAll).toHaveBeenCalledWith(userId, query);
      expect(mockProjectsService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should delegate to projectsService.findOne with id and userId', async () => {
      const projectId = 'proj-1';
      const expected = { id: projectId, name: 'Test' };
      mockProjectsService.findOne.mockResolvedValue(expected);

      const result = await controller.findOne(userId, projectId);

      expect(result).toEqual(expected);
      expect(mockProjectsService.findOne).toHaveBeenCalledWith(projectId, userId);
      expect(mockProjectsService.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('should delegate to projectsService.update with id, userId, and dto', async () => {
      const projectId = 'proj-1';
      const dto: UpdateProjectDto = { name: 'Updated Name' };
      const expected = { id: projectId, name: 'Updated Name' };
      mockProjectsService.update.mockResolvedValue(expected);

      const result = await controller.update(userId, projectId, dto);

      expect(result).toEqual(expected);
      expect(mockProjectsService.update).toHaveBeenCalledWith(projectId, userId, dto);
      expect(mockProjectsService.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('should delegate to projectsService.remove with id and userId', async () => {
      const projectId = 'proj-1';
      const expected = { message: 'Project deleted successfully' };
      mockProjectsService.remove.mockResolvedValue(expected);

      const result = await controller.remove(userId, projectId);

      expect(result).toEqual(expected);
      expect(mockProjectsService.remove).toHaveBeenCalledWith(projectId, userId);
      expect(mockProjectsService.remove).toHaveBeenCalledTimes(1);
    });
  });

  describe('archive', () => {
    it('should delegate to projectsService.archive with id and userId', async () => {
      const projectId = 'proj-1';
      const expected = { id: projectId, status: 'ARCHIVED' };
      mockProjectsService.archive.mockResolvedValue(expected);

      const result = await controller.archive(userId, projectId);

      expect(result).toEqual(expected);
      expect(mockProjectsService.archive).toHaveBeenCalledWith(projectId, userId);
      expect(mockProjectsService.archive).toHaveBeenCalledTimes(1);
    });
  });

  describe('unarchive', () => {
    it('should delegate to projectsService.unarchive with id and userId', async () => {
      const projectId = 'proj-1';
      const expected = { id: projectId, status: 'DRAFT' };
      mockProjectsService.unarchive.mockResolvedValue(expected);

      const result = await controller.unarchive(userId, projectId);

      expect(result).toEqual(expected);
      expect(mockProjectsService.unarchive).toHaveBeenCalledWith(projectId, userId);
      expect(mockProjectsService.unarchive).toHaveBeenCalledTimes(1);
    });
  });

  describe('reanalyze', () => {
    it('should delegate to projectsService.reanalyze with id and userId', async () => {
      const projectId = 'proj-1';
      const expected = { message: 'Re-analysis started' };
      mockProjectsService.reanalyze.mockResolvedValue(expected);

      const result = await controller.reanalyze(userId, projectId);

      expect(result).toEqual(expected);
      expect(mockProjectsService.reanalyze).toHaveBeenCalledWith(projectId, userId);
      expect(mockProjectsService.reanalyze).toHaveBeenCalledTimes(1);
    });
  });

  describe('transitionStatus', () => {
    it('should delegate to projectsService.transitionStatus with id, userId, and status', async () => {
      const projectId = 'proj-1';
      const status = 'IN_DEVELOPMENT';
      const expected = { id: projectId, status };
      mockProjectsService.transitionStatus.mockResolvedValue(expected);

      const result = await controller.transitionStatus(userId, projectId, status as any);

      expect(result).toEqual(expected);
      expect(mockProjectsService.transitionStatus).toHaveBeenCalledWith(projectId, userId, status);
      expect(mockProjectsService.transitionStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateEstimate', () => {
    it('should delegate to projectsService.generateEstimate with id and userId', async () => {
      const projectId = 'proj-1';
      const expected = { projectId, totalHours: 100, totalCost: 5000 };
      mockProjectsService.generateEstimate.mockResolvedValue(expected);

      const result = await controller.generateEstimate(userId, projectId);

      expect(result).toEqual(expected);
      expect(mockProjectsService.generateEstimate).toHaveBeenCalledWith(projectId, userId);
      expect(mockProjectsService.generateEstimate).toHaveBeenCalledTimes(1);
    });
  });

  describe('getEstimate', () => {
    it('should delegate to projectsService.getEstimate with id and userId', async () => {
      const projectId = 'proj-1';
      const expected = { projectId, totalHours: 100, totalCost: 5000 };
      mockProjectsService.getEstimate.mockResolvedValue(expected);

      const result = await controller.getEstimate(userId, projectId);

      expect(result).toEqual(expected);
      expect(mockProjectsService.getEstimate).toHaveBeenCalledWith(projectId, userId);
      expect(mockProjectsService.getEstimate).toHaveBeenCalledTimes(1);
    });
  });

  describe('exportProject', () => {
    it('should delegate to projectsService.exportProject with id and userId', async () => {
      const projectId = 'proj-1';
      const expected = {
        project: { name: 'Test', description: 'Desc' },
        features: [],
        screens: [],
        estimate: null,
        client: { name: 'User', email: 'user@test.com' },
        exportedAt: expect.any(String),
      };
      mockProjectsService.exportProject.mockResolvedValue(expected);

      const result = await controller.exportProject(userId, projectId);

      expect(result).toEqual(expected);
      expect(mockProjectsService.exportProject).toHaveBeenCalledWith(projectId, userId);
      expect(mockProjectsService.exportProject).toHaveBeenCalledTimes(1);
    });
  });
});
