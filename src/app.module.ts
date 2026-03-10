import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OpenClawModule } from './openclaw/openclaw.module';

@Module({
  imports: [OpenClawModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
