import { paginate, paginationArgs } from './pagination.helper';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

describe('Pagination Helpers', () => {
  describe('paginate', () => {
    it('should return correct meta for a standard page', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const query: PaginationQueryDto = { page: 1, limit: 10 };

      const result = paginate(items, 2, query);

      expect(result).toEqual({
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
      });
    });

    it('should set hasNext to true when there are more pages', () => {
      const items = [{ id: '1' }];
      const query: PaginationQueryDto = { page: 1, limit: 1 };

      const result = paginate(items, 3, query);

      expect(result.meta.hasNext).toBe(true);
      expect(result.meta.hasPrev).toBe(false);
      expect(result.meta.totalPages).toBe(3);
    });

    it('should set hasPrev to true when on a page beyond the first', () => {
      const items = [{ id: '2' }];
      const query: PaginationQueryDto = { page: 2, limit: 1 };

      const result = paginate(items, 3, query);

      expect(result.meta.hasPrev).toBe(true);
      expect(result.meta.hasNext).toBe(true);
    });

    it('should set both hasNext false and hasPrev true on the last page', () => {
      const items = [{ id: '3' }];
      const query: PaginationQueryDto = { page: 3, limit: 1 };

      const result = paginate(items, 3, query);

      expect(result.meta.hasNext).toBe(false);
      expect(result.meta.hasPrev).toBe(true);
    });

    it('should calculate totalPages correctly with Math.ceil', () => {
      const items = [];
      const query: PaginationQueryDto = { page: 1, limit: 3 };

      const result = paginate(items, 7, query);

      expect(result.meta.totalPages).toBe(3); // Math.ceil(7/3) = 3
    });

    it('should default page to 1 when not provided', () => {
      const items = [{ id: '1' }];
      const query = {} as PaginationQueryDto;

      const result = paginate(items, 1, query);

      expect(result.meta.page).toBe(1);
      expect(result.meta.hasPrev).toBe(false);
    });

    it('should default limit to 10 when not provided', () => {
      const items = [{ id: '1' }];
      const query = {} as PaginationQueryDto;

      const result = paginate(items, 1, query);

      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should handle empty items with zero total', () => {
      const items: any[] = [];
      const query: PaginationQueryDto = { page: 1, limit: 10 };

      const result = paginate(items, 0, query);

      expect(result).toEqual({
        __paginated: true,
        items: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it('should always set __paginated to true', () => {
      const result = paginate([], 0, { page: 1, limit: 10 });

      expect(result.__paginated).toBe(true);
    });

    it('should preserve the original items array reference', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const query: PaginationQueryDto = { page: 1, limit: 10 };

      const result = paginate(items, 2, query);

      expect(result.items).toBe(items);
    });

    it('should handle a single page with exact fit', () => {
      const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const query: PaginationQueryDto = { page: 1, limit: 3 };

      const result = paginate(items, 3, query);

      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.hasNext).toBe(false);
      expect(result.meta.hasPrev).toBe(false);
    });

    it('should handle large total with small limit', () => {
      const items = [{ id: '50' }];
      const query: PaginationQueryDto = { page: 50, limit: 1 };

      const result = paginate(items, 100, query);

      expect(result.meta.totalPages).toBe(100);
      expect(result.meta.hasNext).toBe(true);
      expect(result.meta.hasPrev).toBe(true);
    });
  });

  describe('paginationArgs', () => {
    it('should calculate correct skip and take for page 1', () => {
      const query: PaginationQueryDto = { page: 1, limit: 10 };

      const result = paginationArgs(query);

      expect(result).toEqual({ skip: 0, take: 10 });
    });

    it('should calculate correct skip and take for page 2', () => {
      const query: PaginationQueryDto = { page: 2, limit: 10 };

      const result = paginationArgs(query);

      expect(result).toEqual({ skip: 10, take: 10 });
    });

    it('should calculate correct skip and take for page 3 with limit 5', () => {
      const query: PaginationQueryDto = { page: 3, limit: 5 };

      const result = paginationArgs(query);

      expect(result).toEqual({ skip: 10, take: 5 });
    });

    it('should default page to 1 when not provided', () => {
      const query = { limit: 10 } as PaginationQueryDto;

      const result = paginationArgs(query);

      expect(result).toEqual({ skip: 0, take: 10 });
    });

    it('should default limit to 10 when not provided', () => {
      const query = { page: 1 } as PaginationQueryDto;

      const result = paginationArgs(query);

      expect(result).toEqual({ skip: 0, take: 10 });
    });

    it('should default both page and limit when empty query', () => {
      const query = {} as PaginationQueryDto;

      const result = paginationArgs(query);

      expect(result).toEqual({ skip: 0, take: 10 });
    });

    it('should calculate skip correctly for high page numbers', () => {
      const query: PaginationQueryDto = { page: 100, limit: 25 };

      const result = paginationArgs(query);

      expect(result).toEqual({ skip: 2475, take: 25 });
    });

    it('should handle limit of 1', () => {
      const query: PaginationQueryDto = { page: 5, limit: 1 };

      const result = paginationArgs(query);

      expect(result).toEqual({ skip: 4, take: 1 });
    });
  });
});
