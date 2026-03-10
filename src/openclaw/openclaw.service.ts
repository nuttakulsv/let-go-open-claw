import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OPENCLAW_CMD = 'npx openclaw';
const DOCTOR_CACHE_TTL_MS = 5 * 60 * 1000; // 5 นาที

/**
 * OpenClawService – เรียกใช้ OpenClaw CLI จาก NestJS
 * ใช้ผ่าน subprocess เพราะ openclaw เป็น ESM-only
 * ต้องมี Node >= 22 และเปิด gateway (openclaw gateway) แยกถ้าต้องการ WebSocket
 */
@Injectable()
export class OpenClawService implements OnModuleInit {
  private readonly logger = new Logger(OpenClawService.name);
  private lastDoctorResult: string | null = null;
  private lastDoctorAt: number = 0;

  async onModuleInit() {
    try {
      this.logger.log('Running OpenClaw doctor on startup...');
      await this.refreshDoctorCache();
      this.logger.log('OpenClaw doctor completed. Service ready.');
    } catch (e) {
      this.logger.warn('OpenClaw doctor on init failed (gateway may be offline): ' + (e as Error).message);
    }
  }

  /**
   * อัตโนมัติ: รัน doctor ทุก 10 นาที แล้วอัปเดต cache สำหรับ /openclaw/health
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleScheduledDoctor() {
    try {
      await this.refreshDoctorCache();
      this.logger.debug('Scheduled OpenClaw doctor completed.');
    } catch (e) {
      this.logger.warn('Scheduled doctor failed: ' + (e as Error).message);
    }
  }

  /**
   * อัตโนมัติ: ตรวจสถานะ gateway ทุก 30 นาที แล้ว log (ไม่รบกวน agent)
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleScheduledStatus() {
    try {
      const out = await this.gatewayStatus();
      this.logger.debug('Gateway status: ' + out.slice(0, 200));
    } catch (e) {
      this.logger.warn('Scheduled gateway status failed: ' + (e as Error).message);
    }
  }

  /**
   * ตรวจสอบว่า OpenClaw ติดตั้งและใช้งานได้ (รันจริงทุกครั้ง)
   */
  async doctor(): Promise<string> {
    try {
      const out = execSync(`${OPENCLAW_CMD} doctor`, {
        encoding: 'utf-8',
        timeout: 15_000,
      });
      return out;
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string; message?: string };
      return (err.stdout || '') + (err.stderr || '') + (err.message || '');
    }
  }

  /**
   * คืนค่าผล doctor ที่ cache ไว้ (ใช้สำหรับ health check ที่ไม่รบกวนบ่อย)
   */
  getCachedDoctor(): { output: string; ageMs: number } | null {
    if (this.lastDoctorResult === null) return null;
    const ageMs = Date.now() - this.lastDoctorAt;
    return { output: this.lastDoctorResult, ageMs };
  }

  /**
   * บังคับรัน doctor แล้วอัปเดต cache (เรียกจาก cron ได้)
   */
  async refreshDoctorCache(): Promise<string> {
    const out = await this.doctor();
    this.lastDoctorResult = out;
    this.lastDoctorAt = Date.now();
    return out;
  }

  /**
   * ส่งข้อความไปยัง agent (ต้องมี gateway รันอยู่หรือใช้แบบ headless)
   */
  async sendToAgent(message: string, options?: { thinking?: 'low' | 'medium' | 'high' }): Promise<string> {
    try {
      const args = ['openclaw', 'agent', '--message', this.escapeArg(message)];
      if (options?.thinking) {
        args.push('--thinking', options.thinking);
      }
      const out = execSync(`npx ${args.join(' ')}`, {
        encoding: 'utf-8',
        timeout: 120_000,
        env: { ...process.env },
      });
      return out;
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string; message?: string };
      throw new Error((err.stdout || '') + (err.stderr || '') + (err.message || ''));
    }
  }

  /**
   * ส่งข้อความออกช่องทางที่ตั้งค่าไว้ (เช่น Telegram, Slack) – openclaw message send
   */
  async sendMessageToChannel(target: string, message: string): Promise<string> {
    try {
      const out = execSync(
        `${OPENCLAW_CMD} message send --target ${this.escapeArg(target)} --message ${this.escapeArg(message)}`,
        { encoding: 'utf-8', timeout: 30_000, env: { ...process.env } },
      );
      return out;
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string; message?: string };
      throw new Error((err.stdout || '') + (err.stderr || '') + (err.message || ''));
    }
  }

  /**
   * รัน skill ผ่าน agent (ส่งข้อความให้ agent ทำตาม เช่น "Run the daily-report skill")
   */
  async runSkill(skillInstruction: string, options?: { thinking?: 'low' | 'medium' | 'high' }): Promise<string> {
    return this.sendToAgent(skillInstruction, options);
  }

  /**
   * อ่าน config ค่าเดียว – openclaw config get <key>
   */
  async configGet(key: string): Promise<string> {
    try {
      const out = execSync(`${OPENCLAW_CMD} config get ${this.escapeArg(key)}`, {
        encoding: 'utf-8',
        timeout: 5_000,
      });
      return out.trim();
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string; message?: string };
      throw new Error((err.stdout || '') + (err.stderr || '') + (err.message || ''));
    }
  }

  /**
   * แสดง config ทั้งหมด – openclaw config list
   */
  async configList(): Promise<string> {
    try {
      const out = execSync(`${OPENCLAW_CMD} config list`, {
        encoding: 'utf-8',
        timeout: 5_000,
      });
      return out;
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string; message?: string };
      throw new Error((err.stdout || '') + (err.stderr || '') + (err.message || ''));
    }
  }

  /**
   * สถานะ gateway – openclaw status (หรือ gateway status)
   */
  async gatewayStatus(): Promise<string> {
    try {
      const out = execSync(`${OPENCLAW_CMD} status`, {
        encoding: 'utf-8',
        timeout: 10_000,
      });
      return out;
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string; message?: string };
      return (err.stdout || '') + (err.stderr || '') + (err.message || '');
    }
  }

  /**
   * รายการ skills ที่ติดตั้ง – openclaw skill list
   */
  async listSkills(): Promise<string> {
    try {
      const out = execSync(`${OPENCLAW_CMD} skill list`, {
        encoding: 'utf-8',
        timeout: 10_000,
      });
      return out;
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string; message?: string };
      throw new Error((err.stdout || '') + (err.stderr || '') + (err.message || ''));
    }
  }

  /**
   * รายการช่องทางที่เชื่อมต่อ – openclaw channel list
   */
  async listChannels(): Promise<string> {
    try {
      const out = execSync(`${OPENCLAW_CMD} channel list`, {
        encoding: 'utf-8',
        timeout: 10_000,
      });
      return out;
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string; message?: string };
      throw new Error((err.stdout || '') + (err.stderr || '') + (err.message || ''));
    }
  }

  /**
   * ดึง logs ของ gateway – openclaw logs (เลือก component ได้ถ้ารองรับ)
   */
  async logs(component?: string): Promise<string> {
    try {
      const args = component ? [`${OPENCLAW_CMD} logs --component ${this.escapeArg(component)}`] : [`${OPENCLAW_CMD} logs`];
      const out = execSync(args[0], {
        encoding: 'utf-8',
        timeout: 5_000,
      });
      return out;
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string; message?: string };
      return (err.stdout || '') + (err.stderr || '') + (err.message || '');
    }
  }

  /**
   * แสดงเวอร์ชัน OpenClaw
   */
  async version(): Promise<string> {
    try {
      const out = execSync(`${OPENCLAW_CMD} --version`, { encoding: 'utf-8', timeout: 5_000 });
      return out.trim();
    } catch (e: unknown) {
      const err = e as { stderr?: string; message?: string };
      return (err.stderr || err.message || 'unknown').toString().trim();
    }
  }

  /**
   * อ่านไฟล์อีเมล (.eml หรือข้อความ) แล้วส่งให้ agent วิเคราะห์/สรุป
   * - filePath: path เทียบกับโฟลเดอร์ที่อนุญาต (ค่าเริ่มต้น ./emails หรือ process.env.EMAIL_FILES_DIR)
   * - content: ส่งเนื้อหาอีเมลตรงๆ (ไม่ต้องอ่านไฟล์)
   * - instruction: คำสั่งให้ agent (ค่าเริ่มต้น "อ่านและสรุปอีเมลนี้อย่างกระชับ")
   */
  async readEmailAndAskAgent(options: {
    filePath?: string;
    content?: string;
    instruction?: string;
    thinking?: 'low' | 'medium' | 'high';
  }): Promise<string> {
    const instruction = options.instruction ?? 'อ่านและสรุปอีเมลนี้อย่างกระชับ พร้อมหัวข้อสำคัญและ action items ถ้ามี';
    let emailContent: string;
    if (options.content !== undefined && options.content !== '') {
      emailContent = options.content;
    } else if (options.filePath) {
      const baseDir = process.env.EMAIL_FILES_DIR ? resolve(process.env.EMAIL_FILES_DIR) : resolve(process.cwd(), 'emails');
      const resolved = resolve(baseDir, options.filePath);
      if (!resolved.startsWith(baseDir)) {
        throw new Error('filePath ต้องอยู่ภายใต้โฟลเดอร์ที่อนุญาต (emails หรือ EMAIL_FILES_DIR)');
      }
      emailContent = await readFile(resolved, 'utf-8');
    } else {
      throw new Error('ต้องส่ง filePath หรือ content อย่างน้อยหนึ่งอย่าง');
    }
    const message = `${instruction}\n\n--- เนื้อหาอีเมล ---\n\n${emailContent}`;
    return this.sendToAgent(message, { thinking: options.thinking });
  }

  private escapeArg(s: string): string {
    if (/^[a-zA-Z0-9_-]+$/.test(s)) return s;
    return `'${s.replace(/'/g, "'\\''")}'`;
  }
}
