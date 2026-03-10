import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRoot(): object {
    return {
      message: this.appService.getHello(),
      app: 'nest-openclaw-app',
      links: {
        api: '/api',
        swagger: '/api/docs',
        health: '/openclaw/health',
      },
      hint: 'เปิด /api เพื่อดูรายการ endpoint และความสามารถทั้งหมด',
    };
  }

  /**
   * แสดงความสามารถของแอปทั้งหมด: endpoint, automation, env
   * เปิดในเบราว์เซอร์หรือเรียกจาก curl เพื่อดูภาพรวม
   */
  @Get('api')
  getApi(): ReturnType<AppService['getApiCapabilities']> {
    return this.appService.getApiCapabilities();
  }
}
