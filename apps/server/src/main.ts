import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix("api");
  // Derrière Vercel : une seule couche de proxy, pour que req.ip soit l'IP client.
  app.set("trust proxy", 1);
  app.use(helmet());
  // CORS : le navigateur Next (:3001) se connecte en WS/HTTP avec cookies.
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3001",
    credentials: true,
  });
  // 3001 = web (Next), 3000 souvent pris par un autre projet local
  await app.listen(process.env.PORT ?? 3002);
}
await bootstrap();
