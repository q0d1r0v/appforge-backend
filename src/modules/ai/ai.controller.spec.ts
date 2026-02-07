import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AnalyzeIdeaDto } from './dto/analyze-idea.dto';
import { GenerateWireframeDto } from './dto/generate-wireframe.dto';
import { GenerateEstimateDto } from './dto/generate-estimate.dto';
import { GenerateCodeDto } from './dto/generate-code.dto';

describe('AIController', () => {
  let controller: AIController;

  const mockAIService = {
    analyzeIdea: jest.fn(),
    generateWireframe: jest.fn(),
    generateEstimate: jest.fn(),
    generateCode: jest.fn(),
  };

  const mockPrismaService = {
    project: {
      findFirst: jest.fn(),
    },
  };

  const userId = 'user-uuid-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AIController],
      providers: [
        { provide: AIService, useValue: mockAIService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<AIController>(AIController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('analyzeIdea', () => {
    it('should call aiService.analyzeIdea with dto', async () => {
      const dto: AnalyzeIdeaDto = {
        description: 'An online store mobile app for users to buy products',
        projectType: 'MOBILE_APP',
      };
      const expected = { features: ['auth', 'catalog'], appName: 'ShopApp' };
      mockAIService.analyzeIdea.mockResolvedValue(expected);

      const result = await controller.analyzeIdea(dto);

      expect(result).toEqual(expected);
      expect(mockAIService.analyzeIdea).toHaveBeenCalledWith(dto);
      expect(mockAIService.analyzeIdea).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateWireframe', () => {
    const dto: GenerateWireframeDto = {
      screenId: 'screen-uuid-123',
      projectId: 'project-uuid-123',
      screenType: 'LOGIN' as any,
      screenName: 'Login Screen',
      features: ['Authentication', 'Social Login'],
    };

    const mockProject = {
      id: 'project-uuid-123',
      userId,
      description: 'An e-commerce mobile app',
    };

    it('should return wireframe when project found', async () => {
      const expected = { layout: 'single-column', components: [] };
      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockAIService.generateWireframe.mockResolvedValue(expected);

      const result = await controller.generateWireframe(userId, dto);

      expect(result).toEqual(expected);
      expect(mockPrismaService.project.findFirst).toHaveBeenCalledWith({
        where: { id: dto.projectId, userId },
      });
      expect(mockAIService.generateWireframe).toHaveBeenCalledWith(
        dto.screenName,
        dto.screenType,
        mockProject.description,
        dto.features,
        dto.projectId,
      );
    });

    it('should throw NotFoundException when project not found', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(controller.generateWireframe(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockAIService.generateWireframe).not.toHaveBeenCalled();
    });
  });

  describe('generateEstimate', () => {
    const dto: GenerateEstimateDto = {
      projectId: 'project-uuid-123',
    };

    const mockProject = {
      id: 'project-uuid-123',
      userId,
      aiAnalysis: { appName: 'ShopApp', summary: 'E-commerce app' },
      features: [
        { id: 'f1', name: 'Auth', priority: 'HIGH' },
        { id: 'f2', name: 'Catalog', priority: 'MEDIUM' },
      ],
    };

    it('should return estimate when project found', async () => {
      const expected = { totalHours: 120, totalCost: 12000 };
      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockAIService.generateEstimate.mockResolvedValue(expected);

      const result = await controller.generateEstimate(userId, dto);

      expect(result).toEqual(expected);
      expect(mockPrismaService.project.findFirst).toHaveBeenCalledWith({
        where: { id: dto.projectId, userId },
        include: { features: true },
      });
      expect(mockAIService.generateEstimate).toHaveBeenCalledWith(
        mockProject.aiAnalysis,
        mockProject.features,
        dto.projectId,
      );
    });

    it('should throw NotFoundException when project not found', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(controller.generateEstimate(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockAIService.generateEstimate).not.toHaveBeenCalled();
    });
  });

  describe('generateCode', () => {
    const dto: GenerateCodeDto = {
      projectId: 'project-uuid-123',
      techStack: ['React Native', 'TypeScript', 'Firebase'],
    };

    const mockProject = {
      id: 'project-uuid-123',
      userId,
      screens: [{ id: 's1', name: 'Login', type: 'LOGIN' }],
      features: [{ id: 'f1', name: 'Auth', priority: 'HIGH' }],
    };

    it('should return code when project found', async () => {
      const expected = { files: [{ path: 'App.tsx', content: '...' }] };
      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockAIService.generateCode.mockResolvedValue(expected);

      const result = await controller.generateCode(userId, dto);

      expect(result).toEqual(expected);
      expect(mockPrismaService.project.findFirst).toHaveBeenCalledWith({
        where: { id: dto.projectId, userId },
        include: { features: true, screens: true },
      });
      expect(mockAIService.generateCode).toHaveBeenCalledWith(
        mockProject.screens,
        mockProject.features,
        dto.techStack,
        dto.projectId,
      );
    });

    it('should throw NotFoundException when project not found', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(controller.generateCode(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockAIService.generateCode).not.toHaveBeenCalled();
    });
  });
});
