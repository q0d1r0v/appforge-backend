import { Module } from '@nestjs/common';
import { PrototypesService } from './prototypes.service';
import { PrototypesController } from './prototypes.controller';
import { ProjectAccessService } from '@/common/services/project-access.service';

@Module({
  controllers: [PrototypesController],
  providers: [PrototypesService, ProjectAccessService],
  exports: [PrototypesService],
})
export class PrototypesModule {}
