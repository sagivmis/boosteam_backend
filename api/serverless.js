import * as dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";

const app = Fastify({
  logger: true,
});

// Asynchronously import the server file and register the routes
app.register(async () => {
  const serverModule = await import("../public/server.js");
  app.register(serverModule.default);
});

export default async (req, res) => {
  try {
    await app.ready();

    // Log request headers to debug issues
    console.log("Request Headers:", req.headers);

    // Emit the request to Fastify server
    app.server.emit("request", req, res);
  } catch (err) {
    app.log.error(err);
    res.status(500).send({ error: "An unexpected error occurred" });
  }
};
