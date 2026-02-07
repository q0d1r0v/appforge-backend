import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// --- Client → Server payloads ---

export class JoinLeaveProjectDto {
  @ApiProperty({ example: 'clxyz123', description: 'Project ID to join/leave' })
  projectId: string;
}

export class TypingDto {
  @ApiProperty({ example: 'clxyz123', description: 'Project ID where user is typing' })
  projectId: string;
}

// --- Server → Client payloads ---

export class UserOnlineOfflineDto {
  @ApiProperty({ example: 'user_abc123' })
  userId: string;

  @ApiProperty({ example: '2026-02-07T12:00:00.000Z' })
  timestamp: string;
}

export class UserTypingDto {
  @ApiProperty({ example: 'user_abc123' })
  userId: string;

  @ApiProperty({ example: 'clxyz123' })
  projectId: string;

  @ApiProperty({ example: true })
  isTyping: boolean;
}

export class PresenceListDto {
  @ApiProperty({ example: ['user_abc123', 'user_def456'], type: [String] })
  users: string[];
}

export class ProjectStatusChangedDto {
  @ApiProperty({ example: 'clxyz123' })
  projectId: string;

  @ApiProperty({ example: 'ANALYZED' })
  status: string;

  @ApiProperty({ example: 'My App' })
  projectName: string;

  @ApiProperty({ example: '2026-02-07T12:00:00.000Z' })
  timestamp: string;
}

export class AnalysisProgressDto {
  @ApiProperty({ example: 'clxyz123' })
  projectId: string;

  @ApiProperty({ example: 'analyzing_features' })
  step: string;

  @ApiProperty({ example: 65, description: 'Progress percentage (0-100)' })
  progress: number;

  @ApiProperty({ example: 'Analyzing app features...' })
  message: string;

  @ApiProperty({ example: '2026-02-07T12:00:00.000Z' })
  timestamp: string;
}

export class AnalysisCompletedDto {
  @ApiProperty({ example: 'clxyz123' })
  projectId: string;

  @ApiProperty({ example: 8 })
  featuresCount: number;

  @ApiProperty({ example: 5 })
  screensCount: number;

  @ApiProperty({ example: '2026-02-07T12:00:00.000Z' })
  timestamp: string;
}

export class WireframeProgressDto {
  @ApiProperty({ example: 'clxyz123' })
  projectId: string;

  @ApiProperty({ example: 'Login Screen' })
  screenName: string;

  @ApiProperty({ example: 3 })
  currentScreen: number;

  @ApiProperty({ example: 5 })
  totalScreens: number;

  @ApiProperty({ example: '2026-02-07T12:00:00.000Z' })
  timestamp: string;
}

export class WireframeCompletedDto {
  @ApiProperty({ example: 'clxyz123' })
  projectId: string;

  @ApiProperty({ example: '2026-02-07T12:00:00.000Z' })
  timestamp: string;
}

export class EventErrorDto {
  @ApiProperty({ example: 'Analysis failed' })
  message: string;

  @ApiPropertyOptional({ example: 'ai-service' })
  context?: string;

  @ApiProperty({ example: '2026-02-07T12:00:00.000Z' })
  timestamp: string;
}

export class NotificationDto {
  @ApiProperty({ example: 'info', enum: ['info', 'success', 'warning', 'error'] })
  type: string;

  @ApiProperty({ example: 'Analysis Complete' })
  title: string;

  @ApiProperty({ example: 'Your project has been analyzed successfully' })
  message: string;

  @ApiPropertyOptional({ example: { projectId: 'clxyz123' } })
  metadata?: any;

  @ApiProperty({ example: '2026-02-07T12:00:00.000Z' })
  timestamp: string;
}

export class UploadCompletedDto {
  @ApiProperty({ example: 'avatar', enum: ['avatar', 'thumbnail'] })
  type: string;

  @ApiProperty({ example: 'https://r2.example.com/avatars/abc.jpg' })
  url: string;

  @ApiProperty({ example: '2026-02-07T12:00:00.000Z' })
  timestamp: string;
}
