import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';
import { PrismaService } from '@/prisma/prisma.service';

jest.mock('@anthropic-ai/sdk', () => {
  const mockCreate = jest.fn();
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
    mockCreate,
  };
});

jest.mock('./prompts/analysis.prompt', () => ({
  buildAnalysisPrompt: jest.fn().mockReturnValue('analysis-prompt'),
}));

jest.mock('./prompts/wireframe.prompt', () => ({
  buildWireframePrompt: jest.fn().mockReturnValue('wireframe-prompt'),
}));

jest.mock('./prompts/estimate.prompt', () => ({
  buildEstimatePrompt: jest.fn().mockReturnValue('estimate-prompt'),
}));

jest.mock('./prompts/codegen.prompt', () => ({
  buildCodegenPrompt: jest.fn().mockReturnValue('codegen-prompt'),
}));

import { buildAnalysisPrompt } from './prompts/analysis.prompt';
import { buildWireframePrompt } from './prompts/wireframe.prompt';
import { buildEstimatePrompt } from './prompts/estimate.prompt';
import { buildCodegenPrompt } from './prompts/codegen.prompt';

// Access the shared mockCreate from the mocked module
const { mockCreate } = jest.requireMock('@anthropic-ai/sdk');

describe('AIService', () => {
  let service: AIService;

  const mockClaudeResponse = {
    content: [{ type: 'text', text: '```json\n{"result": "ok"}\n```' }],
    usage: { input_tokens: 100, output_tokens: 50 },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        'ai.claudeApiKey': 'test-api-key',
        'ai.model': 'claude-sonnet-4-20250514',
      };
      return config[key];
    }),
  };

  const mockPrismaService = {
    promptHistory: {
      create: jest.fn().mockResolvedValue({}),
    },
  };

  beforeEach(async () => {
    mockCreate.mockResolvedValue(mockClaudeResponse);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('analyzeIdea', () => {
    it('should call buildAnalysisPrompt and return parsed response', async () => {
      const dto = { description: 'A mobile app for tracking fitness goals and workouts' };

      const result = await service.analyzeIdea(dto);

      expect(buildAnalysisPrompt).toHaveBeenCalledWith(dto.description);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: 'analysis-prompt' }],
      });
      expect(result).toEqual({ result: 'ok' });
    });
  });

  describe('generateWireframe', () => {
    it('should call buildWireframePrompt with correct args', async () => {
      const screenName = 'Login';
      const screenType = 'AUTH';
      const appDescription = 'Fitness tracker app';
      const features = ['auth', 'dashboard'];
      const projectId = 'project-1';

      const result = await service.generateWireframe(
        screenName,
        screenType,
        appDescription,
        features,
        projectId,
      );

      expect(buildWireframePrompt).toHaveBeenCalledWith(
        screenName,
        screenType,
        appDescription,
        features,
      );
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: 'wireframe-prompt' }],
      });
      expect(result).toEqual({ result: 'ok' });
    });
  });

  describe('generateEstimate', () => {
    it('should call buildEstimatePrompt with correct args', async () => {
      const projectAnalysis = { appName: 'FitTrack', complexity: 'medium' };
      const features = [{ name: 'Auth', estimatedHours: 8 }];
      const projectId = 'project-2';

      const result = await service.generateEstimate(projectAnalysis, features, projectId);

      expect(buildEstimatePrompt).toHaveBeenCalledWith(projectAnalysis, features);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: 'estimate-prompt' }],
      });
      expect(result).toEqual({ result: 'ok' });
    });
  });

  describe('generateCode', () => {
    it('should call buildCodegenPrompt with maxTokens 8192', async () => {
      const screens = [{ name: 'Login', type: 'AUTH' }];
      const features = [{ name: 'Auth' }];
      const techStack = ['React Native', 'Node.js'];
      const projectId = 'project-3';

      const result = await service.generateCode(screens, features, techStack, projectId);

      expect(buildCodegenPrompt).toHaveBeenCalledWith(screens, features, techStack);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [{ role: 'user', content: 'codegen-prompt' }],
      });
      expect(result).toEqual({ result: 'ok' });
    });
  });

  describe('parseAIResponse', () => {
    it('should parse JSON from markdown code blocks', async () => {
      const jsonBody = '{"appName": "TestApp", "features": []}';
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: '```json\n' + jsonBody + '\n```' }],
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      const result = await service.analyzeIdea({
        description: 'A simple test app for parsing validation',
      });

      expect(result).toEqual({ appName: 'TestApp', features: [] });
    });

    it('should parse raw JSON without code block markers', async () => {
      const rawJson = '{"appName": "RawApp", "screens": []}';
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: rawJson }],
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      const result = await service.analyzeIdea({
        description: 'Another test app for raw JSON parsing',
      });

      expect(result).toEqual({ appName: 'RawApp', screens: [] });
    });
  });

  describe('logPromptHistory', () => {
    it('should not throw when logging fails', async () => {
      mockPrismaService.promptHistory.create.mockRejectedValue(
        new Error('DB connection lost'),
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.analyzeIdea({
        description: 'Test app to verify logging failure handling',
      });

      // The method should still return the parsed result despite logging failure
      expect(result).toEqual({ result: 'ok' });

      // Give the fire-and-forget promise time to settle
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to log prompt history:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });
});
