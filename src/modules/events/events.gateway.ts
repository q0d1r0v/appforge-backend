import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:5173'],
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly connectedUsers = new Map<string, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // --- Connection lifecycle ---

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('app.jwt.secret'),
      });

      const userId = payload.sub;
      client.data.userId = userId;

      // Track connected sockets per user
      const isNewUser = !this.connectedUsers.has(userId);
      if (isNewUser) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);

      // Join user's personal room
      client.join(`user:${userId}`);

      // Broadcast online presence if this is user's first connection
      if (isNewUser) {
        this.server.emit('user:online', {
          userId,
          timestamp: new Date().toISOString(),
        });
      }

      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.connectedUsers.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.connectedUsers.delete(userId);
          // Broadcast offline presence
          this.server.emit('user:offline', {
            userId,
            timestamp: new Date().toISOString(),
          });
        }
      }
      this.logger.log(`Client disconnected: ${client.id} (user: ${userId})`);
    }
  }

  // --- Message handlers ---

  @SubscribeMessage('join:project')
  handleJoinProject(client: Socket, projectId: string) {
    client.join(`project:${projectId}`);
    this.logger.debug(
      `User ${client.data.userId} joined project room: ${projectId}`,
    );
  }

  @SubscribeMessage('leave:project')
  handleLeaveProject(client: Socket, projectId: string) {
    client.leave(`project:${projectId}`);
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(client: Socket, data: { projectId: string }) {
    client.to(`project:${data.projectId}`).emit('user:typing', {
      userId: client.data.userId,
      projectId: data.projectId,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(client: Socket, data: { projectId: string }) {
    client.to(`project:${data.projectId}`).emit('user:typing', {
      userId: client.data.userId,
      projectId: data.projectId,
      isTyping: false,
    });
  }

  @SubscribeMessage('presence:get')
  handleGetPresence(client: Socket) {
    const onlineUserIds = Array.from(this.connectedUsers.keys());
    client.emit('presence:list', { users: onlineUserIds });
  }

  // --- Emit methods for other services ---

  /** Notify user about project status changes */
  emitProjectStatusChanged(
    userId: string,
    projectId: string,
    data: { status: string; projectName: string },
  ) {
    this.server.to(`user:${userId}`).emit('project:status-changed', {
      projectId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /** Notify about AI analysis progress */
  emitAnalysisProgress(
    userId: string,
    projectId: string,
    data: { step: string; progress: number; message: string },
  ) {
    this.server.to(`user:${userId}`).emit('project:analysis-progress', {
      projectId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /** Notify about AI analysis completion */
  emitAnalysisCompleted(
    userId: string,
    projectId: string,
    data: { featuresCount: number; screensCount: number },
  ) {
    this.server.to(`user:${userId}`).emit('project:analysis-completed', {
      projectId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /** Notify about wireframe generation progress */
  emitWireframeProgress(
    userId: string,
    projectId: string,
    data: {
      screenName: string;
      currentScreen: number;
      totalScreens: number;
    },
  ) {
    this.server.to(`user:${userId}`).emit('project:wireframe-progress', {
      projectId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /** Notify about wireframe generation completion */
  emitWireframeCompleted(userId: string, projectId: string) {
    this.server.to(`user:${userId}`).emit('project:wireframe-completed', {
      projectId,
      timestamp: new Date().toISOString(),
    });
  }

  /** Notify about errors */
  emitError(userId: string, data: { message: string; context?: string }) {
    this.server.to(`user:${userId}`).emit('error', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /** Generic notification emitter */
  emitNotification(
    userId: string,
    data: { type: string; title: string; message: string; metadata?: any },
  ) {
    this.server.to(`user:${userId}`).emit('notification', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /** Notify about file upload completion */
  emitUploadCompleted(
    userId: string,
    data: { type: 'avatar' | 'thumbnail'; url: string },
  ) {
    this.server.to(`user:${userId}`).emit('upload:completed', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
}
