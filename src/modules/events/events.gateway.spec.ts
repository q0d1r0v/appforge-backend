import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventsGateway } from './events.gateway';

describe('EventsGateway', () => {
  let gateway: EventsGateway;

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-jwt-secret'),
  };

  const mockEmit = jest.fn();

  const mockServer = {
    emit: mockEmit,
    to: jest.fn().mockReturnValue({ emit: mockEmit }),
  };

  function createMockSocket(overrides: Record<string, any> = {}): any {
    const emitFn = jest.fn();
    return {
      id: overrides.id ?? 'socket-1',
      handshake: overrides.handshake ?? {
        auth: { token: 'valid-token' },
        headers: {},
      },
      data: overrides.data ?? {},
      disconnect: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      emit: emitFn,
      to: jest.fn().mockReturnValue({ emit: emitFn }),
    };
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    (gateway as any).server = mockServer;
    (gateway as any).connectedUsers.clear();
  });

  afterEach(() => jest.clearAllMocks());

  describe('handleConnection', () => {
    it('should track user, join room, and emit online for valid token', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });
      const client = createMockSocket();

      await gateway.handleConnection(client);

      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'test-jwt-secret',
      });
      expect(client.data.userId).toBe('user-1');
      expect(client.join).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'user:online',
        expect.objectContaining({ userId: 'user-1' }),
      );

      const connectedUsers = (gateway as any).connectedUsers as Map<
        string,
        Set<string>
      >;
      expect(connectedUsers.has('user-1')).toBe(true);
      expect(connectedUsers.get('user-1')!.has('socket-1')).toBe(true);
    });

    it('should disconnect client when no token is provided', async () => {
      const client = createMockSocket({
        handshake: { auth: {}, headers: {} },
      });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(mockJwtService.verify).not.toHaveBeenCalled();
    });

    it('should disconnect client when token is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });
      const client = createMockSocket();

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should remove socket and emit offline when last socket disconnects', () => {
      const connectedUsers = (gateway as any).connectedUsers as Map<
        string,
        Set<string>
      >;
      connectedUsers.set('user-1', new Set(['socket-1']));

      const client = createMockSocket({ data: { userId: 'user-1' } });

      gateway.handleDisconnect(client);

      expect(connectedUsers.has('user-1')).toBe(false);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'user:offline',
        expect.objectContaining({ userId: 'user-1' }),
      );
    });

    it('should keep user online when other sockets remain', () => {
      const connectedUsers = (gateway as any).connectedUsers as Map<
        string,
        Set<string>
      >;
      connectedUsers.set('user-1', new Set(['socket-1', 'socket-2']));

      const client = createMockSocket({ data: { userId: 'user-1' } });

      gateway.handleDisconnect(client);

      expect(connectedUsers.has('user-1')).toBe(true);
      expect(connectedUsers.get('user-1')!.size).toBe(1);
      expect(connectedUsers.get('user-1')!.has('socket-2')).toBe(true);
      expect(mockServer.emit).not.toHaveBeenCalledWith(
        'user:offline',
        expect.anything(),
      );
    });
  });

  describe('handleJoinProject', () => {
    it('should join the project room', () => {
      const client = createMockSocket({ data: { userId: 'user-1' } });

      gateway.handleJoinProject(client, 'project-1');

      expect(client.join).toHaveBeenCalledWith('project:project-1');
    });
  });

  describe('handleLeaveProject', () => {
    it('should leave the project room', () => {
      const client = createMockSocket({ data: { userId: 'user-1' } });

      gateway.handleLeaveProject(client, 'project-1');

      expect(client.leave).toHaveBeenCalledWith('project:project-1');
    });
  });

  describe('handleGetPresence', () => {
    it('should emit presence list with online user ids', () => {
      const connectedUsers = (gateway as any).connectedUsers as Map<
        string,
        Set<string>
      >;
      connectedUsers.set('user-1', new Set(['socket-1']));
      connectedUsers.set('user-2', new Set(['socket-2']));

      const client = createMockSocket();

      gateway.handleGetPresence(client);

      expect(client.emit).toHaveBeenCalledWith('presence:list', {
        users: expect.arrayContaining(['user-1', 'user-2']),
      });
    });
  });

  describe('emitProjectStatusChanged', () => {
    it('should emit project:status-changed to user room', () => {
      const data = { status: 'ACTIVE', projectName: 'My Project' };

      gateway.emitProjectStatusChanged('user-1', 'project-1', data);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockEmit).toHaveBeenCalledWith(
        'project:status-changed',
        expect.objectContaining({
          projectId: 'project-1',
          status: 'ACTIVE',
          projectName: 'My Project',
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe('emitError', () => {
    it('should emit error to user room', () => {
      const data = { message: 'Something went wrong', context: 'analysis' };

      gateway.emitError('user-1', data);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockEmit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          message: 'Something went wrong',
          context: 'analysis',
          timestamp: expect.any(String),
        }),
      );
    });
  });
});
