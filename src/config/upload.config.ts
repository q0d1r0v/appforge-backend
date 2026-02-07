import { registerAs } from '@nestjs/config';

export default registerAs('upload', () => ({
  r2Bucket: process.env.R2_BUCKET,
  r2AccessKey: process.env.R2_ACCESS_KEY,
  r2SecretKey: process.env.R2_SECRET_KEY,
  r2Endpoint: process.env.R2_ENDPOINT,
  r2GetUrl: process.env.R2_GET_URL,
  maxFileSize: parseInt(process.env.UPLOAD_MAX_SIZE || '5242880', 10),
  avatarMaxSize: parseInt(process.env.AVATAR_MAX_SIZE || '2097152', 10),
}));
