import { Module } from '@nestjs/common';
import { WireframesService } from './wireframes.service';
import { WireframesController } from './wireframes.controller';
import { AIModule } from '@/modules/ai/ai.module';

@Module({
  imports: [AIModule],
  controllers: [WireframesController],
  providers: [WireframesService],
  exports: [WireframesService],
})
export class WireframesModule {}