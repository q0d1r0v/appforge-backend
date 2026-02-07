import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UploadsService } from './uploads.service';
import { PrismaService } from '@/prisma/prisma.service';
import { R2_CLIENT } from './uploads.constants';

describe('UploadsService', () => {
  let service: UploadsService;

  const mockR2Client = {
    send: jest.fn().mockResolvedValue({}),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        'upload.r2Bucket': 'test-bucket',
        'upload.r2GetUrl': 'https://cdn.example.com',
      };
      return config[key];
    }),
  };

  const mockFile: Express.Multer.File = {
    originalname: 'avatar.png',
    mimetype: 'image/png',
    buffer: Buffer.from('fake-image-data'),
    size: 1024,
    fieldname: 'file',
    encoding: '7bit',
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: R2_CLIENT, useValue: mockR2Client },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('uploadAvatar', () => {
    it('should upload file and update user avatar', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ avatar: null });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.uploadAvatar('user-1', mockFile);

      expect(result.url).toContain('https://cdn.example.com/avatars/user-1-');
      expect(result.url).toContain('.png');
      expect(result.size).toBe(1024);
      expect(mockR2Client.send).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { avatar: expect.stringContaining('https://cdn.example.com/avatars/') },
      });
    });

    it('should delete old avatar from R2 if exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        avatar: 'https://cdn.example.com/avatars/user-1-old.png',
      });
      mockPrismaService.user.update.mockResolvedValue({});

      await service.uploadAvatar('user-1', mockFile);

      // One call to delete old avatar, one to upload new
      expect(mockR2Client.send).toHaveBeenCalledTimes(2);
    });

    it('should not delete old avatar if URL does not start with getUrl', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        avatar: 'https://other-cdn.com/old-avatar.png',
      });
      mockPrismaService.user.update.mockResolvedValue({});

      await service.uploadAvatar('user-1', mockFile);

      // Only one call for upload (no delete)
      expect(mockR2Client.send).toHaveBeenCalledTimes(1);
    });

    it('should return url, key, and size', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ avatar: null });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.uploadAvatar('user-1', mockFile);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('size');
      expect(result.key).toContain('avatars/user-1-');
    });
  });

  describe('uploadThumbnail', () => {
    it('should upload file and return url, key, and size', async () => {
      const thumbnailFile = { ...mockFile, originalname: 'thumb.jpg', mimetype: 'image/jpeg' };

      const result = await service.uploadThumbnail('user-1', thumbnailFile);

      expect(result.url).toContain('https://cdn.example.com/thumbnails/');
      expect(result.url).toContain('.jpg');
      expect(result.size).toBe(1024);
      expect(mockR2Client.send).toHaveBeenCalledTimes(1);
      // Should not interact with user DB
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });
  });
});
