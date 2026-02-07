import {
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from './http-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockGetResponse: jest.Mock;
  let mockGetRequest: jest.Mock;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
    mockGetRequest = jest.fn().mockReturnValue({ url: '/api/v1/test' });

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: mockGetResponse,
        getRequest: mockGetRequest,
      }),
    } as any;

    filter = new GlobalExceptionFilter();
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('HttpException handling', () => {
    it('should handle HttpException with object response', () => {
      const exception = new NotFoundException('Project not found');

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Project not found',
        path: '/api/v1/test',
        timestamp: expect.any(String),
      });
    });

    it('should handle HttpException with string response', () => {
      const exception = new HttpException('Forbidden resource', HttpStatus.FORBIDDEN);

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Forbidden resource',
        path: '/api/v1/test',
        timestamp: expect.any(String),
      });
    });

    it('should handle ForbiddenException', () => {
      const exception = new ForbiddenException('Access denied');

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Access denied',
        path: '/api/v1/test',
        timestamp: expect.any(String),
      });
    });

    it('should handle validation errors (array message) from BadRequestException', () => {
      const exception = new BadRequestException({
        message: ['name should not be empty', 'email must be a valid email'],
        error: 'Bad Request',
        statusCode: 400,
      });

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        errors: ['name should not be empty', 'email must be a valid email'],
        path: '/api/v1/test',
        timestamp: expect.any(String),
      });
    });

    it('should not include errors key when message is not an array', () => {
      const exception = new BadRequestException('Bad input');

      filter.catch(exception, mockHost);

      const jsonCall = mockJson.mock.calls[0][0];
      expect(jsonCall).not.toHaveProperty('errors');
      expect(jsonCall.message).toBe('Bad input');
    });
  });

  describe('generic Error handling', () => {
    it('should handle generic Error with 500 status', () => {
      const exception = new Error('Something went wrong');

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Something went wrong',
        path: '/api/v1/test',
        timestamp: expect.any(String),
      });
    });

    it('should use the Error message from generic errors', () => {
      const exception = new Error('Database connection failed');

      filter.catch(exception, mockHost);

      const jsonCall = mockJson.mock.calls[0][0];
      expect(jsonCall.message).toBe('Database connection failed');
    });
  });

  describe('unknown exception handling', () => {
    it('should handle unknown exception (non-Error) with 500 and default message', () => {
      const exception = 'unexpected string error';

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        path: '/api/v1/test',
        timestamp: expect.any(String),
      });
    });

    it('should handle null exception with 500 and default message', () => {
      filter.catch(null, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        path: '/api/v1/test',
        timestamp: expect.any(String),
      });
    });

    it('should handle undefined exception with 500 and default message', () => {
      filter.catch(undefined, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        path: '/api/v1/test',
        timestamp: expect.any(String),
      });
    });
  });

  describe('response format', () => {
    it('should always include success: false', () => {
      const exception = new NotFoundException('Not found');

      filter.catch(exception, mockHost);

      const jsonCall = mockJson.mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
    });

    it('should always include the request path', () => {
      const exception = new Error('test');

      filter.catch(exception, mockHost);

      const jsonCall = mockJson.mock.calls[0][0];
      expect(jsonCall.path).toBe('/api/v1/test');
    });

    it('should include a valid ISO timestamp', () => {
      const exception = new Error('test');

      filter.catch(exception, mockHost);

      const jsonCall = mockJson.mock.calls[0][0];
      const timestamp = new Date(jsonCall.timestamp);
      expect(timestamp.toISOString()).toBe(jsonCall.timestamp);
    });
  });
});
