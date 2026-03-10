# Nest OpenClaw App

แอป **NestJS** ที่เชื่อมกับ **OpenClaw** แล้วเปิดเป็น HTTP API สำหรับส่งงานให้ AI agent, อ่านอีเมลแล้วสรุป, ส่งข้อความออกช่องทาง (เช่น Telegram), รัน skills และดู config/status

---

## ภาพรวมสั้นๆ – แอปทำอะไรได้บ้าง

| กลุ่ม | ความสามารถ |
|------|-------------|
| **Agent** | ส่งข้อความ/คำสั่งให้ AI agent (สรุปข่าว, ตอบคำถาม ฯลฯ) |
| **อีเมล** | อ่านไฟล์อีเมล (.eml) หรือเนื้อหาอีเมล → ให้ agent สรุป/วิเคราะห์ |
| **ช่องทาง** | ส่งข้อความออกช่องทางที่ตั้งไว้ (Telegram ฯลฯ) |
| **Skills** | รัน skill ที่ติดตั้งใน OpenClaw ผ่าน agent |
| **ระบบ** | ตรวจสุขภาพ (doctor), เวอร์ชัน, config, status, skills, channels, logs |
| **อัตโนมัติ** | รัน doctor ตอนเริ่มแอป; อัปเดต health cache ทุก 10 นาที; เช็ค gateway ทุก 30 นาที |

**ดูรายละเอียดและภาพรวมทั้งหมด:** โฟลเดอร์ **[docs/](./docs/)**  
- [docs/OVERVIEW.md](./docs/OVERVIEW.md) – ภาพรวมแอปและ OpenClaw  
- [docs/API.md](./docs/API.md) – รายการ API ทุก endpoint  
- [docs/EXAMPLES.md](./docs/EXAMPLES.md) – ตัวอย่างการใช้งาน (อีเมล, agent, ช่องทาง, skill)

---

## Quick Start

### 1. ติดตั้งและรันแอป

```bash
npm install
npm run start:dev
```

แอปจะฟังที่ **http://localhost:3000** (หรือพอร์ตที่ตั้งใน `PORT`)

### 2. ดูภาพรวมว่าแอปทำอะไรได้ (ไม่ต้องตั้ง OpenClaw ก่อน)

- เปิดเบราว์เซอร์: **http://localhost:3000**  
  → ข้อความต้อนรับ + ลิงก์ไป `/api`, `/api/docs`, `/openclaw/health`

- เปิด **http://localhost:3000/api**  
  → JSON แสดงรายการ endpoints ทั้งหมด, automation, env (ใช้เป็น “สารบัญ” ความสามารถ)

- เปิด **http://localhost:3000/api/docs**  
  → **Swagger UI** ลองเรียก API ทุกตัวได้จากเบราว์เซอร์

### 3. ตั้งค่า OpenClaw (ถ้าจะใช้ agent / อีเมล / ช่องทาง)

- ใช้ **Node 22+**
- ตั้ง API key (Anthropic, OpenAI ฯลฯ) ตาม [OpenClaw docs](https://docs.openclaw.ai/) หรือรัน `npx openclaw onboard`
- ถ้าจะใช้ agent / channel: เปิด gateway (`npx openclaw gateway`) ในเทอร์มินัลอีกหน้าต่าง หรือตั้งเป็น daemon

จากนั้นลองเรียก เช่น:

```bash
# ตรวจสุขภาพ
curl http://localhost:3000/openclaw/health

# ส่งงานให้ agent
curl -X POST http://localhost:3000/openclaw/agent \
  -H "Content-Type: application/json" \
  -d '{"message": "สรุปข่าวสำคัญวันนี้ 3 ข้อ", "thinking": "medium"}'
```

---

## โครงสร้างเอกสาร

| ไฟล์ | คำอธิบาย |
|------|----------|
| [README.md](./README.md) (ไฟล์นี้) | ภาพรวมสั้นๆ + Quick Start |
| [docs/OVERVIEW.md](./docs/OVERVIEW.md) | แอปคืออะไร, OpenClaw คืออะไร, ทำอะไรได้บ้าง, โฟลเดอร์/จุดเข้าใช้งาน |
| [docs/API.md](./docs/API.md) | API reference ทุก endpoint พร้อม request/response ตัวอย่าง |
| [docs/EXAMPLES.md](./docs/EXAMPLES.md) | สถานการณ์ตัวอย่าง: ตรวจสุขภาพ, agent, อีเมล, ช่องทาง, skill, config/status |

---

## อ่านอีเมลด้วย OpenClaw (สรุป)

- **จากไฟล์:** วางไฟล์ในโฟลเดอร์ `emails` (หรือโฟลเดอร์ที่ตั้งใน `EMAIL_FILES_DIR`) แล้วส่ง `filePath` เช่น `inbox/1.eml`
- **จากเนื้อหา:** ส่ง `content` เป็นข้อความอีเมล (หรือ .eml) ตรงๆ
- ตัวเลือก: `instruction` (คำสั่งให้ agent), `thinking` (low/medium/high)

ตัวอย่าง:

```bash
curl -X POST http://localhost:3000/openclaw/email/read \
  -H "Content-Type: application/json" \
  -d '{"filePath": "inbox/1.eml"}'
```

ดูตัวอย่างเพิ่มใน [docs/EXAMPLES.md](./docs/EXAMPLES.md) และรายละเอียดใน [docs/API.md](./docs/API.md)

---

## ตัวแปรสภาพแวดล้อม

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `PORT` | พอร์ตที่แอปฟัง (default: 3000) |
| `EMAIL_FILES_DIR` | โฟลเดอร์ root สำหรับอ่านไฟล์อีเมล (default: โปรเจกต์/emails) |
| API keys สำหรับ OpenClaw | ตั้งตามที่ OpenClaw ใช้ (หรือ `openclaw config`) |

---

## สคริปต์โปรเจกต์

```bash
npm run start          # development
npm run start:dev      # watch mode
npm run start:prod     # production
npm run build          # build
npm run test            # unit tests
npm run test:e2e        # e2e tests
npm run lint            # lint
```

---

## Docker

```bash
docker build -t nest-openclaw-app .
docker run -p 3000:3000 nest-openclaw-app
```

ใช้ Node 22 ใน Docker (ตรงกับข้อกำหนด OpenClaw)

---

## Resources

- [NestJS](https://docs.nestjs.com)
- [OpenClaw](https://docs.openclaw.ai)
