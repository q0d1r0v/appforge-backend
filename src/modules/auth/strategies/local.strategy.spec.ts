jest.mock('passport-local', () => ({
  Strategy: class {},
}));

jest.mock('@nestjs/passport', () => ({
  PassportStrategy: (strategy: any) =>
    class {
      constructor(...args: any[]) {}
    },
}));

import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { LocalStrategy } from './local.strategy';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'AGENCY_OWNER',
  };

  const mockAuthService = {
    validateUser: jest.fn(),
  };

  beforeEach(() => {
    strategy = new LocalStrategy(
      mockAuthService as unknown as AuthService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('validate', () => {
    it('should return user when credentials are valid', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockUser);

      const result = await strategy.validate(
        'test@example.com',
        'correct-password',
      );

      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'correct-password',
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(
        strategy.validate('test@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'wrong-password',
      );
    });
  });
});
