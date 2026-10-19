import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // CORS : le navigateur Next (:3001) se connecte en WS/HTTP avec cookies.
  app.enableCors({ origin: ["http://localhost:3001"], credentials: true });
  // 3001 = web (Next), 3000 souvent pris par un autre projet local
  await app.listen(process.env.PORT ?? 3002);
}
await bootstrap();
