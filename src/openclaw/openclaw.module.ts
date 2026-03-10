import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OpenClawController } from './openclaw.controller';
import { OpenClawService } from './openclaw.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [OpenClawController],
  providers: [OpenClawService],
  exports: [OpenClawService],
})
export class OpenClawModule {}
