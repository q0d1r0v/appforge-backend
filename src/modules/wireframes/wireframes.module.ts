import { Module } from '@nestjs/common';
import { WireframesService } from './wireframes.service';
import { WireframesController } from './wireframes.controller';
import { AIModule } from '@/modules/ai/ai.module';
import { ProjectAccessService } from '@/common/services/project-access.service';

@Module({
  imports: [AIModule],
  controllers: [WireframesController],
  providers: [WireframesService, ProjectAccessService],
  exports: [WireframesService],
})
export class WireframesModule {}
