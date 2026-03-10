import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;

  const config = new DocumentBuilder()
    .setTitle('Nest OpenClaw API')
    .setDescription('API สำหรับเรียกใช้ OpenClaw จาก NestJS: agent, อีเมล, ช่องทาง, skills, config')
    .setVersion('1.0')
    .addTag('openclaw', 'ทุก endpoint ที่เชื่อมกับ OpenClaw')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  console.log(`App: http://localhost:${port}`);
  console.log(`API overview: http://localhost:${port}/api`);
  console.log(`Swagger UI: http://localhost:${port}/api/docs`);
}
bootstrap();
