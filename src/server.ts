import fastify from "fastify";
import mongoose from "mongoose";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import teamRoutes from "./routes/team";
import adminRoutes from "./routes/admin";
import { setupDefaultRolesAndPermissions } from "./utils/setup";

// Load environment variables
dotenv.config();

export const server = fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport: {
      target: "pino-pretty",
    },
  },
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/boossteam";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3001";

// Security headers
server.register(helmet);

// CORS configuration
server.register(cors, {
  origin: CORS_ORIGIN,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
});

// Database connection
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("MongoDB connected");

    // Initialize default roles and permissions
    await setupDefaultRolesAndPermissions();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Register routes
server.register(authRoutes, { prefix: "/api" });
server.register(teamRoutes, { prefix: "/api" });
server.register(adminRoutes, { prefix: "/api" });

// Health check endpoint
server.get("/health", async (req, res) => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// API root
server.get("/api", async (req, res) => {
  return { message: "Boosteam API v1" };
});

// Start server
if (require.main === module) {
  server.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }
    console.log(`Server listening at ${address}`);
  });
}

// For serverless environments
export default async function handler(req: any, reply: any) {
  try {
    await server.ready();
    server.server.emit("request", req, reply);
  } catch (err) {
    server.log.error(err);
    reply.status(504).send({ error: "An unexpected error occurred" });
  }
}
