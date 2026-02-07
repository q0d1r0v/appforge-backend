import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: config.get('redis.host'),
            port: config.get('redis.port'),
          },
          password: config.get('redis.password'),
          ttl: config.get<number>('redis.ttl')! * 1000, // convert to ms
        }),
      }),
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
