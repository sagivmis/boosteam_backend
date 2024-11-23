import * as dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";

const app = Fastify({
  logger: true,
});

app.register(async () => {
  const serverModule = await import("../public/server.js");
  app.register(serverModule.default);
});

export default async (req, res) => {
  await app.ready();
  app.server.emit("request", req, res);
};
