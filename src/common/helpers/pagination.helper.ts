import { PaginationMeta } from '@/common/interceptors/response.interceptor';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

export interface PaginatedResult<T> {
  __paginated: true;
  items: T[];
  meta: PaginationMeta;
}

export function paginate<T>(
  items: T[],
  total: number,
  query: PaginationQueryDto,
): PaginatedResult<T> {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const totalPages = Math.ceil(total / limit);

  return {
    __paginated: true,
    items,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export function paginationArgs(query: PaginationQueryDto) {
  const page = query.page || 1;
  const limit = query.limit || 10;
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}