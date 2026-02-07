import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { R2_CLIENT } from './uploads.constants';

@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        limits: {
          fileSize: config.get('upload.maxFileSize'),
        },
      }),
    }),
  ],
  controllers: [UploadsController],
  providers: [
    {
      provide: R2_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new S3Client({
          region: 'auto',
          endpoint: config.get('upload.r2Endpoint'),
          credentials: {
            accessKeyId: config.get('upload.r2AccessKey')!,
            secretAccessKey: config.get('upload.r2SecretKey')!,
          },
        }),
    },
    UploadsService,
  ],
  exports: [UploadsService],
})
export class UploadsModule {}
