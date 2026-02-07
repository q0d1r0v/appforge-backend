import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('should call authService.register with dto', async () => {
      const dto = { email: 'new@example.com', password: 'pass123', name: 'New User' };
      const expected = {
        user: { id: 'u-1', email: dto.email, name: dto.name },
        accessToken: 'jwt-token',
      };
      mockAuthService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(result).toEqual(expected);
      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should call authService.login with req.user', async () => {
      const user = { id: 'u-1', email: 'test@example.com', role: 'AGENCY_OWNER' };
      const req = { user };
      const expected = { user, accessToken: 'jwt-token' };
      mockAuthService.login.mockResolvedValue(expected);

      const result = await controller.login(req, {} as any);

      expect(result).toEqual(expected);
      expect(mockAuthService.login).toHaveBeenCalledWith(user);
    });
  });
});
