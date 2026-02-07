import { registerAs } from '@nestjs/config';

function validateRequiredEnvVars() {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}

export default registerAs('app', () => {
  if (process.env.NODE_ENV === 'production') {
    validateRequiredEnvVars();
  }

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    jwt: {
      secret: process.env.JWT_SECRET || 'dev-secret-change-me',
      expiresIn: process.env.JWT_EXPIRATION || '15m',
      refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev-refresh-secret',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
    },
    swagger: {
      user: process.env.SWAGGER_USER || 'admin',
      password: process.env.SWAGGER_PASSWORD || 'changeme',
    },
  };
});