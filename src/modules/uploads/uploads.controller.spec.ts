import { Test, TestingModule } from '@nestjs/testing';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

describe('UploadsController', () => {
  let controller: UploadsController;

  const mockUploadsService = {
    uploadAvatar: jest.fn(),
    uploadThumbnail: jest.fn(),
  };

  const mockFile = {
    originalname: 'test.png',
    mimetype: 'image/png',
    buffer: Buffer.from('data'),
    size: 512,
  } as Express.Multer.File;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [{ provide: UploadsService, useValue: mockUploadsService }],
    }).compile();

    controller = module.get<UploadsController>(UploadsController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('uploadAvatar', () => {
    it('should call uploadsService.uploadAvatar with userId and file', async () => {
      const expected = { url: 'https://cdn.example.com/avatars/u1.png', key: 'avatars/u1.png', size: 512 };
      mockUploadsService.uploadAvatar.mockResolvedValue(expected);

      const result = await controller.uploadAvatar('user-1', mockFile);

      expect(result).toEqual(expected);
      expect(mockUploadsService.uploadAvatar).toHaveBeenCalledWith('user-1', mockFile);
    });
  });

  describe('uploadThumbnail', () => {
    it('should call uploadsService.uploadThumbnail with userId and file', async () => {
      const expected = { url: 'https://cdn.example.com/thumbnails/t1.png', key: 'thumbnails/t1.png', size: 512 };
      mockUploadsService.uploadThumbnail.mockResolvedValue(expected);

      const result = await controller.uploadThumbnail('user-1', mockFile);

      expect(result).toEqual(expected);
      expect(mockUploadsService.uploadThumbnail).toHaveBeenCalledWith('user-1', mockFile);
    });
  });
});
