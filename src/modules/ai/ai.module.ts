import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { UsageModule } from '@/modules/usage/usage.module';
import { ProjectAccessService } from '@/common/services/project-access.service';

@Module({
  imports: [UsageModule],
  controllers: [AIController],
  providers: [AIService, ProjectAccessService],
  exports: [AIService],
})
export class AIModule {}
