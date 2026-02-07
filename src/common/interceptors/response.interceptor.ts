import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Reflector } from '@nestjs/core';

export const SKIP_RESPONSE_WRAP = 'skipResponseWrap';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_WRAP, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        if (data && data.__paginated) {
          const { __paginated, items, meta } = data;
          return {
            success: true,
            data: items,
            meta,
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}