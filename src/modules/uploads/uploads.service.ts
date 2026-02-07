import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { extname } from 'path';
import { PrismaService } from '@/prisma/prisma.service';
import { R2_CLIENT } from './uploads.constants';

@Injectable()
export class UploadsService {
  private readonly bucket: string;
  private readonly getUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject(R2_CLIENT) private r2: S3Client,
  ) {
    this.bucket = this.configService.get<string>('upload.r2Bucket')!;
    this.getUrl = this.configService.get<string>('upload.r2GetUrl')!;
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const ext = extname(file.originalname);
    const key = `avatars/${userId}-${Date.now()}${ext}`;

    // Delete old avatar from R2 if exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });
    if (user?.avatar?.startsWith(this.getUrl)) {
      const oldKey = user.avatar.replace(`${this.getUrl}/`, '');
      await this.r2
        .send(new DeleteObjectCommand({ Bucket: this.bucket, Key: oldKey }))
        .catch(() => {});
    }

    await this.r2.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = `${this.getUrl}/${key}`;
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: url },
    });

    return { url, key, size: file.size };
  }

  async uploadThumbnail(_userId: string, file: Express.Multer.File) {
    const ext = extname(file.originalname);
    const key = `thumbnails/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    await this.r2.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = `${this.getUrl}/${key}`;
    return { url, key, size: file.size };
  }
}
