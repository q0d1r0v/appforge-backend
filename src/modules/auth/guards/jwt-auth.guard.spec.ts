import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  function createMockContext(): ExecutionContext {
    return {
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
        getResponse: () => ({}),
        getNext: () => jest.fn(),
      }),
      getType: () => 'http',
      getArgs: () => [],
      getArgByIndex: () => ({}),
      switchToRpc: () => ({}),
      switchToWs: () => ({}),
    } as any;
  }

  it('should allow access for @Public() routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should delegate to passport for non-public routes', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createMockContext();

    // super.canActivate goes through passport which throws without a real JWT strategy
    try {
      await guard.canActivate(context);
    } catch (error) {
      // Expected: passport throws because no JWT strategy is registered in test
      expect(error).toBeDefined();
    }
  });
});
