import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    findById: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should delegate to usersService.findById with userId', async () => {
      const userId = 'user-123';
      const expected = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        role: 'AGENCY_OWNER',
      };
      mockUsersService.findById.mockResolvedValue(expected);

      const result = await controller.getProfile(userId);

      expect(result).toEqual(expected);
      expect(mockUsersService.findById).toHaveBeenCalledWith(userId);
      expect(mockUsersService.findById).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from usersService.findById', async () => {
      const userId = 'nonexistent-user';
      mockUsersService.findById.mockRejectedValue(new Error('User not found'));

      await expect(controller.getProfile(userId)).rejects.toThrow('User not found');
      expect(mockUsersService.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe('findAll', () => {
    it('should delegate to usersService.findAll with query', async () => {
      const query: PaginationQueryDto = { page: 1, limit: 10 };
      const expected = {
        __paginated: true,
        items: [
          { id: 'user-1', email: 'user1@test.com', name: 'User One' },
          { id: 'user-2', email: 'user2@test.com', name: 'User Two' },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
      mockUsersService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(query);

      expect(result).toEqual(expected);
      expect(mockUsersService.findAll).toHaveBeenCalledWith(query);
      expect(mockUsersService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should pass search and sorting params through to usersService.findAll', async () => {
      const query: PaginationQueryDto = {
        page: 2,
        limit: 5,
        search: 'test',
        sortBy: 'name',
        sortOrder: 'asc',
      };
      const expected = {
        __paginated: true,
        items: [],
        meta: {
          page: 2,
          limit: 5,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: true,
        },
      };
      mockUsersService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(query);

      expect(result).toEqual(expected);
      expect(mockUsersService.findAll).toHaveBeenCalledWith(query);
    });
  });
});
