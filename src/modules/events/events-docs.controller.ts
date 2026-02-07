import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExtraModels, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import {
  JoinLeaveProjectDto,
  TypingDto,
  UserOnlineOfflineDto,
  UserTypingDto,
  PresenceListDto,
  ProjectStatusChangedDto,
  AnalysisProgressDto,
  AnalysisCompletedDto,
  WireframeProgressDto,
  WireframeCompletedDto,
  EventErrorDto,
  NotificationDto,
  UploadCompletedDto,
} from './dto/events-docs.dto';

/**
 * This controller does NOT handle real requests.
 * It exists only to document WebSocket events in Swagger.
 *
 * Connection: ws://localhost:3000/events
 * Auth: { auth: { token: "JWT_TOKEN" } }
 */
@ApiTags('Events')
@ApiExtraModels(
  JoinLeaveProjectDto,
  TypingDto,
  UserOnlineOfflineDto,
  UserTypingDto,
  PresenceListDto,
  ProjectStatusChangedDto,
  AnalysisProgressDto,
  AnalysisCompletedDto,
  WireframeProgressDto,
  WireframeCompletedDto,
  EventErrorDto,
  NotificationDto,
  UploadCompletedDto,
)
@Controller('events/docs')
@Public()
export class EventsDocsController {
  // ==========================================
  // CLIENT → SERVER (emit from client)
  // ==========================================

  @Post('join-project')
  @ApiOperation({
    summary: '[Client → Server] join:project',
    description:
      'Join a project room to receive real-time updates for that project.\n\n' +
      '```js\nsocket.emit("join:project", "projectId")\n```',
  })
  @ApiBody({ type: JoinLeaveProjectDto })
  @HttpCode(200)
  @ApiOkResponse({ description: 'Joined project room' })
  joinProject() {
    return { info: 'WebSocket event documentation only' };
  }

  @Post('leave-project')
  @ApiOperation({
    summary: '[Client → Server] leave:project',
    description:
      'Leave a project room to stop receiving updates.\n\n' +
      '```js\nsocket.emit("leave:project", "projectId")\n```',
  })
  @ApiBody({ type: JoinLeaveProjectDto })
  @HttpCode(200)
  @ApiOkResponse({ description: 'Left project room' })
  leaveProject() {
    return { info: 'WebSocket event documentation only' };
  }

  @Post('typing-start')
  @ApiOperation({
    summary: '[Client → Server] typing:start',
    description:
      'Notify others in a project room that this user started typing.\n\n' +
      '```js\nsocket.emit("typing:start", { projectId: "..." })\n```',
  })
  @ApiBody({ type: TypingDto })
  @HttpCode(200)
  @ApiOkResponse({ description: 'Typing event broadcast to project room' })
  typingStart() {
    return { info: 'WebSocket event documentation only' };
  }

  @Post('typing-stop')
  @ApiOperation({
    summary: '[Client → Server] typing:stop',
    description:
      'Notify others that this user stopped typing.\n\n' +
      '```js\nsocket.emit("typing:stop", { projectId: "..." })\n```',
  })
  @ApiBody({ type: TypingDto })
  @HttpCode(200)
  @ApiOkResponse({ description: 'Typing stopped event broadcast' })
  typingStop() {
    return { info: 'WebSocket event documentation only' };
  }

  @Get('presence-get')
  @ApiOperation({
    summary: '[Client → Server] presence:get',
    description:
      'Request list of currently online users.\n\n' +
      '```js\nsocket.emit("presence:get")\n// Server responds with "presence:list" event\n```',
  })
  @ApiOkResponse({ type: PresenceListDto, description: 'Returns presence:list event' })
  presenceGet() {
    return { info: 'WebSocket event documentation only' };
  }

  // ==========================================
  // SERVER → CLIENT (received by client)
  // ==========================================

  @Get('user-online')
  @ApiOperation({
    summary: '[Server → Client] user:online',
    description:
      'Broadcast when a user comes online.\n\n' +
      '```js\nsocket.on("user:online", (data) => { ... })\n```',
  })
  @ApiOkResponse({ type: UserOnlineOfflineDto })
  userOnline() {
    return { info: 'WebSocket event documentation only' };
  }

