import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, lastValueFrom } from 'rxjs';
import { ResponseInterceptor, SKIP_RESPONSE_WRAP } from './response.interceptor';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new ResponseInterceptor(reflector);
  });

  afterEach(() => jest.clearAllMocks());

  function createMockExecutionContext(): ExecutionContext {
    return {
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
    } as any;
  }

  function createMockCallHandler(data: any): CallHandler {
    return {
      handle: () => of(data),
    };
  }

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('normal response wrapping', () => {
    it('should wrap a plain data response with success, data, and timestamp', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockExecutionContext();
      const data = { id: '1', name: 'Test' };
      const handler = createMockCallHandler(data);

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual({
        success: true,
        data: { id: '1', name: 'Test' },
        timestamp: expect.any(String),
      });
    });

    it('should wrap null data', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(null);

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual({
        success: true,
        data: null,
        timestamp: expect.any(String),
      });
    });

    it('should wrap string data', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockExecutionContext();
      const handler = createMockCallHandler('hello');

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual({
        success: true,
        data: 'hello',
        timestamp: expect.any(String),
      });
    });

    it('should include a valid ISO timestamp', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ test: true });

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      const timestamp = new Date(result.timestamp);
      expect(timestamp.toISOString()).toBe(result.timestamp);
    });
  });

  describe('paginated response wrapping', () => {
    it('should unwrap __paginated and return items, meta, success, and timestamp', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockExecutionContext();
      const paginatedData = {
        __paginated: true,
        items: [{ id: '1' }, { id: '2' }],
        meta: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
      const handler = createMockCallHandler(paginatedData);

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual({
        success: true,
        data: [{ id: '1' }, { id: '2' }],
        meta: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        timestamp: expect.any(String),
      });
    });

    it('should not include __paginated in the final response', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockExecutionContext();
      const paginatedData = {
        __paginated: true,
        items: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      };
      const handler = createMockCallHandler(paginatedData);

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).not.toHaveProperty('__paginated');
    });
  });

  describe('skip wrapping', () => {
    it('should return raw data when SKIP_RESPONSE_WRAP metadata is true', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const context = createMockExecutionContext();
      const rawData = { raw: 'data', noWrapping: true };
      const handler = createMockCallHandler(rawData);

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual({ raw: 'data', noWrapping: true });
      expect(result).not.toHaveProperty('success');
      expect(result).not.toHaveProperty('timestamp');
    });

    it('should check SKIP_RESPONSE_WRAP on both handler and class', () => {
      const mockGetAllAndOverride = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const mockHandler = jest.fn();
      const mockClass = jest.fn();
      const context = {
        getHandler: () => mockHandler,
        getClass: () => mockClass,
        switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => ({}) }),
      } as any;
      const handler = createMockCallHandler({});

      interceptor.intercept(context, handler);

      expect(mockGetAllAndOverride).toHaveBeenCalledWith(SKIP_RESPONSE_WRAP, [
        mockHandler,
        mockClass,
      ]);
    });
  });
});
