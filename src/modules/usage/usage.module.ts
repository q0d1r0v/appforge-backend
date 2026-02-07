import { Module } from '@nestjs/common';
import { UsageService } from './usage.service';
import { UsageController } from './usage.controller';
import { UsageScheduler } from './usage.scheduler';

@Module({
  controllers: [UsageController],
  providers: [UsageService, UsageScheduler],
  exports: [UsageService],
})
export class UsageModule {}