  @Get('user-offline')
  @ApiOperation({
    summary: '[Server → Client] user:offline',
    description:
      'Broadcast when a user goes offline (all connections closed).\n\n' +
      '```js\nsocket.on("user:offline", (data) => { ... })\n```',
  })
  @ApiOkResponse({ type: UserOnlineOfflineDto })
  userOffline() {
    return { info: 'WebSocket event documentation only' };
  }

  @Get('user-typing')
  @ApiOperation({
    summary: '[Server → Client] user:typing',
    description:
      'Received when another user starts/stops typing in a project room.\n\n' +
      '```js\nsocket.on("user:typing", (data) => { ... })\n```',
  })
  @ApiOkResponse({ type: UserTypingDto })
  userTyping() {
    return { info: 'WebSocket event documentation only' };
  }

  @Get('presence-list')
  @ApiOperation({
    summary: '[Server → Client] presence:list',
    description:
      'Response to "presence:get" — list of online user IDs.\n\n' +
      '```js\nsocket.on("presence:list", (data) => { ... })\n```',
  })
  @ApiOkResponse({ type: PresenceListDto })
  presenceList() {
    return { info: 'WebSocket event documentation only' };
  }

  @Get('project-status-changed')
  @ApiOperation({
    summary: '[Server → Client] project:status-changed',
    description:
      'Sent when a project status changes (e.g. DRAFT → ANALYZED).\n\n' +
      '```js\nsocket.on("project:status-changed", (data) => { ... })\n```',
  })
  @ApiOkResponse({ type: ProjectStatusChangedDto })
  projectStatusChanged() {
    return { info: 'WebSocket event documentation only' };
  }

  @Get('analysis-progress')
  @ApiOperation({
    summary: '[Server → Client] project:analysis-progress',
    description:
      'Real-time AI analysis progress updates.\n\n' +
      '```js\nsocket.on("project:analysis-progress", (data) => { ... })\n```',
  })
  @ApiOkResponse({ type: AnalysisProgressDto })
  analysisProgress() {
    return { info: 'WebSocket event documentation only' };
  }

  @Get('analysis-completed')
  @ApiOperation({
    summary: '[Server → Client] project:analysis-completed',
    description:
      'Sent when AI analysis finishes.\n\n' +
      '```js\nsocket.on("project:analysis-completed", (data) => { ... })\n```',
  })
  @ApiOkResponse({ type: AnalysisCompletedDto })
  analysisCompleted() {
    return { info: 'WebSocket event documentation only' };
  }

  @Get('wireframe-progress')
  @ApiOperation({
    summary: '[Server → Client] project:wireframe-progress',
    description:
      'Real-time wireframe generation progress.\n\n' +
      '```js\nsocket.on("project:wireframe-progress", (data) => { ... })\n```',
  })
  @ApiOkResponse({ type: WireframeProgressDto })
  wireframeProgress() {
    return { info: 'WebSocket event documentation only' };
  }

  @Get('wireframe-completed')
  @ApiOperation({
    summary: '[Server → Client] project:wireframe-completed',
    description:
      'Sent when all wireframes are generated.\n\n' +
      '```js\nsocket.on("project:wireframe-completed", (data) => { ... })\n```',
  })
  @ApiOkResponse({ type: WireframeCompletedDto })
  wireframeCompleted() {
    return { info: 'WebSocket event documentation only' };
  }

  @Get('error')
  @ApiOperation({
    summary: '[Server → Client] error',
    description:
      'Error notification sent to the user.\n\n' +
      '```js\nsocket.on("error", (data) => { ... })\n```',
  })
  @ApiOkResponse({ type: EventErrorDto })
  eventError() {
    return { info: 'WebSocket event documentation only' };
  }

  @Get('notification')
  @ApiOperation({
    summary: '[Server → Client] notification',
    description:
      'Generic notification (info, success, warning, error).\n\n' +
      '```js\nsocket.on("notification", (data) => { ... })\n```',
  })
  @ApiOkResponse({ type: NotificationDto })
  notification() {
    return { info: 'WebSocket event documentation only' };
  }

  @Get('upload-completed')
  @ApiOperation({
    summary: '[Server → Client] upload:completed',
    description:
      'Sent when a file upload (avatar/thumbnail) completes.\n\n' +
      '```js\nsocket.on("upload:completed", (data) => { ... })\n```',
  })
  @ApiOkResponse({ type: UploadCompletedDto })
  uploadCompleted() {
    return { info: 'WebSocket event documentation only' };
  }
}