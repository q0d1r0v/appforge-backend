import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '@/prisma/prisma.service';
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
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get('ai.claudeApiKey'),
    });
  }

  async analyzeIdea(dto: AnalyzeIdeaDto) {
    const prompt = buildAnalysisPrompt(dto.description);
    return this.callClaude(prompt, dto.description);
  }

  async generateWireframe(
    screenName: string,
    screenType: string,
    appDescription: string,
    features: string[],
    projectId?: string,
  ) {
    const prompt = buildWireframePrompt(
      screenName,
      screenType,
      appDescription,
      features,
    );
    return this.callClaude(prompt, `wireframe: ${screenName}`, projectId);
  }

  async generateEstimate(projectAnalysis: any, features: any[], projectId?: string) {
    const prompt = buildEstimatePrompt(projectAnalysis, features);
    return this.callClaude(prompt, 'estimate generation', projectId);
  }

  async generateCode(screens: any[], features: any[], techStack: string[], projectId?: string) {
    const prompt = buildCodegenPrompt(screens, features, techStack);
    return this.callClaude(prompt, 'code generation', projectId, 8192);
  }

  private async callClaude(
    prompt: string,
    inputDescription: string,
    projectId?: string,
    maxTokens?: number,
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

    // Log prompt history
    this.logPromptHistory(
      inputDescription,
      prompt,
      parsed,
      model,
      message.usage.input_tokens + message.usage.output_tokens,
      duration,
      projectId,
    ).catch((err) => console.error('Failed to log prompt history:', err));

    return parsed;
  }

  private parseAIResponse(responseText: string) {
    const jsonMatch =
      responseText.match(/```json\n?([\s\S]*?)\n?```/) ||
      responseText.match(/```\n?([\s\S]*?)\n?```/);

    const cleanJson = jsonMatch ? jsonMatch[1] : responseText;

    return JSON.parse(cleanJson.trim());
  }

  private async logPromptHistory(
    input: string,
    prompt: string,
    response: any,
    model: string,
    tokens: number,
    duration: number,
    projectId?: string,
  ) {
    await this.prisma.promptHistory.create({
      data: {
        projectId: projectId || null,
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
