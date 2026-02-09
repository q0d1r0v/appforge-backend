import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { AIModule } from '@/modules/ai/ai.module';
import { ProjectAccessService } from '@/common/services/project-access.service';

@Module({
  imports: [AIModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectAccessService],
  exports: [ProjectsService, ProjectAccessService],
})
export class ProjectsModule {}
