import { Test, TestingModule } from '@nestjs/testing';
import { WireframesController } from './wireframes.controller';
import { WireframesService } from './wireframes.service';

describe('WireframesController', () => {
  let controller: WireframesController;

  const mockWireframesService = {
    findAllByProject: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    generateWireframes: jest.fn(),
    reorderScreens: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WireframesController],
      providers: [{ provide: WireframesService, useValue: mockWireframesService }],
    }).compile();

    controller = module.get<WireframesController>(WireframesController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAllByProject', () => {
    it('should call wireframesService.findAllByProject', async () => {
      const screens = [{ id: 's-1', name: 'Home' }];
      mockWireframesService.findAllByProject.mockResolvedValue(screens);

      const result = await controller.findAllByProject('user-1', 'project-1');

      expect(result).toEqual(screens);
      expect(mockWireframesService.findAllByProject).toHaveBeenCalledWith('project-1', 'user-1');
    });
  });

  describe('findOne', () => {
    it('should call wireframesService.findOne', async () => {
      const screen = { id: 's-1', name: 'Home' };
      mockWireframesService.findOne.mockResolvedValue(screen);

      const result = await controller.findOne('user-1', 's-1');

      expect(result).toEqual(screen);
      expect(mockWireframesService.findOne).toHaveBeenCalledWith('s-1', 'user-1');
    });
  });

  describe('create', () => {
    it('should call wireframesService.create', async () => {
      const dto = { projectId: 'p-1', name: 'Login', type: 'AUTH', order: 1 };
      const created = { id: 's-new', ...dto };
      mockWireframesService.create.mockResolvedValue(created);

      const result = await controller.create('user-1', dto as any);

      expect(result).toEqual(created);
      expect(mockWireframesService.create).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('update', () => {
    it('should call wireframesService.update', async () => {
      const dto = { name: 'Updated' };
      const updated = { id: 's-1', name: 'Updated' };
      mockWireframesService.update.mockResolvedValue(updated);

      const result = await controller.update('user-1', 's-1', dto as any);

      expect(result).toEqual(updated);
      expect(mockWireframesService.update).toHaveBeenCalledWith('s-1', 'user-1', dto);
    });
  });

  describe('remove', () => {
    it('should call wireframesService.remove', async () => {
      mockWireframesService.remove.mockResolvedValue({ message: 'Screen deleted successfully' });

      const result = await controller.remove('user-1', 's-1');

      expect(result.message).toBe('Screen deleted successfully');
      expect(mockWireframesService.remove).toHaveBeenCalledWith('s-1', 'user-1');
    });
  });

  describe('generateWireframes', () => {
    it('should call wireframesService.generateWireframes', async () => {
      const expected = { message: 'Wireframe generation started', screenCount: 3 };
      mockWireframesService.generateWireframes.mockResolvedValue(expected);

      const result = await controller.generateWireframes('user-1', 'project-1');

      expect(result).toEqual(expected);
      expect(mockWireframesService.generateWireframes).toHaveBeenCalledWith('project-1', 'user-1');
    });
  });

  describe('reorderScreens', () => {
    it('should call wireframesService.reorderScreens', async () => {
      const screenIds = ['s-2', 's-1', 's-3'];
      const reordered = [{ id: 's-2', order: 1 }, { id: 's-1', order: 2 }, { id: 's-3', order: 3 }];
      mockWireframesService.reorderScreens.mockResolvedValue(reordered);

      const result = await controller.reorderScreens('user-1', 'project-1', screenIds);

      expect(result).toEqual(reordered);
      expect(mockWireframesService.reorderScreens).toHaveBeenCalledWith('project-1', 'user-1', screenIds);
    });
  });
});
