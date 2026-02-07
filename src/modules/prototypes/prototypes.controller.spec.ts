import { Test, TestingModule } from '@nestjs/testing';
import { PrototypesController } from './prototypes.controller';
import { PrototypesService } from './prototypes.service';
import { UpdateConnectionsDto } from './dto/update-connections.dto';

describe('PrototypesController', () => {
  let controller: PrototypesController;
  let service: PrototypesService;

  const mockPrototypesService = {
    getPrototype: jest.fn(),
    updateConnections: jest.fn(),
    validateConnections: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrototypesController],
      providers: [
        { provide: PrototypesService, useValue: mockPrototypesService },
      ],
    }).compile();

    controller = module.get<PrototypesController>(PrototypesController);
    service = module.get<PrototypesService>(PrototypesService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPrototype', () => {
    it('should call prototypesService.getPrototype with projectId and userId', async () => {
      const userId = 'user-1';
      const projectId = 'project-1';
      const expectedResult = {
        project: { id: projectId, name: 'Test', status: 'READY', type: 'MOBILE_APP' },
        screens: [],
        startScreenId: null,
      };

      mockPrototypesService.getPrototype.mockResolvedValue(expectedResult);

      const result = await controller.getPrototype(userId, projectId);

      expect(service.getPrototype).toHaveBeenCalledWith(projectId, userId);
      expect(service.getPrototype).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateConnections', () => {
    it('should call prototypesService.updateConnections with userId and dto', async () => {
      const userId = 'user-1';
      const dto: UpdateConnectionsDto = {
        screenId: 'screen-1',
        connections: [
          {
            targetScreenId: 'screen-2',
            trigger: 'onPress',
            componentId: 'button-1',
          },
        ],
      };
      const expectedResult = {
        id: 'screen-1',
        connections: dto.connections,
      };

      mockPrototypesService.updateConnections.mockResolvedValue(expectedResult);

      const result = await controller.updateConnections(userId, dto);

      expect(service.updateConnections).toHaveBeenCalledWith(userId, dto);
      expect(service.updateConnections).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('validateConnections', () => {
    it('should call prototypesService.validateConnections with projectId and userId', async () => {
      const userId = 'user-1';
      const projectId = 'project-1';
      const expectedResult = {
        valid: true,
        totalScreens: 3,
        issues: [],
      };

      mockPrototypesService.validateConnections.mockResolvedValue(expectedResult);

      const result = await controller.validateConnections(userId, projectId);

      expect(service.validateConnections).toHaveBeenCalledWith(projectId, userId);
      expect(service.validateConnections).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });
});
