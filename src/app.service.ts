import { Injectable } from '@nestjs/common';

export type EndpointInfo = {
  method: string;
  path: string;
  summary: string;
  bodyExample?: object;
  queryExample?: string;
};

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  /**
   * สร้างรายการความสามารถของ API ทั้งหมด (สำหรับ GET /api)
   */
  getApiCapabilities(): {
    name: string;
    description: string;
    docs: string;
    swagger: string;
    endpoints: EndpointInfo[];
    automation: string[];
    env: string[];
  } {
    const base = 'http://localhost:' + (process.env.PORT ?? 3000);
    return {
      name: 'nest-openclaw-app',
      description: 'แอป NestJS ที่เชื่อมกับ OpenClaw ใช้ส่งงานให้ AI agent, อ่านอีเมล, ส่งข้อความออกช่องทาง (Telegram ฯลฯ), รัน skills และดู config/status',
      docs: `${base}/api/docs (Swagger UI) หรือดูไฟล์ในโฟลเดอร์ docs/`,
      swagger: `${base}/api/docs`,
      endpoints: [
        { method: 'GET', path: '/openclaw/health', summary: 'ตรวจสุขภาพ OpenClaw (ใช้ cache, เร็ว)' },
        { method: 'GET', path: '/openclaw/doctor', summary: 'รัน openclaw doctor จริง (ตรวจ config, port, ความพร้อม)' },
        { method: 'GET', path: '/openclaw/version', summary: 'เวอร์ชัน OpenClaw' },
        {
          method: 'POST',
          path: '/openclaw/agent',
          summary: 'ส่งข้อความให้ agent ทำตาม',
          bodyExample: { message: 'สรุปข่าววันนี้ 3 ข้อ', thinking: 'medium' },
        },
        {
          method: 'POST',
          path: '/openclaw/email/read',
          summary: 'อ่านอีเมล (ไฟล์หรือเนื้อหา) แล้วให้ agent สรุป/วิเคราะห์',
          bodyExample: {
            filePath: 'inbox/1.eml',
            instruction: 'อ่านและสรุปอีเมลนี้อย่างกระชับ',
            thinking: 'low',
          },
        },
        {
          method: 'POST',
          path: '/openclaw/channel/send',
          summary: 'ส่งข้อความออกช่องทางที่ตั้งไว้ (เช่น Telegram)',
          bodyExample: { target: '+66812345678', message: 'สวัสดีจาก OpenClaw' },
        },
        {
          method: 'POST',
          path: '/openclaw/skill',
          summary: 'รัน skill ผ่าน agent',
          bodyExample: { skillInstruction: 'Run the daily-report skill', thinking: 'high' },
        },
        { method: 'GET', path: '/openclaw/config', summary: 'ดู config (ไม่ส่ง key = list ทั้งหมด)', queryExample: '?key=model' },
        { method: 'GET', path: '/openclaw/status', summary: 'สถานะ gateway' },
        { method: 'GET', path: '/openclaw/skills', summary: 'รายการ skills ที่ติดตั้ง' },
        { method: 'GET', path: '/openclaw/channels', summary: 'รายการช่องทางที่เชื่อมต่อ' },
        { method: 'GET', path: '/openclaw/logs', summary: 'ดึง logs gateway', queryExample: '?component=gateway' },
      ],
      automation: [
        'ตอนแอปเริ่ม: รัน openclaw doctor ครั้งเดียว',
        'ทุก 10 นาที: รัน doctor อีกครั้ง แล้วอัปเดต cache สำหรับ /openclaw/health',
        'ทุก 30 นาที: รัน gateway status แล้ว log',
      ],
      env: [
        'PORT (default 3000)',
        'EMAIL_FILES_DIR – โฟลเดอร์ root สำหรับอ่านไฟล์อีเมล (default: ./emails)',
        'ANTHROPIC_API_KEY หรือ OpenAI key ฯลฯ ตามที่ OpenClaw ใช้ (ตั้งผ่าน openclaw config หรือ env)',
      ],
    };
  }
}
