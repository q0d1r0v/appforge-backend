import { Module } from '@nestjs/common';
import { PrototypesService } from './prototypes.service';
import { PrototypesController } from './prototypes.controller';

@Module({
  controllers: [PrototypesController],
  providers: [PrototypesService],
  exports: [PrototypesService],
})
export class PrototypesModule {}