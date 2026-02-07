import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  claudeApiKey: process.env.CLAUDE_API_KEY,
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
}));