import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '@/prisma/prisma.service';
import { UsageService } from '@/modules/usage/usage.service';
import { AnalyzeIdeaDto } from './dto/analyze-idea.dto';
import { buildAnalysisPrompt } from './prompts/analysis.prompt';
import { buildWireframePrompt } from './prompts/wireframe.prompt';
import { buildEstimatePrompt } from './prompts/estimate.prompt';
import { buildCodegenPrompt } from './prompts/codegen.prompt';

@Injectable()
export class AIService {
  private anthropic: Anthropic;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private usageService: UsageService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get('ai.claudeApiKey'),
    });
  }

  async analyzeIdea(dto: AnalyzeIdeaDto, userId?: string) {
    const prompt = buildAnalysisPrompt(dto.description);
    return this.callClaude(prompt, dto.description, undefined, undefined, userId);
  }

  async generateWireframe(
    screenName: string,
    screenType: string,
    appDescription: string,
    features: string[],
    projectId?: string,
    userId?: string,
  ) {
    const prompt = buildWireframePrompt(
      screenName,
      screenType,
      appDescription,
      features,
    );
    return this.callClaude(prompt, `wireframe: ${screenName}`, projectId, undefined, userId);
  }

  async generateEstimate(projectAnalysis: any, features: any[], projectId?: string, userId?: string) {
    const prompt = buildEstimatePrompt(projectAnalysis, features);
    return this.callClaude(prompt, 'estimate generation', projectId, undefined, userId);
  }

  async generateCode(screens: any[], features: any[], techStack: string[], projectId?: string, userId?: string) {
    const prompt = buildCodegenPrompt(screens, features, techStack);
    return this.callClaude(prompt, 'code generation', projectId, 8192, userId);
  }

  private async callClaude(
    prompt: string,
    inputDescription: string,
    projectId?: string,
    maxTokens?: number,
    userId?: string,
  ) {
    const startTime = Date.now();
    const model = this.configService.get('ai.model') as string;

    const message = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens || 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const duration = Date.now() - startTime;
    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    const parsed = this.parseAIResponse(responseText);

    const tokens = message.usage.input_tokens + message.usage.output_tokens;

    // Log prompt history
    this.logPromptHistory(
      inputDescription,
      prompt,
      parsed,
      model,
      tokens,
      duration,
      projectId,
      userId,
    ).catch((err) => console.error('Failed to log prompt history:', err));

    // Record usage
    if (userId) {
      this.usageService
        .recordUsage(userId, tokens)
        .catch((err) => console.error('Failed to record usage:', err));
    }

    return parsed;
  }

  private parseAIResponse(responseText: string) {
    const jsonMatch =
      responseText.match(/```json\n?([\s\S]*?)\n?```/) ||
      responseText.match(/```\n?([\s\S]*?)\n?```/);

    const cleanJson = jsonMatch ? jsonMatch[1] : responseText;

    try {
      return JSON.parse(cleanJson.trim());
    } catch {
      throw new BadRequestException(
        'Failed to parse AI response. Please try again.',
      );
    }
  }

  private async logPromptHistory(
    input: string,
    prompt: string,
    response: any,
    model: string,
    tokens: number,
    duration: number,
    projectId?: string,
    userId?: string,
  ) {
    await this.prisma.promptHistory.create({
      data: {
        projectId: projectId || null,
        userId: userId || null,
        input,
        prompt,
        response,
        model,
        tokens,
        duration,
      },
    });
  }
}
