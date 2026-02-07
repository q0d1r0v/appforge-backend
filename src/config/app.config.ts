import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRATION || '7d',
  },
  swagger: {
    user: process.env.SWAGGER_USER || 'admin',
    password: process.env.SWAGGER_PASSWORD || 'changeme',
  },
}));