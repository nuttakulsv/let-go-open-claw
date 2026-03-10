import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OpenClawService } from './openclaw.service';

@ApiTags('openclaw')
@Controller('openclaw')
export class OpenClawController {
  constructor(private readonly openclawService: OpenClawService) {}

  @Get('doctor')
  @ApiOperation({ summary: 'รัน openclaw doctor ตรวจ config, port, ความพร้อมระบบ' })
  async doctor() {
    const output = await this.openclawService.doctor();
    return { ok: true, output };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check ใช้ผล doctor ที่ cache ไว้ (อัปเดตทุก 10 นาที)' })
  async health() {
    const cached = this.openclawService.getCachedDoctor();
    const version = await this.openclawService.version();
    if (!cached) {
      const output = await this.openclawService.refreshDoctorCache();
      return { ok: true, version, output, cached: false };
    }
    return {
      ok: true,
      version,
      output: cached.output,
      cached: true,
      ageMs: cached.ageMs,
    };
  }

  @Get('version')
  @ApiOperation({ summary: 'เวอร์ชัน OpenClaw' })
  async version() {
    const version = await this.openclawService.version();
    return { version };
  }

  @Post('agent')
  @ApiOperation({ summary: 'ส่งข้อความให้ agent ทำตาม' })
  @ApiBody({ schema: { type: 'object', properties: { message: { type: 'string' }, thinking: { type: 'string', enum: ['low', 'medium', 'high'] } }, required: ['message'] } })
  async agent(
    @Body('message') message: string,
    @Body('thinking') thinking?: 'low' | 'medium' | 'high',
  ) {
    if (!message || typeof message !== 'string') {
      return { error: 'message (string) is required' };
    }
    const output = await this.openclawService.sendToAgent(message, { thinking });
    return { ok: true, output };
  }

  @Post('channel/send')
  @ApiOperation({ summary: 'ส่งข้อความออกช่องทางที่ตั้งไว้ (เช่น Telegram)' })
  @ApiBody({ schema: { type: 'object', properties: { target: { type: 'string' }, message: { type: 'string' } }, required: ['target', 'message'] } })
  async channelSend(@Body('target') target: string, @Body('message') message: string) {
    if (!target || typeof target !== 'string' || !message || typeof message !== 'string') {
      return { error: 'target (string) and message (string) are required' };
    }
    const output = await this.openclawService.sendMessageToChannel(target, message);
    return { ok: true, output };
  }

  @Post('skill')
  @ApiOperation({ summary: 'รัน skill ผ่าน agent' })
  @ApiBody({ schema: { type: 'object', properties: { skillInstruction: { type: 'string' }, thinking: { type: 'string', enum: ['low', 'medium', 'high'] } }, required: ['skillInstruction'] } })
  async skill(
    @Body('skillInstruction') skillInstruction: string,
    @Body('thinking') thinking?: 'low' | 'medium' | 'high',
  ) {
    if (!skillInstruction || typeof skillInstruction !== 'string') {
      return { error: 'skillInstruction (string) is required, e.g. "Run the daily-report skill"' };
    }
    const output = await this.openclawService.runSkill(skillInstruction, { thinking });
    return { ok: true, output };
  }

  @Get('config')
  @ApiOperation({ summary: 'ดู config (ส่ง key = ค่าเดียว, ไม่ส่ง = list ทั้งหมด)' })
  @ApiQuery({ name: 'key', required: false })
  async config(@Query('key') key: string) {
    if (key) {
      const value = await this.openclawService.configGet(key);
      return { key, value };
    }
    const output = await this.openclawService.configList();
    return { ok: true, output };
  }

  @Get('status')
  @ApiOperation({ summary: 'สถานะ gateway' })
  async status() {
    const output = await this.openclawService.gatewayStatus();
    return { ok: true, output };
  }

  @Get('skills')
  @ApiOperation({ summary: 'รายการ skills ที่ติดตั้ง' })
  async skills() {
    const output = await this.openclawService.listSkills();
    return { ok: true, output };
  }

  @Get('channels')
  @ApiOperation({ summary: 'รายการช่องทางที่เชื่อมต่อ' })
  async channels() {
    const output = await this.openclawService.listChannels();
    return { ok: true, output };
  }

  @Get('logs')
  @ApiOperation({ summary: 'ดึง logs gateway' })
  @ApiQuery({ name: 'component', required: false })
  async logs(@Query('component') component?: string) {
    const output = await this.openclawService.logs(component);
    return { ok: true, output };
  }

  @Post('email/read')
  @ApiOperation({ summary: 'อ่านอีเมล (ไฟล์หรือเนื้อหา) แล้วให้ agent สรุป/วิเคราะห์' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'path เทียบกับโฟลเดอร์ emails เช่น inbox/1.eml' },
        content: { type: 'string', description: 'เนื้อหาอีเมลส่งตรง' },
        instruction: { type: 'string', description: 'คำสั่งให้ agent' },
        thinking: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
    },
  })
  async emailRead(
    @Body('filePath') filePath?: string,
    @Body('content') content?: string,
    @Body('instruction') instruction?: string,
    @Body('thinking') thinking?: 'low' | 'medium' | 'high',
  ) {
    if (!filePath && (content === undefined || content === '')) {
      return { error: 'ต้องส่ง filePath หรือ content อย่างน้อยหนึ่งอย่าง' };
    }
    try {
      const output = await this.openclawService.readEmailAndAskAgent({
        filePath: filePath || undefined,
        content: content ?? undefined,
        instruction,
        thinking,
      });
      return { ok: true, output };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }
}
